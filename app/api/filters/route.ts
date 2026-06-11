import { NextResponse } from "next/server"
import {
  getAllFilterRecords,
  createFilter,
  ensureFiltersLoaded,
  reloadFiltersFromDb,
} from "@/lib/db-filters"

export async function GET() {
  try {
    await ensureFiltersLoaded()
    const records = await getAllFilterRecords()
    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, pattern, flags = "i", replacement = null } = body

    if (!type || !pattern) {
      return NextResponse.json(
        { error: "type y pattern son obligatorios" },
        { status: 400 }
      )
    }
    if (!["exclude", "include", "normalize", "force_exclude"].includes(type)) {
      return NextResponse.json({ error: "type inválido" }, { status: 400 })
    }
    if (type === "normalize" && !replacement) {
      return NextResponse.json(
        { error: "replacement es obligatorio para normalize" },
        { status: 400 }
      )
    }

    // Validar que el patrón es una expresión regular válida
    try {
      new RegExp(pattern, flags)
    } catch {
      return NextResponse.json(
        { error: "El patrón no es una expresión regular válida" },
        { status: 400 }
      )
    }

    const id = await createFilter(type, pattern, flags, replacement)
    await reloadFiltersFromDb()
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
