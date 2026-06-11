import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { SoftwareRecord } from "@/lib/types"
import { shouldExcludeSoftware, normalizeSoftwareName } from "@/lib/excel-utils"
import { reloadFiltersFromDb } from "@/lib/db-filters"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const location = searchParams.get("location") || "all"
  const software = searchParams.get("software") || "all"

  await reloadFiltersFromDb()
  const pool = await getDbPool()

  let query = `
    SELECT 
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

  if (location !== "all") {
    query += " AND l.completename = ?"
    params.push(location)
  }

  query += " ORDER BY l.completename, c.name, s.name"

  const [rows] = await pool.execute(query, params)
  const data = rows as SoftwareRecord[]

  let filteredData = data
    .filter((item) => !shouldExcludeSoftware(item.software))
    .map((item) => ({
      ...item,
      software: normalizeSoftwareName(item.software),
    }))

  if (software !== "all") {
    filteredData = filteredData.filter((item) => item.software === software)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filteredData = filteredData.filter(
      (item) =>
        item.computadora.toLowerCase().includes(searchLower) ||
        item.ubicacion?.toLowerCase().includes(searchLower) ||
        item.software.toLowerCase().includes(searchLower) ||
        item.version.toLowerCase().includes(searchLower)
    )
  }

  const uniqueData = Array.from(
    filteredData
      .reduce((map, item) => {
        const key = `${item.computadora}-${item.software}`
        if (!map.has(key)) {
          map.set(key, item)
        }
        return map
      }, new Map<string, SoftwareRecord>())
      .values()
  )

  return NextResponse.json(uniqueData)
}
