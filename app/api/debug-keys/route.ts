import { NextResponse } from "next/server"
import {
  getApprovedSoftwareHierarchy,
  readApprovedSoftware,
  getApprovedSoftwareCache,
} from "@/lib/excel-utils"

export async function GET() {
  if (getApprovedSoftwareCache().length === 0) {
    await readApprovedSoftware()
  }

  const hierarchy = getApprovedSoftwareHierarchy()

  return NextResponse.json({
    areasKeys: Object.keys(hierarchy.areas),
    puestosKeys: Object.keys(hierarchy.puestos),
    puestosDetail: Object.fromEntries(
      Object.entries(hierarchy.puestos).map(([key, data]) => [
        key,
        {
          area: data.area as string,
          softwareCount: (data.software as string[]).length,
          softwareSamples: (data.software as string[]).slice(0, 3),
        },
      ])
    ),
  })
}
