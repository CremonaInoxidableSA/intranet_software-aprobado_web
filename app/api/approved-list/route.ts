import { NextResponse } from "next/server"
import {
  getApprovedSoftwareCache,
  getLastExcelRead,
  getApprovedSoftwareHierarchy,
} from "@/lib/excel-utils"

export async function GET() {
  const approvedList = getApprovedSoftwareCache()
  const lastRead = getLastExcelRead()
  const hierarchy = getApprovedSoftwareHierarchy()

  return NextResponse.json({
    software: approvedList,
    count: approvedList.length,
    lastRead: lastRead,
    hierarchy: {
      general: hierarchy.general.length,
      areas: Object.keys(hierarchy.areas).length,
      puestos: Object.keys(hierarchy.puestos).length,
    },
  })
}
