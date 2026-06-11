import { NextResponse } from "next/server"
import { reloadFiltersFromDb } from "@/lib/db-filters"
import { shouldExcludeSoftware, normalizeSoftwareName } from "@/lib/excel-utils"

export async function POST(request: Request) {
  try {
    await reloadFiltersFromDb()
    const { name } = await request.json()
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name es obligatorio" },
        { status: 400 }
      )
    }

    const excluded = shouldExcludeSoftware(name)
    const normalized = excluded ? null : normalizeSoftwareName(name)

    return NextResponse.json({ excluded, normalized })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
