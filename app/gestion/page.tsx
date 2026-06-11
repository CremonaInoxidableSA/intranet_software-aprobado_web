"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  FaTimes,
  FaDownload,
  FaUpload,
  FaPlusCircle,
  FaSyncAlt,
  FaChevronRight,
  FaChevronDown,
  FaGlobe,
  FaBuilding,
  FaUser,
  FaDesktop,
  FaInbox,
  FaExclamationTriangle,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa"
import LoadingSpinner from "@/components/loadingSpinner"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AutorizadoRecord {
  id: number
  software: string
  area: string | null
  puesto: string | null
  computadora: string | null
  created_at: string
}

interface Grouped {
  general: AutorizadoRecord[]
  areas: Map<
    string,
    { direct: AutorizadoRecord[]; puestos: Map<string, AutorizadoRecord[]> }
  >
  computadoras: Map<string, AutorizadoRecord[]>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupRecords(records: AutorizadoRecord[]): Grouped {
  const general: AutorizadoRecord[] = []
  const areas = new Map<
    string,
    { direct: AutorizadoRecord[]; puestos: Map<string, AutorizadoRecord[]> }
  >()
  const computadoras = new Map<string, AutorizadoRecord[]>()

  for (const r of records) {
    if (r.computadora) {
      if (!computadoras.has(r.computadora)) computadoras.set(r.computadora, [])
      computadoras.get(r.computadora)!.push(r)
    } else if (!r.area) {
      general.push(r)
    } else {
      if (!areas.has(r.area))
        areas.set(r.area, { direct: [], puestos: new Map() })
      const g = areas.get(r.area)!
      if (!r.puesto) {
        g.direct.push(r)
      } else {
        if (!g.puestos.has(r.puesto)) g.puestos.set(r.puesto, [])
        g.puestos.get(r.puesto)!.push(r)
      }
    }
  }
  return { general, areas, computadoras }
}

// ─── Sub-componente: lista de items ──────────────────────────────────────────

function ItemList({
  items,
  confirmDelete,
  onConfirmDelete,
  onDelete,
}: {
  items: AutorizadoRecord[]
  confirmDelete: number | null
  onConfirmDelete: (id: number | null) => void
  onDelete: (id: number) => Promise<void>
}) {
  if (items.length === 0) return null
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex items-center justify-between gap-2 rounded bg-background3 px-3 py-1.5 transition-colors hover:bg-background4"
        >
          <span className="truncate text-sm">{item.software}</span>

          {confirmDelete === item.id ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs">¿Eliminar?</span>
              <button
                onClick={() => onConfirmDelete(null)}
                className="rounded border border-bluecremona bg-bluecremona/20 px-2 py-0.5 text-xs text-bluecremona transition-colors hover:bg-bluecremona/40"
              >
                Cancelar
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded border border-redcremona/40 bg-redcremona/20 px-2 py-0.5 text-xs text-redcremona transition-colors hover:bg-redcremona/30"
              >
                Confirmar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConfirmDelete(item.id)}
              className="shrink-0 px-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-redcremona"
              title="Eliminar"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GestionPage() {
  const [records, setRecords] = useState<AutorizadoRecord[]>([])
  const [softwareList, setSoftwareList] = useState<string[]>([])
  const [loadingSoftwareList, setLoadingSoftwareList] = useState(false)

  const reloadSoftwareList = useCallback(async () => {
    setLoadingSoftwareList(true)
    try {
      const d = await fetch("/api/softwares").then((r) => r.json())
      if (Array.isArray(d))
        setSoftwareList(d.map((x: { software: string }) => x.software))
    } catch {
    } finally {
      setLoadingSoftwareList(false)
    }
  }, [])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Formulario
  const [nivel, setNivel] = useState<"general" | "area" | "puesto" | "pc">(
    "general"
  )
  const [fSoftware, setFSoftware] = useState("")
  const [fArea, setFArea] = useState("")
  const [fPuesto, setFPuesto] = useState("")
  const [fComputadora, setFComputadora] = useState("")
  const [equipoList, setEquipoList] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<{
    type: "ok" | "err"
    text: string
  } | null>(null)

  // UI
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // Backup (export / import)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{
    type: "ok" | "err"
    text: string
  } | null>(null)
  const [confirmImport, setConfirmImport] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/autorizado")
      const json = await res.json()
      if (res.ok) {
        setRecords(json.data ?? [])
      } else {
        setLoadError(json.error ?? "Error al cargar registros.")
      }
    } catch (e) {
      setLoadError(String(e))
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await Promise.all([
        loadRecords(),
        fetch("/api/softwares")
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d))
              setSoftwareList(d.map((x: { software: string }) => x.software))
          })
          .catch(() => {}),
        fetch("/api/equipos")
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d))
              setEquipoList(d.map((x: { equipo: string }) => x.equipo))
          })
          .catch(() => {}),
      ])
      setLoading(false)
    })()
  }, [loadRecords])

  // ── UI helpers ──────────────────────────────────────────────────────────────

  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  const existingAreas = Array.from(
    new Set(records.filter((r) => r.area).map((r) => r.area!))
  ).sort()

  const existingPuestos = fArea
    ? Array.from(
        new Set(
          records
            .filter((r) => r.area === fArea && r.puesto)
            .map((r) => r.puesto!)
        )
      ).sort()
    : []

  // ── Agregar ─────────────────────────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormMsg(null)

    const body = {
      software: fSoftware.trim(),
      area:
        nivel === "area" || nivel === "puesto" ? fArea.trim() || null : null,
      puesto: nivel === "puesto" ? fPuesto.trim() || null : null,
      computadora: nivel === "pc" ? fComputadora.trim() || null : null,
    }

    if (!body.software)
      return setFormMsg({ type: "err", text: "El software es requerido." })
    if ((nivel === "area" || nivel === "puesto") && !body.area)
      return setFormMsg({ type: "err", text: "El área es requerida." })
    if (nivel === "puesto" && !body.puesto)
      return setFormMsg({ type: "err", text: "El puesto es requerido." })
    if (nivel === "pc" && !body.computadora)
      return setFormMsg({
        type: "err",
        text: "El nombre de la PC es requerido.",
      })

    setSubmitting(true)
    try {
      const res = await fetch("/api/autorizado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setFormMsg({ type: "ok", text: `"${body.software}" agregado.` })
        setFSoftware("")
        setFArea("")
        setFPuesto("")
        setFComputadora("")
        await loadRecords()
      } else {
        setFormMsg({ type: "err", text: json.error ?? "Error al agregar." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    await fetch(`/api/autorizado/${id}`, { method: "DELETE" })
    setConfirmDelete(null)
    await loadRecords()
  }

  // ── Exportar backup ─────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/autorizado/export")
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const date = new Date().toISOString().slice(0, 10)
      a.download = `software-autorizado-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // ── Importar backup ─────────────────────────────────────────────────────────

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImportFile(file)
    setConfirmImport(true)
    e.target.value = ""
  }

  const handleImportConfirm = async () => {
    if (!pendingImportFile) return
    setConfirmImport(false)
    setImporting(true)
    setImportMsg(null)
    try {
      const text = await pendingImportFile.text()
      const json = JSON.parse(text)
      const res = await fetch("/api/autorizado/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      })
      const result = await res.json()
      if (res.ok) {
        setImportMsg({
          type: "ok",
          text: `Importación exitosa: ${result.imported} registros restaurados.`,
        })
        await loadRecords()
      } else {
        setImportMsg({
          type: "err",
          text: result.error ?? "Error al importar.",
        })
      }
    } catch (e) {
      setImportMsg({
        type: "err",
        text: `Error al leer el archivo: ${String(e)}`,
      })
    } finally {
      setImporting(false)
      setPendingImportFile(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
        <LoadingSpinner />
      </main>
    )

  if (loadError)
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-redcremona">{loadError}</p>
      </main>
    )

  const { general, areas, computadoras } = groupRecords(records)
  const sortedAreas = Array.from(areas.keys()).sort()
  const sortedPCs = Array.from(computadoras.keys()).sort()

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Gestión de Software Autorizado</h1>
          <p className="mt-1 text-sm opacity-70">
            {records.length} registros en la base de datos
          </p>
        </div>

        {/* ── Backup ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="hover: flex items-center gap-2 rounded border border-background4 bg-background2 px-4 py-2 text-sm transition-colors hover:bg-background3 disabled:opacity-50"
          >
            <FaDownload className="text-xs" />
            {exporting ? "Exportando..." : "Exportar backup"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="hover: flex items-center gap-2 rounded border border-background4 bg-background2 px-4 py-2 text-sm transition-colors hover:bg-background3 disabled:opacity-50"
          >
            <FaUpload className="text-xs" />
            {importing ? "Importando..." : "Importar backup"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFileSelect}
          />

          {importMsg && (
            <p
              className={`text-sm ${
                importMsg.type === "ok"
                  ? "text-greencremona"
                  : "text-redcremona"
              }`}
            >
              {importMsg.type === "ok" ? (
                <FaCheckCircle className="mr-1 inline" />
              ) : (
                <FaExclamationCircle className="mr-1 inline" />
              )}
              {importMsg.text}
            </p>
          )}
        </div>

        {/* ── Formulario de agregar ─────────────────────────────────────── */}
        <div className="mb-6 rounded-sm border border-background4 bg-background2 p-5">
          <h2 className="mb-4 flex flex-row items-center font-semibold">
            <FaPlusCircle className="mr-2 items-center justify-center text-greencremona" />
            Agregar nuevo registro
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            {/* Nivel */}
            <div>
              <p className="mb-2 text-xs opacity-70">Nivel de aplicación</p>
              <div className="flex flex-wrap gap-2">
                {(["general", "area", "puesto", "pc"] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setNivel(n)
                      setFormMsg(null)
                    }}
                    className={`rounded border px-4 py-1.5 text-sm transition-colors ${
                      nivel === n
                        ? "border-bluecremona/40 bg-bluecremona/20 text-bluecremona"
                        : "hover: border-background4 bg-background3"
                    }`}
                  >
                    {n === "general"
                      ? "General"
                      : n === "area"
                        ? "Por Departamento"
                        : n === "puesto"
                          ? "Por Puesto"
                          : "Por PC"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs opacity-70">
                {nivel === "general" &&
                  "El software aplica a todos los equipos y ubicaciones."}
                {nivel === "area" &&
                  "El software aplica a todos los equipos de un departamento/sector."}
                {nivel === "puesto" &&
                  "El software aplica a un puesto específico dentro de un departamento."}
                {nivel === "pc" &&
                  "El software aplica a una PC específica por nombre de equipo."}
              </p>
            </div>

            {/* Campos */}
            <div
              className={`grid gap-3 ${
                nivel === "puesto"
                  ? "grid-cols-1 sm:grid-cols-3"
                  : nivel === "area"
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {/* Software */}
              <div>
                <label className="mb-1 flex items-center justify-between text-xs">
                  Software
                  <button
                    type="button"
                    onClick={reloadSoftwareList}
                    disabled={loadingSoftwareList}
                    title="Recargar lista de software (aplica filtros actuales)"
                    className="text-xs transition-colors hover:text-bluecremona disabled:opacity-50"
                  >
                    <FaSyncAlt
                      className={loadingSoftwareList ? "animate-spin" : ""}
                    />
                  </button>
                </label>
                <input
                  list="sw-datalist"
                  value={fSoftware}
                  onChange={(e) => setFSoftware(e.target.value)}
                  placeholder="Nombre del software..."
                  className="w-full rounded border border-background4 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-bluecremona/40 focus:outline-none"
                />
                <datalist id="sw-datalist">
                  {softwareList.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* PC */}
              {nivel === "pc" && (
                <div>
                  <label className="mb-1 block text-xs">Nombre de PC</label>
                  <input
                    list="pc-datalist"
                    value={fComputadora}
                    onChange={(e) => setFComputadora(e.target.value)}
                    placeholder="Nombre exacto del equipo..."
                    className="w-full rounded border border-background4 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-bluecremona/40 focus:outline-none"
                  />
                  <datalist id="pc-datalist">
                    {equipoList.map((e) => (
                      <option key={e} value={e} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* Área */}
              {(nivel === "area" || nivel === "puesto") && (
                <div>
                  <label className="mb-1 block text-xs">Departamento</label>
                  <input
                    list="area-datalist"
                    value={fArea}
                    onChange={(e) => setFArea(e.target.value)}
                    placeholder="Nombre del departamento..."
                    className="w-full rounded border border-background4 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-bluecremona/40 focus:outline-none"
                  />
                  <datalist id="area-datalist">
                    {existingAreas.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* Puesto */}
              {nivel === "puesto" && (
                <div>
                  <label className="mb-1 block text-xs">Puesto</label>
                  <input
                    list="puesto-datalist"
                    value={fPuesto}
                    onChange={(e) => setFPuesto(e.target.value)}
                    placeholder="Nombre del puesto..."
                    className="w-full rounded border border-background4 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-bluecremona/40 focus:outline-none"
                  />
                  <datalist id="puesto-datalist">
                    {existingPuestos.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>

            {/* Mensaje + botón */}
            <div className="flex items-center gap-4">
              {formMsg && (
                <p
                  className={`text-sm ${
                    formMsg.type === "ok"
                      ? "text-greencremona"
                      : "text-redcremona"
                  }`}
                >
                  {formMsg.type === "ok" ? (
                    <FaCheckCircle className="mr-1 inline" />
                  ) : (
                    <FaExclamationCircle className="mr-1 inline" />
                  )}
                  {formMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="ml-auto shrink-0 rounded border border-greencremona/40 bg-greencremona/20 px-5 py-2 text-sm text-greencremona transition-colors hover:bg-greencremona/30 disabled:opacity-50"
              >
                {submitting ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Árbol de registros ────────────────────────────────────────── */}
        <div className="space-y-2">
          {/* General */}
          {general.length > 0 && (
            <div className="overflow-hidden rounded-sm border border-background4 bg-background2">
              <button
                onClick={() => toggleSection("__general__")}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-background3"
              >
                {collapsed.has("__general__") ? (
                  <FaChevronRight className="w-3 text-xs" />
                ) : (
                  <FaChevronDown className="w-3 text-xs" />
                )}
                <FaGlobe className="text-sm text-bluecremona" />
                <span className="font-semibold">General</span>
                <span className="ml-1 text-xs opacity-70">
                  — aplica a todos
                </span>
                <span className="ml-auto rounded-full bg-background3 px-2 py-0.5 text-xs">
                  {general.length}
                </span>
              </button>
              {!collapsed.has("__general__") && (
                <div className="px-5 pt-1 pb-4">
                  <ItemList
                    items={general}
                    confirmDelete={confirmDelete}
                    onConfirmDelete={setConfirmDelete}
                    onDelete={handleDelete}
                  />
                </div>
              )}
            </div>
          )}

          {/* Por área */}
          {sortedAreas.map((areaName) => {
            const g = areas.get(areaName)!
            const sortedPuestos = Array.from(g.puestos.keys()).sort()
            const areaKey = `area::${areaName}`
            const total =
              g.direct.length +
              Array.from(g.puestos.values()).reduce((s, v) => s + v.length, 0)

            return (
              <div
                key={areaName}
                className="overflow-hidden rounded-sm border border-background4 bg-background2"
              >
                {/* Cabecera de área */}
                <button
                  onClick={() => toggleSection(areaKey)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-background3"
                >
                  {collapsed.has(areaKey) ? (
                    <FaChevronRight className="w-3 text-xs" />
                  ) : (
                    <FaChevronDown className="w-3 text-xs" />
                  )}
                  <FaBuilding className="text-orange text-sm" />
                  <span className="font-semibold">{areaName}</span>
                  <span className="ml-auto rounded-full bg-background3 px-2 py-0.5 text-xs">
                    {total}
                  </span>
                </button>

                {!collapsed.has(areaKey) && (
                  <div className="space-y-3 px-5 pt-1 pb-4">
                    {/* Software directo del área */}
                    {g.direct.length > 0 && (
                      <ItemList
                        items={g.direct}
                        confirmDelete={confirmDelete}
                        onConfirmDelete={setConfirmDelete}
                        onDelete={handleDelete}
                      />
                    )}

                    {/* Puestos */}
                    {sortedPuestos.map((puestoName) => {
                      const pKey = `puesto::${areaName}::${puestoName}`
                      const pItems = g.puestos.get(puestoName)!
                      return (
                        <div
                          key={puestoName}
                          className="ml-4 border-l-2 border-background4 pl-4"
                        >
                          <button
                            onClick={() => toggleSection(pKey)}
                            className="hover: mb-2 flex items-center gap-2 text-sm transition-colors"
                          >
                            {collapsed.has(pKey) ? (
                              <FaChevronRight className="w-3 text-xs" />
                            ) : (
                              <FaChevronDown className="w-3 text-xs" />
                            )}
                            <FaUser className="text-xs text-bluecremona/70" />
                            <span>{puestoName}</span>
                            <span className="text-xs opacity-60">
                              ({pItems.length})
                            </span>
                          </button>
                          {!collapsed.has(pKey) && (
                            <ItemList
                              items={pItems}
                              confirmDelete={confirmDelete}
                              onConfirmDelete={setConfirmDelete}
                              onDelete={handleDelete}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Por PC */}
          {sortedPCs.map((pcName) => {
            const pcKey = `pc::${pcName}`
            const pcItems = computadoras.get(pcName)!
            return (
              <div
                key={pcName}
                className="overflow-hidden rounded-sm border border-background4 bg-background2"
              >
                <button
                  onClick={() => toggleSection(pcKey)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-background3"
                >
                  {collapsed.has(pcKey) ? (
                    <FaChevronRight className="w-3 text-xs" />
                  ) : (
                    <FaChevronDown className="w-3 text-xs" />
                  )}
                  <FaDesktop className="text-sm text-greencremona" />
                  <span className="font-semibold">{pcName}</span>
                  <span className="ml-1 text-xs">— por PC</span>
                  <span className="ml-auto rounded-full bg-background3 px-2 py-0.5 text-xs">
                    {pcItems.length}
                  </span>
                </button>
                {!collapsed.has(pcKey) && (
                  <div className="px-5 pt-1 pb-4">
                    <ItemList
                      items={pcItems}
                      confirmDelete={confirmDelete}
                      onConfirmDelete={setConfirmDelete}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {records.length === 0 && (
            <div className="py-16 text-center">
              <FaInbox className="mb-3 block text-4xl opacity-30" />
              <p className="text-sm">No hay registros.</p>
              <p className="mt-1 text-xs opacity-60">
                Agrega uno manualmente o migrá el Excel desde{" "}
                <code className="rounded bg-background3 px-1">
                  POST /api/autorizado/migrate
                </code>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de confirmación de importación ──────────────────────── */}
      {confirmImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-sm border border-background4 bg-background2 p-6 shadow-xl">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <FaExclamationTriangle className="text-orange" />
              Confirmar importación
            </h3>
            <p className="mb-4 text-sm">
              Esta acción{" "}
              <strong className="">
                reemplazará todos los registros actuales
              </strong>{" "}
              con los del archivo{" "}
              <code className="rounded bg-background3 px-1 text-xs">
                {pendingImportFile?.name}
              </code>
              . Esta operación no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmImport(false)
                  setPendingImportFile(null)
                }}
                className="hover: rounded border border-background4 px-4 py-2 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportConfirm}
                className="rounded border border-redcremona/40 bg-redcremona/20 px-4 py-2 text-sm text-redcremona transition-colors hover:bg-redcremona/30"
              >
                Importar y reemplazar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
