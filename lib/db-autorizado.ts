/**
 * db-autorizado.ts
 *
 * Reemplaza la lógica de aprobación basada en Excel por consultas a la tabla
 * creminox_software_autorizado en la misma BD de GLPI.
 *
 * Mantiene el mismo sistema de caché en memoria que excel-utils.ts para no
 * hacer una consulta a la BD por cada registro de software.
 */

import { getDbPool } from "./db"
import { normalizeSoftwareName } from "./excel-utils"
import { ApprovedSoftwareHierarchy } from "./types"

// ─── Caché en memoria ────────────────────────────────────────────────────────

let dbCache: ApprovedSoftwareHierarchy = {
  general: [],
  areas: new Map(),
  puestos: new Map(),
  computadoras: new Map(),
}

let cacheLoaded = false

/** Carga desde la BD si el caché está vacío. */
export async function ensureDbCacheLoaded(): Promise<void> {
  if (cacheLoaded) return
  await reloadDbCache()
}

/** Fuerza una recarga desde la BD y devuelve la cantidad de registros. */
export async function reloadDbCache(): Promise<{ count: number }> {
  const pool = await getDbPool()
  const [rows] = (await pool.execute(
    "SELECT software, area, puesto, computadora FROM creminox_software_autorizado"
  )) as [
    Array<{
      software: string
      area: string | null
      puesto: string | null
      computadora: string | null
    }>,
    unknown,
  ]

  const newCache: ApprovedSoftwareHierarchy = {
    general: [],
    areas: new Map(),
    puestos: new Map(),
    computadoras: new Map(),
  }

  for (const row of rows) {
    const raw = row.software // guardamos el nombre crudo, sin normalizar

    if (row.computadora) {
      const key = row.computadora.toLowerCase().trim()
      if (!newCache.computadoras.has(key)) newCache.computadoras.set(key, [])
      newCache.computadoras.get(key)!.push(raw)
    } else if (!row.area) {
      newCache.general.push(raw)
    } else if (!row.puesto) {
      if (!newCache.areas.has(row.area)) newCache.areas.set(row.area, [])
      newCache.areas.get(row.area)!.push(raw)
    } else {
      const key = `${row.area}|||${row.puesto}`
      if (!newCache.puestos.has(key))
        newCache.puestos.set(key, { area: row.area, software: [] })
      newCache.puestos.get(key)!.software.push(raw)
    }
  }

  dbCache = newCache
  cacheLoaded = true
  return { count: rows.length }
}

/** Invalida el caché (llamar después de import / migrate). */
export function invalidateDbCache(): void {
  cacheLoaded = false
}

// ─── Lógica de matching (idéntica a excel-utils.ts) ─────────────────────────

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Dado un completename de GLPI (ej. "Planta > Mantenimiento > Turno A"),
 * devuelve todos los caminos ancestros de más específico a más general:
 * ["Planta > Mantenimiento > Turno A", "Planta > Mantenimiento", "Planta"]
 */
function getAncestorPaths(completename: string): string[] {
  const parts = completename
    .split(" > ")
    .map((s) => s.trim())
    .filter(Boolean)
  const paths: string[] = []
  for (let i = parts.length; i > 0; i--) {
    paths.push(parts.slice(0, i).join(" > "))
  }
  return paths // más específico primero
}

function parseLocation(ubicacion: string): { area: string; puesto: string } {
  if (!ubicacion) return { area: "", puesto: "" }

  const ubicacionNorm = normalizeForComparison(ubicacion).replace(/\s+/g, "_")

  let bestMatch: { area: string; puesto: string } | null = null
  let bestLen = 0

  for (const [puestoKey] of dbCache.puestos.entries()) {
    const [area, puesto] = puestoKey.split("|||")
    const puestoNorm = normalizeForComparison(puesto).replace(/\s+/g, "_")
    if (ubicacionNorm.includes(puestoNorm) && puestoNorm.length > bestLen) {
      bestMatch = { area, puesto }
      bestLen = puestoNorm.length
    }
  }
  if (bestMatch) return bestMatch

  bestLen = 0
  let bestArea = ""
  for (const [area] of dbCache.areas.entries()) {
    const areaNorm = normalizeForComparison(area).replace(/\s+/g, "_")
    if (ubicacionNorm.includes(areaNorm) && areaNorm.length > bestLen) {
      bestArea = area
      bestLen = areaNorm.length
    }
  }
  if (bestArea) return { area: bestArea, puesto: "" }

  return { area: "", puesto: "" }
}

function matchesSoftware(approved: string, input: string): boolean {
  // El nombre aprobado se guarda ya en su forma canónica (normalizada).
  // El input ya viene normalizado desde isSoftwareApprovedForLocationDb.
  // Comparamos directamente sin re-normalizar ninguno de los dos.
  const a = approved.toLowerCase().trim()
  const b = input.toLowerCase().trim()

  if (a === b) return true
  if (b.includes(a) || a.includes(b)) return true

  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)

  if (
    aWords.length >= 2 &&
    aWords.every((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw)))
  )
    return true

  if (
    bWords.length >= 2 &&
    bWords.every((w) => aWords.some((aw) => aw.includes(w) || w.includes(aw)))
  )
    return true

  return false
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Determina si un software está autorizado para una ubicación/equipo dados,
 * aplicando la jerarquía: PC → General → Área/Puesto (descendiendo por los
 * ancestros del completename de GLPI para herencia padre→hijo).
 *
 * @param softwareName  Nombre del software (se normaliza internamente)
 * @param ubicacion     Valor de glpi_locations.completename del equipo
 * @param equipoNombre  Nombre del equipo (c.name en GLPI)
 */
export function isSoftwareApprovedForLocationDb(
  softwareName: string,
  ubicacion: string,
  equipoNombre?: string
): boolean {
  const normalized = normalizeSoftwareName(softwareName)
  const check = (sw: string) => matchesSoftware(sw, normalized)

  // 1. Aprobado específicamente para esta PC
  if (equipoNombre) {
    const pcKey = equipoNombre.toLowerCase().trim()
    if (dbCache.computadoras.get(pcKey)?.some(check)) return true
  }

  // 2. Aprobado a nivel general
  if (dbCache.general.some(check)) return true

  if (!ubicacion) return false

  // 3. Recorre todos los ancestros del completename de GLPI (más específico primero)
  //    "Planta > Mantenimiento > Sub" → ["Planta > Mantenimiento > Sub", "Planta > Mantenimiento", "Planta"]
  //    Así la aprobación en un padre se hereda por todos sus hijos.
  const ancestors = getAncestorPaths(ubicacion)

  for (const path of ancestors) {
    const pathNorm = normalizeForComparison(path)

    // 3a. Buscar coincidencia exacta con puestos almacenados (área|||puesto)
    for (const [puestoKey, puestoData] of dbCache.puestos.entries()) {
      const [area, puesto] = puestoKey.split("|||")
      // El path puede ser "Área > Puesto" o solo el segmento final "Puesto"
      const combinedNorm = normalizeForComparison(`${area} > ${puesto}`)
      const puestoOnlyNorm = normalizeForComparison(puesto)
      if (pathNorm === combinedNorm || pathNorm === puestoOnlyNorm) {
        if (puestoData.software.some(check)) return true
        // Heredar también los del área padre del puesto
        if (dbCache.areas.get(area)?.some(check)) return true
      }
    }

    // 3b. Buscar coincidencia exacta con áreas almacenadas
    for (const [area, softwareList] of dbCache.areas.entries()) {
      if (pathNorm === normalizeForComparison(area)) {
        if (softwareList.some(check)) return true
      }
    }
  }

  // 4. Fallback: matching por substring (compatibilidad con datos existentes
  //    que no usan el separador " > " de GLPI)
  const { area, puesto } = parseLocation(ubicacion)
  if (area) {
    if (dbCache.areas.get(area)?.some(check)) return true
    if (puesto) {
      const puestoKey = `${area}|||${puesto}`
      const puestoData = dbCache.puestos.get(puestoKey)
      if (puestoData) {
        if (puestoData.software.some(check)) return true
        if (dbCache.areas.get(puestoData.area)?.some(check)) return true
      }
    }
  }

  return false
}
