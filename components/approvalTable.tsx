"use client"
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaDesktop,
  FaMapMarkerAlt,
  FaPuzzlePiece,
  FaTag,
  FaShieldAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa"
import { SoftwareApprovalRecord } from "@/lib/types"

interface ApprovalTableProps {
  data: SoftwareApprovalRecord[]
  onSort?: (column: keyof SoftwareApprovalRecord) => void
  sortColumn?: keyof SoftwareApprovalRecord | null
  sortDirection?: "asc" | "desc"
}

export default function ApprovalTable({
  data,
  onSort,
  sortColumn,
  sortDirection,
}: ApprovalTableProps) {
  const handleSort = (column: keyof SoftwareApprovalRecord) => {
    if (onSort) {
      onSort(column)
    }
  }

  const getSortIcon = (column: keyof SoftwareApprovalRecord) => {
    if (sortColumn !== column) {
      return <FaSort className="ml-2 inline" />
    }
    return sortDirection === "asc" ? (
      <FaSortUp className="ml-2 inline text-bluecremona" />
    ) : (
      <FaSortDown className="ml-2 inline text-bluecremona" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FaSearch className="mb-4 text-5xl" />
        <h3 className="mb-2 text-xl font-semibold">
          No se encontraron resultados
        </h3>
        <p>Intenta ajustar los filtros o el término de búsqueda</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-sm border border-background4">
        <table className="min-w-full divide-y divide-background4">
          <thead className="bg-background3">
            <tr>
              <th
                onClick={() => handleSort("equipo")}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-background4"
                style={{ width: "10%" }}
              >
                <div className="flex items-center">
                  <FaDesktop className="mr-2 inline" />
                  Equipo
                  {getSortIcon("equipo")}
                </div>
              </th>
              <th
                onClick={() => handleSort("ubicacion")}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-background4"
                style={{ width: "15%" }}
              >
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 inline" />
                  Ubicación
                  {getSortIcon("ubicacion")}
                </div>
              </th>
              <th
                onClick={() => handleSort("software")}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-background4"
                style={{ width: "35%" }}
              >
                <div className="flex items-center">
                  <FaPuzzlePiece className="mr-2 inline" />
                  Software
                  {getSortIcon("software")}
                </div>
              </th>
              <th
                onClick={() => handleSort("version")}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-background4"
                style={{ width: "20%" }}
              >
                <div className="flex items-center">
                  <FaTag className="mr-2 inline" />
                  Versión
                  {getSortIcon("version")}
                </div>
              </th>
              <th
                onClick={() => handleSort("aprobado")}
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider uppercase hover:bg-background4"
                style={{ width: "20%" }}
              >
                <div className="flex items-center">
                  <FaShieldAlt className="mr-2 inline" />
                  Estado
                  {getSortIcon("aprobado")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background4 bg-background2">
            {data.map((item, index) => (
              <tr
                key={index}
                className={`transition-colors ${
                  item.aprobado
                    ? "hover:bg-greencremona/10"
                    : "hover:bg-redcremona/10"
                }`}
              >
                <td
                  className="px-6 py-4 text-sm font-medium whitespace-nowrap"
                  style={{ width: "15%" }}
                >
                  {item.equipo || "N/A"}
                </td>
                <td
                  className="px-6 py-4 text-sm whitespace-nowrap"
                  style={{ width: "10%" }}
                >
                  {item.ubicacion || "Sin ubicación"}
                </td>
                <td className="px-6 py-4 text-sm" style={{ width: "20%" }}>
                  {item.software || "N/A"}
                </td>
                <td
                  className="px-6 py-4 text-sm whitespace-nowrap"
                  style={{ width: "20%" }}
                >
                  {item.version || "N/A"}
                </td>
                <td
                  className="px-6 py-4 text-sm whitespace-nowrap"
                  style={{ width: "20%" }}
                >
                  {item.aprobado ? (
                    <span className="inline-flex items-center rounded-full border border-greencremona/40 bg-greencremona/20 px-3 py-1 text-sm font-medium text-greencremona">
                      <FaCheckCircle className="mr-2 inline" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-redcremona/40 bg-redcremona/20 px-3 py-1 text-sm font-medium text-redcremona">
                      <FaTimesCircle className="mr-2 inline" />
                      No Aprobado
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
