import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { SoftwareApprovalRecord } from "@/lib/types"
import { shouldExcludeSoftware, normalizeSoftwareName } from "@/lib/excel-utils"
import {
  ensureDbCacheLoaded,
  isSoftwareApprovedForLocationDb,
} from "@/lib/db-autorizado"
import { ensureFiltersLoaded } from "@/lib/db-filters"

export async function GET() {
  try {
    await ensureFiltersLoaded()
    await ensureDbCacheLoaded()

    const pool = await getDbPool()

    const query = `
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
    ORDER BY l.completename, c.name, s.name
  `

    const [rows] = await pool.execute(query)
    let data = rows as SoftwareApprovalRecord[]

    data = data
      .filter((item) => !shouldExcludeSoftware(item.software))
      .map((item) => {
        const normalizedSoftware = normalizeSoftwareName(item.software)
        const aprobado = isSoftwareApprovedForLocationDb(
          normalizedSoftware,
          item.ubicacion || ""
        )
        return {
          ...item,
          software: normalizedSoftware,
          aprobado: aprobado,
        }
      })

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

    const total = data.length

    return NextResponse.json({ total })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
