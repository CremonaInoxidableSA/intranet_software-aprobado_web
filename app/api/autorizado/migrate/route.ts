/**
 * POST /api/autorizado/migrate
 *
 * Lee el Excel RP_Software_Aprobado.xlsx, trunca la tabla
 * creminox_software_autorizado e inserta todos los registros.
 * Operación idempotente: se puede volver a correr sin problemas.
 */
import { NextResponse } from "next/server"
import {
  readApprovedSoftware,
  getApprovedSoftwareHierarchy,
} from "@/lib/excel-utils"
import { getDbPool } from "@/lib/db"
import { invalidateDbCache } from "@/lib/db-autorizado"

export async function POST() {
  try {
    await readApprovedSoftware()
    const hierarchy = getApprovedSoftwareHierarchy()

    const rows: Array<[string, string | null, string | null]> = []

    for (const sw of hierarchy.general) {
      rows.push([sw, null, null])
    }

    for (const [area, softwares] of Object.entries(hierarchy.areas)) {
      for (const sw of softwares as string[]) {
        rows.push([sw, area, null])
      }
    }

    for (const [key, data] of Object.entries(hierarchy.puestos)) {
      const [area, puesto] = key.split("|||")
      for (const sw of (data as { area: string; software: string[] })
        .software) {
        rows.push([sw, area, puesto])
      }
    }

    const pool = await getDbPool()
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()
      await conn.execute("TRUNCATE TABLE creminox_software_autorizado")

      if (rows.length > 0) {
        await conn.query(
          "INSERT INTO creminox_software_autorizado (software, area, puesto) VALUES ?",
          [rows]
        )
      }

      await conn.commit()
      invalidateDbCache()

      return NextResponse.json({
        success: true,
        migrated: rows.length,
        breakdown: {
          general: hierarchy.general.length,
          areas: Object.keys(hierarchy.areas).length,
          puestos: Object.keys(hierarchy.puestos).length,
        },
      })
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
