import { NextResponse } from "next/server"
import {
  getApprovedSoftwareCache,
  getLastExcelRead,
  isSoftwareApproved,
  isSoftwareApprovedForLocation,
  getApprovedSoftwareHierarchy,
} from "@/lib/excel-utils"

export async function GET() {
  const cache = getApprovedSoftwareCache()
  const lastRead = getLastExcelRead()
  const hierarchy = getApprovedSoftwareHierarchy()

  const testSoftwares = [
    { software: "Adobe Illustrator", ubicacion: "Ventas > Marketing" },
    { software: "Adobe Photoshop", ubicacion: "Ventas > Marketing" },
    { software: "Adobe Acrobat", ubicacion: "General" },
    { software: "Microsoft Office", ubicacion: "Ventas" },
    { software: "Chrome", ubicacion: "Ventas > Marketing" },
    { software: "AutoCAD", ubicacion: "IT" },
  ]

  const testResults = testSoftwares.map(({ software, ubicacion }) => ({
    software,
    ubicacion,
    aprobado: isSoftwareApprovedForLocation(software, ubicacion),
    aprobadoSinUbicacion: isSoftwareApproved(software),
  }))

  return NextResponse.json({
    cacheStatus: {
      length: cache.length,
      lastRead: lastRead?.toISOString() || null,
      hasData: cache.length > 0,
    },
    hierarchy: {
      generalCount: hierarchy.general.length,
      generalSamples: hierarchy.general.slice(0, 10),
      areasCount: Object.keys(hierarchy.areas).length,
      areas: Object.fromEntries(
        Object.entries(hierarchy.areas).map(([area, software]) => [
          area,
          {
            count: (software as string[]).length,
            samples: (software as string[]).slice(0, 5),
          },
        ])
      ),
      puestosCount: Object.keys(hierarchy.puestos).length,
      puestos: Object.fromEntries(
        Object.entries(hierarchy.puestos).map(([puesto, data]) => [
          puesto,
          {
            area: data.area as string,
            count: (data.software as string[]).length,
            samples: (data.software as string[]).slice(0, 5),
          },
        ])
      ),
    },
    approvedSoftware: cache.slice(0, 10),
    testResults,
    allApproved: cache,
  })
}
