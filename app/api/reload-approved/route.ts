import { NextResponse } from "next/server"
import { reloadDbCache } from "@/lib/db-autorizado"

export async function POST() {
  const result = await reloadDbCache()

  return NextResponse.json({
    message: "Lista de software aprobado recargada desde la base de datos",
    success: true,
    count: result.count,
  })
}
