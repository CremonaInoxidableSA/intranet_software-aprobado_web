/**
 * DELETE /api/autorizado/[id]  → elimina un registro por ID
 * PATCH  /api/autorizado/[id]  → modifica software/area/puesto de un registro
 */
import { NextRequest, NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { invalidateDbCache } from "@/lib/db-autorizado"

type Params = { params: Promise<{ id: string }> }

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const numId = parseInt(id, 10)

    if (isNaN(numId) || numId <= 0) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 })
    }

    const pool = await getDbPool()
    const [result] = (await pool.execute(
      "DELETE FROM creminox_software_autorizado WHERE id = ?",
      [numId]
    )) as [{ affectedRows: number }, unknown]

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return NextResponse.json(
        { error: "Registro no encontrado." },
        { status: 404 }
      )
    }

    invalidateDbCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
// Body: { software?: string, area?: string | null, puesto?: string | null, computadora?: string | null }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const numId = parseInt(id, 10)

    if (isNaN(numId) || numId <= 0) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 })
    }

    const body = await req.json()
    const software = body.software?.trim() || undefined
    const area = "area" in body ? body.area?.trim() || null : undefined
    const puesto = "puesto" in body ? body.puesto?.trim() || null : undefined
    const computadora =
      "computadora" in body ? body.computadora?.trim() || null : undefined

    if (
      !software &&
      area === undefined &&
      puesto === undefined &&
      computadora === undefined
    ) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar." },
        { status: 400 }
      )
    }

    const updates: string[] = []
    const values: (string | null)[] = []

    if (software !== undefined) {
      updates.push("software = ?")
      values.push(software)
    }
    if (computadora !== undefined) {
      updates.push("computadora = ?")
      values.push(computadora)
    }
    if (area !== undefined) {
      updates.push("area = ?")
      values.push(area)
    }
    if (puesto !== undefined) {
      updates.push("puesto = ?")
      values.push(puesto)
    }

    values.push(String(numId))

    const pool = await getDbPool()
    const [result] = (await pool.execute(
      `UPDATE creminox_software_autorizado SET ${updates.join(", ")} WHERE id = ?`,
      values
    )) as [{ affectedRows: number }, unknown]

    if ((result as { affectedRows: number }).affectedRows === 0) {
      return NextResponse.json(
        { error: "Registro no encontrado." },
        { status: 404 }
      )
    }

    invalidateDbCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
