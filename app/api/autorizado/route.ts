/**
 * GET  /api/autorizado  → lista registros (con filtros opcionales)
 * POST /api/autorizado  → crea un registro nuevo
 */
import { NextRequest, NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"
import { invalidateDbCache } from "@/lib/db-autorizado"

// ─── GET ─────────────────────────────────────────────────────────────────────
// Query params opcionales: ?area=...&puesto=...&search=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const area = searchParams.get("area")
    const puesto = searchParams.get("puesto")
    const search = searchParams.get("search")

    const computadora = searchParams.get("computadora")

    let query = `
      SELECT id, software, area, puesto, computadora, created_at
      FROM creminox_software_autorizado
      WHERE 1=1
    `
    const params: (string | null)[] = []

    if (area !== null) {
      if (area === "") {
        query += " AND area IS NULL"
      } else {
        query += " AND area = ?"
        params.push(area)
      }
    }

    if (puesto !== null) {
      if (puesto === "") {
        query += " AND puesto IS NULL"
      } else {
        query += " AND puesto = ?"
        params.push(puesto)
      }
    }

    if (computadora !== null) {
      if (computadora === "") {
        query += " AND computadora IS NULL"
      } else {
        query += " AND computadora = ?"
        params.push(computadora)
      }
    }

    if (search) {
      query += " AND software LIKE ?"
      params.push(`%${search}%`)
    }

    query +=
      " ORDER BY computadora IS NOT NULL DESC, computadora, area IS NULL DESC, area, puesto IS NULL DESC, puesto, software"

    const pool = await getDbPool()
    const [rows] = await pool.execute(query, params)

    return NextResponse.json({ data: rows })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
// Body: { software: string, area?: string | null, puesto?: string | null }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const software = (body.software ?? "").trim()
    const area = body.area?.trim() || null
    const puesto = body.puesto?.trim() || null
    const computadora = body.computadora?.trim() || null

    if (!software) {
      return NextResponse.json(
        { error: "El campo 'software' es requerido." },
        { status: 400 }
      )
    }

    // computadora es excluyente con area/puesto
    if (computadora && (area || puesto)) {
      return NextResponse.json(
        { error: "Un registro por PC no puede tener área ni puesto." },
        { status: 400 }
      )
    }

    // Si tiene puesto, debe tener área
    if (puesto && !area) {
      return NextResponse.json(
        { error: "Si se indica un puesto, el área también es requerida." },
        { status: 400 }
      )
    }

    const pool = await getDbPool()

    // Verificar duplicado exacto
    const [existing] = (await pool.execute(
      `SELECT id FROM creminox_software_autorizado
       WHERE software = ?
         AND (area <=> ?)
         AND (puesto <=> ?)
         AND (computadora <=> ?)
       LIMIT 1`,
      [software, area, puesto, computadora]
    )) as [{ id: number }[], unknown]

    if ((existing as { id: number }[]).length > 0) {
      return NextResponse.json(
        { error: "Ya existe ese registro con los mismos valores." },
        { status: 409 }
      )
    }

    const [result] = (await pool.execute(
      "INSERT INTO creminox_software_autorizado (software, area, puesto, computadora) VALUES (?, ?, ?, ?)",
      [software, area, puesto, computadora]
    )) as [{ insertId: number }, unknown]

    invalidateDbCache()

    return NextResponse.json(
      {
        success: true,
        id: (result as { insertId: number }).insertId,
        record: { software, area, puesto, computadora },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
