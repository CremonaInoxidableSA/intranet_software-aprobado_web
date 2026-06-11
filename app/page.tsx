"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FaDesktop,
  FaMapMarkerAlt,
  FaPuzzlePiece,
  FaShieldAlt,
  FaList,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa"
import { SoftwareApprovalRecord, EquipoData, SoftwareData } from "@/lib/types"
import ApprovalTable from "@/components/approvalTable"
import SearchBox from "@/components/searchBox"
import FilterSelect from "@/components/filterSelect"
import ExportDropdown from "@/components/exportDropdown"
import StatsCard from "@/components/statsCard"
import LoadingSpinner from "@/components/loadingSpinner"

export default function AprobadoPage() {
  const [data, setData] = useState<SoftwareApprovalRecord[]>([])
  const [equipos, setEquipos] = useState<EquipoData[]>([])
  const [softwares, setSoftwares] = useState<SoftwareData[]>([])
  const [locations, setLocations] = useState<{ ubicacion: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [equipoFilter, setEquipoFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [softwareFilter, setSoftwareFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")

  const [sortColumn, setSortColumn] = useState<
    keyof SoftwareApprovalRecord | null
  >("equipo")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        equipo: equipoFilter,
        estado: estadoFilter,
        software: softwareFilter,
        ubicacion: locationFilter,
      })

      const response = await fetch(`/api/software-approval?${params}`)
      const result = await response.json()

      const data = response.ok && Array.isArray(result) ? result : []
      setData(data)
    } finally {
      setLoading(false)
    }
  }, [search, equipoFilter, estadoFilter, softwareFilter, locationFilter])

  useEffect(() => {
    loadFilters()
  }, [])

  useEffect(() => {
    loadSoftwares(locationFilter, equipoFilter)
  }, [locationFilter, equipoFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadFilters = async () => {
    const [equiposRes, softwaresRes, locationsRes] = await Promise.all([
      fetch("/api/equipos"),
      fetch("/api/softwares"),
      fetch("/api/locations"),
    ])

    const equiposResult = await equiposRes.json()
    const equiposData =
      equiposRes.ok && Array.isArray(equiposResult) ? equiposResult : []
    setEquipos(equiposData)

    const softwaresResult = await softwaresRes.json()
    const softwaresData =
      softwaresRes.ok && Array.isArray(softwaresResult) ? softwaresResult : []
    setSoftwares(softwaresData)

    const locationsResult = await locationsRes.json()
    const locationsData =
      locationsRes.ok && Array.isArray(locationsResult) ? locationsResult : []
    setLocations(locationsData)
    const totalRes = await fetch("/api/software-approval/total")
    const totalJson = await totalRes.json()
    if (totalRes.ok && typeof totalJson.total === "number") {
      setTotalRecords(totalJson.total)
    } else {
      setTotalRecords(null)
    }
  }

  const loadSoftwares = async (location: string, equipo: string) => {
    const params = new URLSearchParams()
    if (location !== "all") params.set("location", location)
    if (equipo !== "all") params.set("equipo", equipo)
    const res = await fetch(`/api/softwares?${params}`)
    if (!res.ok) return
    const result = await res.json()
    const data = Array.isArray(result) ? result : []
    setSoftwares(data)
    setSoftwareFilter((prev) => {
      if (prev === "all") return "all"
      return data.some((sw: { software: string }) => sw.software === prev)
        ? prev
        : "all"
    })
  }

  const handleSort = (column: keyof SoftwareApprovalRecord) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleReset = () => {
    setSearch("")
    setEquipoFilter("all")
    setEstadoFilter("all")
    setSoftwareFilter("all")
    setLocationFilter("all")
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      if (aVal === bVal) return 0
      return (aVal ? 1 : 0) > (bVal ? 1 : 0)
        ? sortDirection === "asc"
          ? 1
          : -1
        : sortDirection === "asc"
          ? -1
          : 1
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, equipoFilter, estadoFilter, softwareFilter, locationFilter])

  const approvedCount = data.filter((item) => item.aprobado).length
  const unapprovedCount = data.length - approvedCount

  const exportColumns = [
    { key: "equipo", label: "Equipo" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "software", label: "Software" },
    { key: "version", label: "Versión" },
    { key: "aprobado", label: "Estado" },
  ] as { key: keyof SoftwareApprovalRecord; label: string }[]

  return (
    <div className="min-h-screen w-full bg-background p-5">
      <div className="overflow-hidden rounded-sm border border-background4 bg-background2 shadow-2xl">
        {/* Controls */}
        <div className="bg-background3 p-6">
          {/* Search */}
          <div className="mb-6">
            <SearchBox
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="Buscar por equipo o software..."
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
            <FilterSelect
              id="equipoFilter"
              label="Equipo"
              icon={<FaDesktop />}
              value={equipoFilter}
              onChange={setEquipoFilter}
              options={[
                { value: "all", label: "Todos los equipos" },
                ...equipos.map((eq) => ({
                  value: eq.equipo,
                  label: eq.equipo,
                })),
              ]}
            />

            <FilterSelect
              id="locationFilter"
              label="Ubicación"
              icon={<FaMapMarkerAlt />}
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: "all", label: "Todas las ubicaciones" },
                ...locations.map((l) => ({
                  value: l.ubicacion,
                  label: l.ubicacion,
                })),
              ]}
            />

            <FilterSelect
              id="softwareFilter"
              label="Software"
              icon={<FaPuzzlePiece />}
              value={softwareFilter}
              onChange={setSoftwareFilter}
              options={[
                { value: "all", label: "Todo el software" },
                ...softwares.map((sw) => ({
                  value: sw.software,
                  label: sw.software,
                })),
              ]}
            />

            <FilterSelect
              id="estadoFilter"
              label="Estado"
              icon={<FaShieldAlt />}
              value={estadoFilter}
              onChange={setEstadoFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "aprobado", label: "Aprobados" },
                { value: "desaprobado", label: "No Aprobados" },
              ]}
            />

            <button
              onClick={handleReset}
              className="rounded-sm border border-background5 bg-background4 px-5 py-2 font-medium transition-all hover:bg-background5 hover:shadow-lg"
            >
              <FaUndo className="mr-2 inline" />
              Resetear Filtros
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
          <StatsCard
            icon={<FaList />}
            label="Total de registros"
            value={totalRecords ?? data.length}
            color="bluecremona"
          />
          <StatsCard
            icon={<FaFilter />}
            label="Registros filtrados"
            value={sortedData.length}
            color="bluecremona"
          />
          <StatsCard
            icon={<FaCheckCircle />}
            label="Aprobados"
            value={approvedCount}
            color="greencremona"
          />
          <StatsCard
            icon={<FaExclamationTriangle />}
            label="Desaprobados"
            value={unapprovedCount}
            color="redcremona"
          />
        </div>

        {/* Pagination Info */}
        <div className="border-t border-background4 bg-background3 px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div>
                Mostrando {startIndex + 1} a{" "}
                {Math.min(endIndex, sortedData.length)} de {sortedData.length}{" "}
                registros
                {typeof totalRecords === "number" &&
                  sortedData.length !== totalRecords &&
                  ` (filtrados de ${totalRecords} totales)`}
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="itemsPerPage" className="text-sm">
                  Filas por página:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="rounded-sm border border-background4 bg-background2 px-2 py-1 text-sm focus:border-bluecremona focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ExportDropdown
                rows={paginatedData}
                allRows={sortedData}
                columns={exportColumns}
              />
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-sm border border-background4 bg-background2 px-3 py-1 text-sm transition-colors hover:bg-background3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="mr-1 inline" />
                Anterior
              </button>
              <span className="px-3 py-1 text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-sm border border-background4 bg-background2 px-3 py-1 text-sm transition-colors hover:bg-background3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
                <FaChevronRight className="ml-1 inline" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <ApprovalTable
              data={paginatedData}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
