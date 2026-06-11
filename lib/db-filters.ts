/**
 * db-filters.ts
 *
 * Gestión dinámica de los filtros de software.
 * Los filtros se almacenan en la tabla creminox_software_filters y se cachean
 * en memoria. Al arrancar, si la tabla está vacía se siembra con los valores
 * por defecto del archivo software-filters.config.ts.
 */

import type { ResultSetHeader } from "mysql2"
import { getDbPool } from "./db"
import { SOFTWARE_FILTERS } from "./software-filters.config"
import { SoftwareFiltersConfig } from "./types"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface FilterRecord {
  id: number
  type: "exclude" | "include" | "normalize" | "force_exclude"
  pattern: string
  flags: string
  replacement: string | null
  order_index: number
}

// ─── Caché en memoria ────────────────────────────────────────────────────────

/** Filtros activos. Antes de cargar la BD usa los valores hardcodeados. */
let activeFilters: SoftwareFiltersConfig = SOFTWARE_FILTERS
let cacheLoaded = false

/** Devuelve los filtros activos de forma síncrona (usa caché). */
export function getActiveFilters(): SoftwareFiltersConfig {
  return activeFilters
}

/** Invalida la caché para que la próxima llamada a ensureFiltersLoaded recargue. */
export function invalidateFiltersCache(): void {
  cacheLoaded = false
}

// ─── Construcción de SoftwareFiltersConfig desde registros ───────────────────

function recordsToConfig(records: FilterRecord[]): SoftwareFiltersConfig {
  const sorted = [...records].sort((a, b) => a.order_index - b.order_index)

  const exclude = sorted
    .filter((r) => r.type === "exclude")
    .map((r) => new RegExp(r.pattern, r.flags))

  const include = sorted
    .filter((r) => r.type === "include")
    .map((r) => new RegExp(r.pattern, r.flags))

  const force_exclude = sorted
    .filter((r) => r.type === "force_exclude")
    .map((r) => new RegExp(r.pattern, r.flags))

  const normalize = sorted
    .filter((r) => r.type === "normalize")
    .map((r) => ({
      pattern: new RegExp(r.pattern, r.flags),
      replacement: r.replacement ?? "",
    }))

  return {
    exclude,
    include: include.length > 0 ? include : undefined,
    force_exclude: force_exclude.length > 0 ? force_exclude : undefined,
    normalize,
  }
}

// ─── Carga y recarga ──────────────────────────────────────────────────────────

/** Carga desde la BD si la caché está vacía. */
export async function ensureFiltersLoaded(): Promise<void> {
  if (cacheLoaded) return
  await reloadFiltersFromDb()
}

/** Fuerza recarga desde la BD y actualiza la caché. */
export async function reloadFiltersFromDb(): Promise<void> {
  try {
    const pool = await getDbPool()
    const [rows] = (await pool.execute(
      "SELECT id, type, pattern, flags, replacement, order_index FROM creminox_software_filters ORDER BY type, order_index"
    )) as [FilterRecord[], unknown]

    activeFilters = recordsToConfig(rows)
    cacheLoaded = true
  } catch (error) {
    console.error("[db-filters] Error cargando filtros desde BD:", error)
    activeFilters = { exclude: [], include: undefined, normalize: [] }
    cacheLoaded = true
  }
}

// ─── Seed desde defaults ──────────────────────────────────────────────────────

export async function seedDefaultFilters(): Promise<void> {
  const pool = await getDbPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute("DELETE FROM creminox_software_filters")

    let idx = 0
    for (const regex of SOFTWARE_FILTERS.exclude) {
      await conn.execute(
        "INSERT INTO creminox_software_filters (type, pattern, flags, replacement, order_index) VALUES (?, ?, ?, NULL, ?)",
        ["exclude", regex.source, regex.flags || "i", idx++]
      )
    }

    if (SOFTWARE_FILTERS.include) {
      idx = 0
      for (const regex of SOFTWARE_FILTERS.include) {
        await conn.execute(
          "INSERT INTO creminox_software_filters (type, pattern, flags, replacement, order_index) VALUES (?, ?, ?, NULL, ?)",
          ["include", regex.source, regex.flags || "i", idx++]
        )
      }
    }

    idx = 0
    for (const rule of SOFTWARE_FILTERS.normalize) {
      await conn.execute(
        "INSERT INTO creminox_software_filters (type, pattern, flags, replacement, order_index) VALUES (?, ?, ?, ?, ?)",
        [
          "normalize",
          rule.pattern.source,
          rule.pattern.flags || "i",
          rule.replacement,
          idx++,
        ]
      )
    }

    await conn.commit()

    const [rows] = (await conn.execute(
      "SELECT id, type, pattern, flags, replacement, order_index FROM creminox_software_filters ORDER BY type, order_index"
    )) as [FilterRecord[], unknown]

    activeFilters = recordsToConfig(rows)
    cacheLoaded = true
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ─── Limpieza total ──────────────────────────────────────────────────────────

export async function clearAllFilters(): Promise<void> {
  const pool = await getDbPool()
  await pool.execute("DELETE FROM creminox_software_filters")
  activeFilters = {
    exclude: [],
    include: undefined,
    force_exclude: undefined,
    normalize: [],
  }
  cacheLoaded = true
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

export async function getAllFilterRecords(): Promise<FilterRecord[]> {
  const pool = await getDbPool()
  const [rows] = (await pool.execute(
    "SELECT id, type, pattern, flags, replacement, order_index FROM creminox_software_filters ORDER BY type, order_index"
  )) as [FilterRecord[], unknown]
  return rows
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createFilter(
  type: "exclude" | "include" | "normalize" | "force_exclude",
  pattern: string,
  flags: string,
  replacement: string | null
): Promise<number> {
  const pool = await getDbPool()
  const [maxRows] = (await pool.execute(
    "SELECT COALESCE(MAX(order_index), -1) AS max_idx FROM creminox_software_filters WHERE type = ?",
    [type]
  )) as [Array<{ max_idx: number }>, unknown]
  const nextIdx = (maxRows[0]?.max_idx ?? -1) + 1

  const [result] = (await pool.execute(
    "INSERT INTO creminox_software_filters (type, pattern, flags, replacement, order_index) VALUES (?, ?, ?, ?, ?)",
    [type, pattern, flags, replacement, nextIdx]
  )) as [ResultSetHeader, unknown]

  cacheLoaded = false
  return result.insertId
}

export async function updateFilter(
  id: number,
  pattern: string,
  flags: string,
  replacement: string | null
): Promise<void> {
  const pool = await getDbPool()
  await pool.execute(
    "UPDATE creminox_software_filters SET pattern = ?, flags = ?, replacement = ? WHERE id = ?",
    [pattern, flags, replacement, id]
  )
  cacheLoaded = false
}

export async function deleteFilter(id: number): Promise<void> {
  const pool = await getDbPool()
  await pool.execute("DELETE FROM creminox_software_filters WHERE id = ?", [id])
  cacheLoaded = false
}
