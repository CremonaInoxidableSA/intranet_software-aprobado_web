import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"

export async function GET() {
  const pool = await getDbPool()

  const query = `
    SELECT DISTINCT 
      l.completename AS ubicacion,
      COUNT(*) as count
    FROM glpi_computers c
    LEFT JOIN glpi_locations l ON c.locations_id = l.id
    WHERE c.is_deleted = 0 AND c.is_template = 0
    GROUP BY l.completename
    ORDER BY l.completename
  `

  const [rows] = await pool.execute(query)

  return NextResponse.json({
    ubicaciones: rows,
    total: (rows as { ubicacion: string; count: number }[]).length,
  })
}
