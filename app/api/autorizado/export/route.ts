/**
 * GET /api/autorizado/export
 *
 * Devuelve todos los registros de creminox_software_autorizado como JSON.
 * Usar para hacer un backup antes de modificar la tabla.
 *
 * Ejemplo de uso:
 *   curl http://localhost:3000/api/autorizado/export > backup.json
 */
import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"

export async function GET() {
  try {
    const pool = await getDbPool()
    const [rows] = await pool.execute(
      `SELECT id, software, area, puesto, created_at
       FROM creminox_software_autorizado
       ORDER BY area IS NULL DESC, area, puesto IS NULL DESC, puesto, software`
    )

    return NextResponse.json({ data: rows })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
