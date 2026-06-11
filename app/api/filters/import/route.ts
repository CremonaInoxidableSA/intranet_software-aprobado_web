import { NextResponse } from "next/server"
import {
  createFilter,
  getAllFilterRecords,
  deleteFilter,
  reloadFiltersFromDb,
  ensureFiltersLoaded,
} from "@/lib/db-filters"

type ImportRecord = {
  type: "exclude" | "include" | "normalize" | "force_exclude"
  pattern: string
  flags?: string
  replacement?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "El cuerpo debe ser un array de filtros" },
        { status: 400 }
      )
    }

    const validTypes = ["exclude", "include", "normalize", "force_exclude"]

    for (const item of body as ImportRecord[]) {
      if (!item.type || !validTypes.includes(item.type)) {
        return NextResponse.json(
          { error: `type inválido: ${item.type}` },
          { status: 400 }
        )
      }
      if (!item.pattern) {
        return NextResponse.json(
          { error: "Cada filtro debe tener un pattern" },
          { status: 400 }
        )
      }
      try {
        new RegExp(item.pattern, item.flags ?? "i")
      } catch {
        return NextResponse.json(
          { error: `Patrón inválido: ${item.pattern}` },
          { status: 400 }
        )
      }
      if (item.type === "normalize" && !item.replacement) {
        return NextResponse.json(
          {
            error: `replacement es obligatorio para normalize (patrón: ${item.pattern})`,
          },
          { status: 400 }
        )
      }
    }

    // Borrar todos los filtros existentes
    await ensureFiltersLoaded()
    const existing = await getAllFilterRecords()
    for (const r of existing) {
      await deleteFilter(r.id)
    }

    // Insertar los nuevos
    for (const item of body as ImportRecord[]) {
      await createFilter(
        item.type,
        item.pattern,
        item.flags ?? "i",
        item.type === "normalize" ? (item.replacement ?? null) : null
      )
    }

    await reloadFiltersFromDb()
    return NextResponse.json({ imported: body.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
