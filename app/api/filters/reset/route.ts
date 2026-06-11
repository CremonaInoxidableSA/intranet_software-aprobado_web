import { NextResponse } from "next/server"
import { clearAllFilters } from "@/lib/db-filters"

export async function POST() {
  try {
    await clearAllFilters()
    return NextResponse.json({
      ok: true,
      message: "Todos los filtros eliminados",
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
