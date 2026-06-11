/**
 * POST /api/autorizado/import
 *
 * Restaura la tabla creminox_software_autorizado desde un backup JSON.
 * TRUNCA la tabla antes de insertar — usar solo para restaurar un backup.
 *
 * Body esperado (el mismo formato que devuelve /api/autorizado/export):
 *   { "data": [ { "software": "...", "area": "...", "puesto": "..." }, ... ] }
 *
 * Los campos "area" y "puesto" pueden ser null.
 * El campo "id" y "created_at" se ignoran (se regeneran).
 *
 * Ejemplo de uso:
 *   curl -X POST http://localhost:3000/api/autorizado/import \
 *        -H "Content-Type: application/json" \
 *        -d @backup.json
 */
import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { invalidateDbCache } from "@/lib/db-autorizado"

interface ImportRow {
  software: string
  area?: string | null
  puesto?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!Array.isArray(body?.data)) {
      return NextResponse.json(
        { error: "El body debe tener la forma { data: [...] }" },
        { status: 400 }
      )
    }

    const rows = body.data as ImportRow[]
    const validRows = rows.filter((r) => r.software?.trim())

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron filas válidas en el payload" },
        { status: 400 }
      )
    }

    const values: Array<[string, string | null, string | null]> = validRows.map(
      (r) => [
        r.software.trim(),
        r.area?.trim() || null,
        r.puesto?.trim() || null,
      ]
    )

    const pool = await getDbPool()
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()
      await conn.execute("TRUNCATE TABLE creminox_software_autorizado")
      await conn.query(
        "INSERT INTO creminox_software_autorizado (software, area, puesto) VALUES ?",
        [values]
      )
      await conn.commit()
      invalidateDbCache()

      return NextResponse.json({ success: true, imported: values.length })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
