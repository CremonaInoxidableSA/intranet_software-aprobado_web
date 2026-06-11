import { NextResponse } from "next/server"
import { getAllFilterRecords, ensureFiltersLoaded } from "@/lib/db-filters"

export async function GET() {
  try {
    await ensureFiltersLoaded()
    const records = await getAllFilterRecords()
    const payload = records.map(({ id: _id, ...rest }) => rest)

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="filtros-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
