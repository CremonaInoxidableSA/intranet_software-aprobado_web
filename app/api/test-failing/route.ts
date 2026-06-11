import { NextResponse } from "next/server"
import {
  readApprovedSoftware,
  getApprovedSoftwareCache,
  isSoftwareApprovedForLocation,
  getApprovedSoftwareHierarchy,
} from "@/lib/excel-utils"

export async function GET() {
  if (getApprovedSoftwareCache().length === 0) {
    await readApprovedSoftware()
  }

  const hierarchy = getApprovedSoftwareHierarchy()

  const testCases = [
    { ubicacion: "Coordinacion Administracion CR", software: "Alison-Desktop" },
    {
      ubicacion: "Coordinacion Electronica",
      software: "Autodesk AutoCAD 2022",
    },
    { ubicacion: "Coordinacion Ventas", software: "Autodesk AutoCAD 2022" },
    { ubicacion: "Coordinacion Administracion CR", software: "Dropbox" },
    { ubicacion: "Coordinacion Mecanica", software: "Dropbox" },
    { ubicacion: "Coordinacion Mecanica", software: "Foxit PDF" },
    { ubicacion: "Coordinacion Mecanica", software: "Krita" },
    { ubicacion: "Administracion Antonativa", software: "Mozilla Firefox" },
    {
      ubicacion: "Coordinacion Administracion CR",
      software: "Mozilla Firefox",
    },
    { ubicacion: "Marketing", software: "Mozilla Firefox" },
  ]

  function normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  const results = testCases.map(({ ubicacion, software }) => {
    const aprobado = isSoftwareApprovedForLocation(software, ubicacion)
    const ubicacionNormalized = normalizeForComparison(ubicacion).replace(
      /\s+/g,
      "_"
    )

    const puestoMatches = []
    for (const [puestoKey] of Object.entries(hierarchy.puestos)) {
      const [area, puesto] = puestoKey.split("_")
      if (ubicacionNormalized.includes(puesto)) {
        puestoMatches.push({
          puestoKey,
          area,
          puesto,
          match: `ubicacion="${ubicacionNormalized}" includes puesto="${puesto}"`,
        })
      }
    }

    const areaMatches = []
    for (const [area] of Object.entries(hierarchy.areas)) {
      if (ubicacionNormalized.includes(area)) {
        areaMatches.push({
          area,
          match: `ubicacion="${ubicacionNormalized}" includes area="${area}"`,
        })
      }
    }

    const softwareInGeneral = hierarchy.general.includes(software)
    const softwareInAreas = Object.entries(hierarchy.areas)
      .filter(([, sw]) => (sw as string[]).includes(software))
      .map(([area]) => area)
    const softwareInPuestos = Object.entries(hierarchy.puestos)
      .filter(([, data]) =>
        (data as { software: string[] }).software.includes(software)
      )
      .map(([puesto]) => puesto)

    return {
      ubicacion,
      software,
      aprobado,
      debug: {
        ubicacionNormalized,
        puestoMatches,
        areaMatches,
        softwareLocations: {
          inGeneral: softwareInGeneral,
          inAreas: softwareInAreas,
          inPuestos: softwareInPuestos,
        },
      },
    }
  })

  return NextResponse.json({
    summary: {
      total: results.length,
      aprobados: results.filter((r) => r.aprobado).length,
      desaprobados: results.filter((r) => !r.aprobado).length,
    },
    results,
    hierarchy: {
      generalSoftware: hierarchy.general,
      areasKeys: Object.keys(hierarchy.areas),
      puestosKeys: Object.keys(hierarchy.puestos),
      areasDetail: hierarchy.areas,
      puestosDetail: hierarchy.puestos,
    },
  })
}
