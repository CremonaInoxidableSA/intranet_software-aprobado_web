import { NextResponse } from "next/server"
import {
  isSoftwareApprovedForLocation,
  getApprovedSoftwareHierarchy,
  readApprovedSoftware,
  getApprovedSoftwareCache,
} from "@/lib/excel-utils"
import { getDbPool } from "@/lib/db"

export async function GET() {
  if (getApprovedSoftwareCache().length === 0) {
    await readApprovedSoftware()
  }

  const hierarchy = getApprovedSoftwareHierarchy()

  const pool = await getDbPool()
  const [equiposRows] = await pool.execute(`
    SELECT DISTINCT 
      c.name AS equipo,
      l.completename AS ubicacion
    FROM glpi_computers c
    LEFT JOIN glpi_locations l ON c.locations_id = l.id
    WHERE c.is_deleted = 0 AND c.is_template = 0
    LIMIT 20
  `)

  const equipos = equiposRows as { equipo: string; ubicacion: string }[]

  const testSoftware = [
    "Adobe Illustrator CC 2015",
    "Adobe Photoshop CC 2015",
    "Alison-Desktop",
    "Dropbox",
    "DaVinci Resolve",
    "DWG FastView",
    "Krita",
    "AutoDesk AutoCAD 2022",
  ]

  const testResults = equipos.flatMap(({ equipo, ubicacion }) =>
    testSoftware.map((software) => ({
      equipo,
      ubicacion,
      software,
      aprobado: isSoftwareApprovedForLocation(software, ubicacion || ""),
    }))
  )

  return NextResponse.json({
    summary: {
      totalEquipos: equipos.length,
      totalSoftware: testSoftware.length,
      aprobados: testResults.filter((r) => r.aprobado).length,
      desaprobados: testResults.filter((r) => !r.aprobado).length,
    },
    equiposConUbicaciones: equipos,
    testResults: testResults,
    hierarchy: {
      general: {
        count: hierarchy.general.length,
        software: hierarchy.general,
      },
      areas: Object.fromEntries(
        Object.entries(hierarchy.areas).map(([area, software]) => [
          area,
          {
            count: (software as string[]).length,
            software: software,
          },
        ])
      ),
      puestos: Object.fromEntries(
        Object.entries(hierarchy.puestos).map(([puesto, data]) => [
          puesto,
          {
            area: data.area as string,
            count: (data.software as string[]).length,
            software: data.software as string[],
          },
        ])
      ),
    },
  })
}
