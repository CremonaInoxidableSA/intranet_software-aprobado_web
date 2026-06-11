import { NextResponse } from "next/server"
import { getDbPool } from "@/lib/db"

export async function GET() {
  const pool = await getDbPool()
  const [rows] = await pool.execute("SELECT 1 as test")

  return NextResponse.json({
    success: true,
    message: "Database connection successful",
    data: rows,
  })
}
