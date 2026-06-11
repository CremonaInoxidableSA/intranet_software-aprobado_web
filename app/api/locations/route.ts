import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { LocationData } from "@/lib/types"

export async function GET() {
  try {
    const pool = await getDbPool()

    const query = `
      SELECT DISTINCT l.completename AS ubicacion
      FROM glpi_computers c
      LEFT JOIN glpi_locations l ON c.locations_id = l.id
      WHERE c.is_deleted = 0 AND c.is_template = 0 AND l.completename IS NOT NULL
      ORDER BY l.completename
    `

    const [rows] = await pool.execute(query)
    const data = rows as LocationData[]

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
