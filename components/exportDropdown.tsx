"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { FaFileExcel, FaChevronDown } from "react-icons/fa"

interface ExportDropdownProps<RowType> {
  rows: RowType[]
  allRows?: RowType[]
  columns: { key: keyof RowType; label: string }[]
}

export default function ExportDropdown<RowType>({
  rows,
  allRows,
  columns,
}: ExportDropdownProps<RowType>) {
  const [open, setOpen] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(
    columns.map((c) => String(c.key))
  )
  const [exportScope, setExportScope] = useState<"page" | "all">("page")

  const toggleCol = (key: string) => {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleExport = () => {
    const dataSource = exportScope === "all" && allRows ? allRows : rows

    const exportData = (dataSource || []).map((r: RowType) => {
      const out: Record<string, string> = {}
      for (const col of columns) {
        const key = String(col.key)
        if (selectedCols.includes(key)) {
          const rawVal = r[col.key]
          const val =
            typeof rawVal === "boolean"
              ? rawVal
                ? "Aprobado"
                : "No Aprobado"
              : rawVal
          out[col.label] = val?.toString() ?? ""
        }
      }
      return out
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    if (ws && ws["!ref"]) {
      ws["!autofilter"] = { ref: ws["!ref"] }
    }

    const firstRow = exportData[0] || {}
    const keys = Object.keys(firstRow)
    ws["!cols"] = keys.map((k) => ({
      wch: Math.min(Math.max(k.length + 5, 10), 40),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Export")

    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, "-")
    const filename = `soft-aprobado-${timestamp}.xlsx`
    XLSX.writeFile(wb, filename)

    setOpen(false)
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center space-x-2 rounded-sm border border-background4 bg-background2 px-3 py-1 text-sm transition-colors hover:bg-background3"
      >
        <FaFileExcel className="mr-2 text-greencremona" />
        <span>Exportar</span>
        <FaChevronDown className="ml-2" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-sm border border-background4 bg-background2 p-3 shadow-lg">
          <div className="mb-2 text-sm font-medium">Columnas a exportar</div>
          <div className="mb-3 max-h-32 overflow-auto">
            {columns.map((col) => {
              const key = String(col.key)
              return (
                <label
                  key={key}
                  className="mb-1 flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.includes(key)}
                    onChange={() => toggleCol(key)}
                  />
                  <span>{col.label}</span>
                </label>
              )
            })}
          </div>

          <div className="mb-3">
            <div className="mb-1 text-sm font-medium">Filas</div>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportScope"
                checked={exportScope === "page"}
                onChange={() => setExportScope("page")}
              />
              <span className="text-sm">Filas mostradas (página actual)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportScope"
                checked={exportScope === "all"}
                onChange={() => setExportScope("all")}
                disabled={!allRows}
              />
              <span className="text-sm">Todas las filas filtradas</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-sm bg-background3 px-3 py-1 text-sm transition-colors hover:bg-background4"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              className="rounded-sm border border-greencremona/40 bg-greencremona/20 px-3 py-1 text-sm text-greencremona transition-colors hover:bg-greencremona/30"
            >
              Exportar a Excel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
