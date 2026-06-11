import { NextResponse } from "next/server"
import {
  readApprovedSoftware,
  getApprovedSoftwareCache,
  getApprovedSoftwareHierarchy,
} from "@/lib/excel-utils"
import { getDbPool } from "@/lib/db"

export async function GET() {
  if (getApprovedSoftwareCache().length === 0) {
    await readApprovedSoftware()
  }

  const hierarchy = getApprovedSoftwareHierarchy()

  const pool = await getDbPool()
  const [rows] = await pool.execute(`
    SELECT 
      c.name AS equipo,
      l.completename AS ubicacion,
      s.name AS software
    FROM glpi_items_softwareversions isv
    JOIN glpi_computers c ON isv.items_id = c.id AND isv.itemtype = 'Computer'
    JOIN glpi_softwareversions sv ON isv.softwareversions_id = sv.id
    JOIN glpi_softwares s ON sv.softwares_id = s.id
    LEFT JOIN glpi_locations l ON c.locations_id = l.id
    WHERE c.is_deleted = 0 
      AND c.is_template = 0
      AND (
        s.name LIKE '%Alison%' OR
        s.name LIKE '%Dropbox%' OR
        s.name LIKE '%Firefox%' OR
        s.name LIKE '%Krita%' OR
        s.name LIKE '%AutoCAD%'
      )
    LIMIT 20
  `)

  const realCases = rows as {
    equipo: string
    ubicacion: string
    software: string
  }[]

  function normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  const debugResults = realCases.map(({ equipo, ubicacion, software }) => {
    const ubicacionNormalized = normalizeForComparison(ubicacion || "").replace(
      /\s+/g,
      "_"
    )

    const puestoMatches = []
    for (const [puestoKey, puestoData] of Object.entries(hierarchy.puestos)) {
      const [area, puesto] = puestoKey.split("_")
      if (ubicacionNormalized.includes(puesto)) {
        puestoMatches.push({
          puestoKey,
          area,
          puesto,
          matches: ubicacionNormalized.includes(puesto),
          softwareList: (puestoData as { software: string[] }).software,
        })
      }
    }

    const areaMatches = []
    for (const [area, areaSoftware] of Object.entries(hierarchy.areas)) {
      if (ubicacionNormalized.includes(area)) {
        areaMatches.push({
          area,
          matches: ubicacionNormalized.includes(area),
          softwareList: areaSoftware,
        })
      }
    }

    return {
      equipo,
      ubicacion,
      ubicacionNormalized,
      software,
      debug: {
        puestoMatches,
        areaMatches,
        inGeneral: hierarchy.general.some(
          (s) =>
            s.toLowerCase().includes(software.toLowerCase()) ||
            software.toLowerCase().includes(s.toLowerCase())
        ),
      },
    }
  })

  return NextResponse.json({
    realCasesFromDB: debugResults,
    hierarchyKeys: {
      general: hierarchy.general,
      areasKeys: Object.keys(hierarchy.areas),
      puestosKeys: Object.keys(hierarchy.puestos),
    },
    hierarchyDetail: {
      areas: hierarchy.areas,
      puestos: hierarchy.puestos,
    },
  })
}
