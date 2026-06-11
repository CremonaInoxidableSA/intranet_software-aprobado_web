import { read, utils } from "xlsx"
import fs from "fs"
import path from "path"
import { getActiveFilters } from "./db-filters"
import { ApprovedSoftwareHierarchy } from "./types"

const EXCEL_PATH = path.join(process.cwd(), "data", "RP_Software_Aprobado.xlsx")

let approvedSoftwareCache: string[] = []
let approvedSoftwareHierarchy: ApprovedSoftwareHierarchy = {
  general: [],
  areas: new Map(),
  puestos: new Map(),
  computadoras: new Map(),
}
let lastExcelRead: Date | null = null

export function normalizeSoftwareName(name: string): string {
  if (!name) return name

  let normalized = name

  for (const rule of getActiveFilters().normalize) {
    normalized = normalized.replace(rule.pattern, rule.replacement)
  }

  return normalized.trim()
}

export function shouldExcludeSoftware(name: string): boolean {
  if (!name) return true

  const filters = getActiveFilters()

  // force_exclude siempre gana, aunque haya una regla de inclusión
  if (filters.force_exclude) {
    for (const pattern of filters.force_exclude) {
      if (pattern.test(name)) return true
    }
  }

  let isExcluded = false
  for (const pattern of filters.exclude) {
    if (pattern.test(name)) {
      isExcluded = true
      break
    }
  }

  if (!isExcluded) return false

  if (filters.include) {
    const normalized = normalizeSoftwareName(name)
    for (const pattern of filters.include) {
      if (pattern.test(name) || pattern.test(normalized)) {
        return false
      }
    }
  }

  return true
}

export async function readApprovedSoftware(): Promise<string[]> {
  if (!fs.existsSync(EXCEL_PATH)) {
    approvedSoftwareCache = []
    approvedSoftwareHierarchy = {
      general: [],
      areas: new Map(),
      puestos: new Map(),
      computadoras: new Map(),
    }
    lastExcelRead = null
    return []
  }

  let workbook
  if (EXCEL_PATH.startsWith("http")) {
    const response = await fetch(EXCEL_PATH)
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    workbook = read(buffer)
  } else {
    const fileBuffer = fs.readFileSync(EXCEL_PATH)
    workbook = read(fileBuffer, { type: "buffer" })
  }
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const data = utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

  const areaColumnIndex = 0
  const puestoColumnIndex = 1
  const softwareColumnIndex = 2

  approvedSoftwareHierarchy = {
    general: [],
    areas: new Map(),
    puestos: new Map(),
    computadoras: new Map(),
  }

  const allSoftware = new Set<string>()

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const area = row[areaColumnIndex]
    const puesto = row[puestoColumnIndex]
    const software = row[softwareColumnIndex]

    if (!software || typeof software !== "string" || !software.trim()) {
      continue
    }

    const softwareTrimmed = software.trim()

    if (
      softwareTrimmed.toLowerCase() === "software" ||
      softwareTrimmed.toLowerCase().includes("inventario")
    ) {
      continue
    }

    const normalizedSoftware = normalizeSoftwareName(softwareTrimmed)
    allSoftware.add(normalizedSoftware)

    const areaStr = area && typeof area === "string" ? area.trim() : ""
    const puestoStr = puesto && typeof puesto === "string" ? puesto.trim() : ""

    if (
      areaStr.toLowerCase().includes("area") &&
      areaStr.toLowerCase().includes("rol")
    ) {
      continue
    }

    const areaNormalized = normalizeForComparison(areaStr).replace(/\s+/g, "_")
    const puestoNormalized = normalizeForComparison(puestoStr).replace(
      /\s+/g,
      "_"
    )

    if (!areaStr || areaNormalized === "general") {
      approvedSoftwareHierarchy.general.push(normalizedSoftware)
    } else if (!puestoStr) {
      if (!approvedSoftwareHierarchy.areas.has(areaNormalized)) {
        approvedSoftwareHierarchy.areas.set(areaNormalized, [])
      }
      approvedSoftwareHierarchy.areas
        .get(areaNormalized)!
        .push(normalizedSoftware)
    } else {
      const puestoKey = `${areaNormalized}|||${puestoNormalized}`
      if (!approvedSoftwareHierarchy.puestos.has(puestoKey)) {
        approvedSoftwareHierarchy.puestos.set(puestoKey, {
          area: areaNormalized,
          software: [],
        })
      }
      approvedSoftwareHierarchy.puestos
        .get(puestoKey)!
        .software.push(normalizedSoftware)
    }
  }

  approvedSoftwareHierarchy.general = [
    ...new Set(approvedSoftwareHierarchy.general),
  ]
  approvedSoftwareHierarchy.areas.forEach((software, area) => {
    approvedSoftwareHierarchy.areas.set(area, [...new Set(software)])
  })
  approvedSoftwareHierarchy.puestos.forEach((data) => {
    data.software = [...new Set(data.software)]
  })

  approvedSoftwareCache = [...allSoftware]
  lastExcelRead = new Date()
  return approvedSoftwareCache
}

export function isSoftwareApproved(softwareName: string): boolean {
  const normalized = normalizeSoftwareName(softwareName)
  return approvedSoftwareCache.some(
    (approved) =>
      normalized.toLowerCase() === approved.toLowerCase() ||
      normalized.toLowerCase().includes(approved.toLowerCase()) ||
      approved.toLowerCase().includes(normalized.toLowerCase())
  )
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseLocation(ubicacion: string): { area: string; puesto: string } {
  if (!ubicacion) {
    return { area: "", puesto: "" }
  }

  const ubicacionNormalized = normalizeForComparison(ubicacion).replace(
    /\s+/g,
    "_"
  )

  let bestMatch: { area: string; puesto: string } | null = null
  let bestMatchLength = 0

  for (const [puestoKey] of approvedSoftwareHierarchy.puestos.entries()) {
    const [area, puesto] = puestoKey.split("|||")

    if (
      ubicacionNormalized.includes(puesto) &&
      puesto.length > bestMatchLength
    ) {
      bestMatch = { area, puesto }
      bestMatchLength = puesto.length
    }
  }

  if (bestMatch) {
    return bestMatch
  }

  bestMatchLength = 0
  let bestArea = ""

  for (const [area] of approvedSoftwareHierarchy.areas.entries()) {
    if (ubicacionNormalized.includes(area) && area.length > bestMatchLength) {
      bestArea = area
      bestMatchLength = area.length
    }
  }

  if (bestArea) {
    return { area: bestArea, puesto: "" }
  }

  return { area: "", puesto: "" }
}
export function isSoftwareApprovedForLocation(
  softwareName: string,
  ubicacion: string
): boolean {
  const normalized = normalizeSoftwareName(softwareName)

  const matchesSoftware = (approvedSoftware: string): boolean => {
    const normalizedApproved = approvedSoftware.toLowerCase().trim()
    const normalizedInput = normalized.toLowerCase().trim()

    if (normalizedApproved === normalizedInput) return true

    if (
      normalizedInput.includes(normalizedApproved) ||
      normalizedApproved.includes(normalizedInput)
    ) {
      return true
    }

    const approvedWords = normalizedApproved.split(/\s+/)
    const inputWords = normalizedInput.split(/\s+/)

    const allApprovedWordsInInput = approvedWords.every((word) =>
      inputWords.some(
        (inputWord) => inputWord.includes(word) || word.includes(inputWord)
      )
    )

    if (allApprovedWordsInInput && approvedWords.length >= 2) return true

    const allInputWordsInApproved = inputWords.every((word) =>
      approvedWords.some(
        (approvedWord) =>
          approvedWord.includes(word) || word.includes(approvedWord)
      )
    )

    if (allInputWordsInApproved && inputWords.length >= 2) return true

    return false
  }

  if (approvedSoftwareHierarchy.general.some(matchesSoftware)) {
    return true
  }

  const { area, puesto } = parseLocation(ubicacion)

  if (!area) {
    return false
  }

  const areaSoftware = approvedSoftwareHierarchy.areas.get(area)
  if (areaSoftware && areaSoftware.some(matchesSoftware)) {
    return true
  }

  if (!puesto) {
    return false
  }

  const puestoKey = `${area}|||${puesto}`
  const puestoData = approvedSoftwareHierarchy.puestos.get(puestoKey)
  if (puestoData) {
    if (puestoData.software.some(matchesSoftware)) {
      return true
    }

    const areaPadre = puestoData.area
    const areaPadreSoftware = approvedSoftwareHierarchy.areas.get(areaPadre)
    if (areaPadreSoftware && areaPadreSoftware.some(matchesSoftware)) {
      return true
    }
  }

  return false
}

export function getApprovedSoftwareCache(): string[] {
  return approvedSoftwareCache
}

export function getApprovedSoftwareHierarchy() {
  return {
    general: approvedSoftwareHierarchy.general,
    areas: Object.fromEntries(approvedSoftwareHierarchy.areas),
    puestos: Object.fromEntries(
      Array.from(approvedSoftwareHierarchy.puestos.entries()).map(
        ([key, value]) => [key, value]
      )
    ),
  }
}

export function getLastExcelRead(): Date | null {
  return lastExcelRead
}

export async function reloadApprovedSoftware(): Promise<{
  success: boolean
  count: number
  lastRead: Date
}> {
  const software = await readApprovedSoftware()
  return {
    success: true,
    count: software.length,
    lastRead: lastExcelRead!,
  }
}
