import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { SoftwareApprovalRecord } from "@/lib/types"
import { shouldExcludeSoftware, normalizeSoftwareName } from "@/lib/excel-utils"
import {
  ensureDbCacheLoaded,
  isSoftwareApprovedForLocationDb,
} from "@/lib/db-autorizado"
import { ensureFiltersLoaded } from "@/lib/db-filters"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const equipo = searchParams.get("equipo") || "all"
    const estado = searchParams.get("estado") || "all"
    const software = searchParams.get("software") || "all"
    const ubicacion = searchParams.get("ubicacion") || "all"
    const pool = await getDbPool()
    await ensureFiltersLoaded()
    await ensureDbCacheLoaded()

    let query = `
    SELECT 
      c.name AS equipo,
      c.name AS computadora,
      l.completename AS ubicacion,
      s.name AS software,
      sv.name AS version,
      sc.name AS categoria
    FROM glpi_items_softwareversions isv
    JOIN glpi_computers c
        ON isv.items_id = c.id
        AND isv.itemtype = 'Computer'
    JOIN glpi_softwareversions sv
        ON isv.softwareversions_id = sv.id
    JOIN glpi_softwares s
        ON sv.softwares_id = s.id
    LEFT JOIN glpi_locations l
        ON c.locations_id = l.id
    LEFT JOIN glpi_softwarecategories sc
        ON s.softwarecategories_id = sc.id
    WHERE c.is_deleted = 0 AND c.is_template = 0
        AND (sc.name IS NULL OR sc.name NOT IN ('system', 'update', 'system_update'))
  `

    const params: string[] = []

    if (equipo !== "all") {
      query += " AND c.name = ?"
      params.push(equipo)
    }
    if (ubicacion !== "all") {
      // Incluye la ubicación exacta y todos sus hijos (GLPI usa " > " como separador de jerarquía)
      query += " AND (l.completename = ? OR l.completename LIKE ?)"
      params.push(ubicacion, `${ubicacion} > %`)
    }

    query += " ORDER BY l.completename, c.name, s.name"

    const [rows] = await pool.execute(query, params)
    let data = rows as SoftwareApprovalRecord[]

    data = data
      .filter((item) => !shouldExcludeSoftware(item.software))
      .map((item) => {
        const normalizedSoftware = normalizeSoftwareName(item.software)
        const aprobado = isSoftwareApprovedForLocationDb(
          normalizedSoftware,
          item.ubicacion || "",
          item.equipo || item.computadora || undefined
        )
        return {
          ...item,
          software: normalizedSoftware,
          aprobado: aprobado,
        }
      })

    if (software !== "all") {
      data = data.filter((item) => item.software === software)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(
        (item) =>
          item.computadora.toLowerCase().includes(searchLower) ||
          item.software.toLowerCase().includes(searchLower)
      )
    }

    data = Array.from(
      data
        .reduce((map, item) => {
          const key = `${item.computadora}-${item.software}`
          if (!map.has(key)) {
            map.set(key, item)
          }
          return map
        }, new Map<string, SoftwareApprovalRecord>())
        .values()
    )

    if (estado === "aprobado") {
      data = data.filter((item) => item.aprobado)
    } else if (estado === "desaprobado") {
      data = data.filter((item) => !item.aprobado)
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
