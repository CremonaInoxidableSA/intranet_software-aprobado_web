import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { SoftwareData } from "@/lib/types"
import { shouldExcludeSoftware, normalizeSoftwareName } from "@/lib/excel-utils"
import { reloadFiltersFromDb } from "@/lib/db-filters"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location") || "all"
    const equipo = searchParams.get("equipo") || "all"

    await reloadFiltersFromDb()
    const pool = await getDbPool()

    let query = `
      SELECT DISTINCT s.name AS software
      FROM glpi_softwares s
      INNER JOIN glpi_softwareversions sv ON s.id = sv.softwares_id
      INNER JOIN glpi_items_softwareversions isv ON sv.id = isv.softwareversions_id
      INNER JOIN glpi_computers c ON isv.items_id = c.id AND isv.itemtype = 'Computer'
      LEFT JOIN glpi_locations l ON c.locations_id = l.id
      LEFT JOIN glpi_softwarecategories sc ON s.softwarecategories_id = sc.id
      WHERE c.is_deleted = 0 AND c.is_template = 0
          AND (sc.name IS NULL OR sc.name NOT IN ('system', 'update', 'system_update'))
    `

    const params: string[] = []

    if (location !== "all") {
      query += " AND (l.completename = ? OR l.completename LIKE ?)"
      params.push(location, `${location} > %`)
    }

    if (equipo !== "all") {
      query += " AND c.name = ?"
      params.push(equipo)
    }

    query += " ORDER BY s.name"

    const [rows] = await pool.execute(query, params)
    const data = rows as SoftwareData[]

    const filteredData = data
      .filter((item) => !shouldExcludeSoftware(item.software))
      .map((item) => ({
        software: normalizeSoftwareName(item.software),
      }))
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.software === item.software)
      )
      .sort((a, b) =>
        a.software.localeCompare(b.software, "es", { sensitivity: "base" })
      )

    return NextResponse.json(filteredData)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
