import { NextResponse } from "next/server"
import {
  updateFilter,
  deleteFilter,
  reloadFiltersFromDb,
} from "@/lib/db-filters"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numId = parseInt(id)
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { pattern, flags = "i", replacement = null } = body

    if (!pattern) {
      return NextResponse.json(
        { error: "pattern es obligatorio" },
        { status: 400 }
      )
    }

    try {
      new RegExp(pattern, flags)
    } catch {
      return NextResponse.json(
        { error: "El patrón no es una expresión regular válida" },
        { status: 400 }
      )
    }

    await updateFilter(numId, pattern, flags, replacement)
    await reloadFiltersFromDb()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numId = parseInt(id)
    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    await deleteFilter(numId)
    await reloadFiltersFromDb()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
