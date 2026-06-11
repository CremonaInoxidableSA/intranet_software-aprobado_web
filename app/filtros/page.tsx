"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FaPencilAlt,
  FaTrash,
  FaPlus,
  FaDownload,
  FaSpinner,
  FaUpload,
} from "react-icons/fa"
import LoadingSpinner from "@/components/loadingSpinner"

// ─── Tipos ───────────────────────────────────────────────────────────────────

type FilterType = "exclude" | "include" | "normalize" | "force_exclude"

interface FilterRecord {
  id: number
  type: FilterType
  pattern: string
  flags: string
  replacement: string | null
  order_index: number
}

// ─── Componente de fila de filtro ────────────────────────────────────────────

function FilterRow({
  record,
  onDelete,
  onSave,
}: {
  record: FilterRecord
  onDelete: (id: number) => Promise<void>
  onSave: (
    id: number,
    pattern: string,
    flags: string,
    replacement: string | null
  ) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [pattern, setPattern] = useState(record.pattern)
  const [flags, setFlags] = useState(record.flags)
  const [replacement, setReplacement] = useState(record.replacement ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(
        record.id,
        pattern,
        flags,
        record.type === "normalize" ? replacement : null
      )
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded bg-background4 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-background6 bg-background px-2 py-1 font-mono text-sm"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Patrón regex"
            autoFocus
          />
          <input
            className="w-16 rounded border border-background6 bg-background px-2 py-1 font-mono text-sm"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="flags"
          />
          {record.type === "normalize" && (
            <input
              className="min-w-0 flex-1 rounded border border-background6 bg-background px-2 py-1 font-mono text-sm"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Reemplazo (ej: $1)"
            />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="rounded bg-background3 px-3 py-1 text-xs transition-colors hover:bg-background5"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-bluecremona px-3 py-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 rounded bg-background3 px-3 py-1.5 transition-colors hover:bg-background4">
      <code className="flex-1 truncate font-mono text-xs">
        /{record.pattern}/{record.flags}
        {record.replacement !== null && (
          <span className="ml-2 text-greencremona">→ {record.replacement}</span>
        )}
      </code>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="rounded bg-background5 px-2 py-0.5 text-xs transition-colors hover:bg-background6"
          title="Editar"
        >
          <FaPencilAlt />
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded bg-background5 px-2 py-0.5 text-xs transition-colors hover:bg-background6"
            >
              Cancelar
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="rounded bg-redcremona px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
            >
              Confirmar
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="hover: rounded bg-background5 px-2 py-0.5 text-xs transition-colors hover:bg-redcremona"
            title="Eliminar"
          >
            <FaTrash />
          </button>
        )}
      </div>
    </li>
  )
}

// ─── Formulario de nuevo filtro ───────────────────────────────────────────────

function AddFilterForm({
  type,
  onAdd,
}: {
  type: FilterType
  onAdd: (
    pattern: string,
    flags: string,
    replacement: string | null
  ) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("i")
  const [replacement, setReplacement] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!pattern.trim()) {
      setError("El patrón no puede estar vacío")
      return
    }
    try {
      new RegExp(pattern, flags)
    } catch {
      setError("Expresión regular inválida")
      return
    }
    if (type === "normalize" && !replacement.trim()) {
      setError("El reemplazo es obligatorio para reglas de normalización")
      return
    }
    setLoading(true)
    try {
      await onAdd(
        pattern.trim(),
        flags.trim() || "i",
        type === "normalize" ? replacement : null
      )
      setPattern("")
      setFlags("i")
      setReplacement("")
      setOpen(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-background6 px-3 py-1.5 text-xs transition-colors hover:border-bluecremona hover:text-bluecremona"
      >
        <FaPlus className="mr-1 inline" /> Agregar regla
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 rounded border border-background5 bg-background3 p-3"
    >
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-0 flex-1 rounded border border-background6 bg-background px-2 py-1.5 font-mono text-sm"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Patrón regex (ej: ^Microsoft)"
          autoFocus
        />
        <input
          className="w-16 rounded border border-background6 bg-background px-2 py-1.5 font-mono text-sm"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="flags"
          title="Flags (ej: i, gi)"
        />
        {type === "normalize" && (
          <input
            className="min-w-0 flex-1 rounded border border-background6 bg-background px-2 py-1.5 font-mono text-sm"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="Reemplazo (ej: $1 o nombre fijo)"
          />
        )}
      </div>
      {error && <p className="text-xs text-redcremona">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError("")
          }}
          className="rounded bg-background4 px-3 py-1 text-xs transition-colors hover:bg-background5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-bluecremona px-3 py-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Agregando…" : "Agregar"}
        </button>
      </div>
    </form>
  )
}

// ─── Guía de referencia ───────────────────────────────────────────────────────

function GuiaReferencia() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row xl:sticky xl:top-18 xl:shrink-0 xl:self-start">
      {/* Columna izquierda de guía */}
      <aside className="flex flex-1 flex-col gap-4 text-sm sm:w-72">
        {/* Tipos de filtro */}
        <div className="overflow-hidden rounded-sm border border-background4 bg-background2">
          <div className="border-b border-background4 bg-background3 px-3 py-2">
            <span className="text-base font-semibold">Tipos de filtro</span>
          </div>
          <div className="divide-y divide-background4">
            <div className="space-y-1 px-3 py-2.5">
              <p className="font-medium text-redcremona">Excluir</p>
              <p>
                El software que coincida con el patrón <em>no aparece</em> en
                los reportes.
              </p>
            </div>
            <div className="space-y-1 px-3 py-2.5">
              <p className="font-medium text-bluecremona">
                Incluir (excepciones)
              </p>
              <p>
                Si un software fue excluido pero también coincide aquí,{" "}
                <em>vuelve a aparecer</em>. Tiene prioridad sobre Excluir.
              </p>
            </div>
            <div className="space-y-1 px-3 py-2.5">
              <p className="text-orange font-medium">Excluir siempre</p>
              <p>
                Exclusión forzada: el software <em>nunca aparece</em>, aunque
                una regla de Incluir lo rescataría. Tiene prioridad sobre
                Incluir.
              </p>
            </div>
            <div className="space-y-1 px-3 py-2.5">
              <p className="font-medium text-greencremona">Normalizar</p>
              <p>
                Renombra el software: el patrón captura el nombre original y el
                reemplazo define cómo se mostrará.
              </p>
            </div>
          </div>
        </div>

        {/* Reemplazos */}
        <div className="overflow-hidden rounded-sm border border-background4 bg-background2">
          <div className="border-b border-background4 bg-background3 px-3 py-2">
            <span className="text-base font-semibold">
              Reemplazos{" "}
              <span className="text-sm font-normal">(Normalizar)</span>
            </span>
          </div>
          <div className="divide-y divide-background4">
            {[
              {
                token: "$1",
                desc: "Lo capturado por el primer grupo ( ) del patrón",
              },
              {
                token: "$2",
                desc: "Segundo grupo capturado, y así sucesivamente",
              },
              {
                token: "Texto fijo",
                desc: "Escribe el nombre tal cual, sin usar grupos",
              },
            ].map(({ token, desc }) => (
              <div key={token} className="flex flex-col gap-1 px-3 py-2">
                <code
                  className="self-start rounded bg-background3 px-1 font-mono text-sm text-greencremona"
                  style={{ fontVariantLigatures: "none" }}
                >
                  {token}
                </code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-background4 bg-background3/50 px-3 py-2.5">
            <p className="font-medium">Ejemplo</p>
            <p>
              Patrón:{" "}
              <code className="text-orange rounded bg-background3 px-1 font-mono text-sm">
                ^(Adobe Acrobat).*$
              </code>
            </p>
            <p>
              Reemplazo:{" "}
              <code className="rounded bg-background3 px-1 font-mono text-sm text-greencremona">
                $1
              </code>
            </p>
            <p className="mt-1">
              «Adobe Acrobat DC 2024» →{" "}
              <strong className="">«Adobe Acrobat»</strong>
            </p>
          </div>
        </div>
      </aside>

      {/* Columna derecha de guía */}
      <aside className="flex flex-1 flex-col gap-4 text-sm sm:w-72">
        {/* Sintaxis de patrones */}
        <div className="overflow-hidden rounded-sm border border-background4 bg-background2">
          <div className="border-b border-background4 bg-background3 px-3 py-2">
            <span className="text-base font-semibold">
              Sintaxis de patrones
            </span>
          </div>
          <div className="divide-y divide-background4">
            {[
              { token: "^texto", desc: "El nombre empieza con «texto»" },
              { token: "texto$", desc: "El nombre termina con «texto»" },
              { token: ".*", desc: "Cualquier cantidad de caracteres" },
              { token: ".+", desc: "Al menos un carácter cualquiera" },
              { token: "\\d+", desc: "Uno o más dígitos (0-9)" },
              { token: "(A|B)", desc: "«A» o «B»" },
              { token: "\\b", desc: "Límite de palabra (inicio/fin)" },
              { token: "(?:...)", desc: "Agrupa sin capturar" },
              {
                token: "(grupo)",
                desc: "Agrupa y captura para usar con $1, $2…",
              },
            ].map(({ token, desc }) => (
              <div key={token} className="flex flex-col gap-1 px-3 py-2">
                <code
                  className="text-orange self-start rounded bg-background3 px-1 font-mono text-sm"
                  style={{ fontVariantLigatures: "none" }}
                >
                  {token}
                </code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="overflow-hidden rounded-sm border border-background4 bg-background2">
          <div className="border-b border-background4 bg-background3 px-3 py-2">
            <span className="text-base font-semibold">Flags</span>
          </div>
          <div className="divide-y divide-background4">
            {[
              {
                token: "i",
                desc: "Ignora mayúsculas/minúsculas (recomendado)",
              },
              {
                token: "g",
                desc: "Aplica el reemplazo en todas las ocurrencias (solo Normalizar)",
              },
              { token: "gi", desc: "Combinación de ambas" },
            ].map(({ token, desc }) => (
              <div key={token} className="flex flex-col gap-1 px-3 py-2">
                <code
                  className="text-orange self-start rounded bg-background3 px-1 font-mono text-sm"
                  style={{ fontVariantLigatures: "none" }}
                >
                  {token}
                </code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TAB_LABELS: Record<FilterType, string> = {
  exclude: "Excluir",
  include: "Incluir (excepciones)",
  normalize: "Normalizar",
  force_exclude: "Excluir siempre",
}

const TAB_DESCRIPTIONS: Record<FilterType, string> = {
  exclude: "Software cuyo nombre coincida será ignorado en los reportes.",
  include:
    "Excepciones: aunque coincida con un patrón de exclusión, este software se mantiene.",
  normalize:
    "Renombra el software: el patrón captura el nombre original y el reemplazo define el nombre final.",
  force_exclude:
    "Exclusión forzada: este software siempre se filtra, aunque coincida con una regla de Incluir.",
}

export default function FiltrosPage() {
  const [records, setRecords] = useState<FilterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterType>("exclude")
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)

  const fetchFilters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/filters")
      const data = await res.json()
      setRecords(data)
    } catch {
      setError("Error cargando filtros")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  async function handleDelete(id: number) {
    await fetch(`/api/filters/${id}`, { method: "DELETE" })
    await fetchFilters()
  }

  async function handleSave(
    id: number,
    pattern: string,
    flags: string,
    replacement: string | null
  ) {
    await fetch(`/api/filters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, flags, replacement }),
    })
    await fetchFilters()
  }

  async function handleAdd(
    pattern: string,
    flags: string,
    replacement: string | null
  ) {
    const res = await fetch("/api/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeTab, pattern, flags, replacement }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Error al agregar")
    }
    await fetchFilters()
  }

  async function handleReset() {
    setResetting(true)
    try {
      await fetch("/api/filters/reset", { method: "POST" })
      await fetchFilters()
      setConfirmReset(false)
    } finally {
      setResetting(false)
    }
  }

  function handleExport() {
    window.open("/api/filters/export", "_blank")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError("")
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch("/api/filters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "Error al importar")
        return
      }
      await fetchFilters()
    } catch {
      setError("El archivo no es un JSON válido")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const filtered = records
    .filter((r) => r.type === activeTab)
    .sort((a, b) => {
      const aKey =
        activeTab === "normalize" ? (a.replacement ?? a.pattern) : a.pattern
      const bKey =
        activeTab === "normalize" ? (b.replacement ?? b.pattern) : b.pattern
      return aKey.localeCompare(bKey, undefined, { sensitivity: "base" })
    })

  return (
    <div className="flex w-full max-w-screen flex-col gap-6 p-4 sm:p-6 xl:flex-row xl:items-start">
      {/* Columna principal */}
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Encabezado */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Filtros de Software</h1>
            <p className="mt-1 text-sm">
              Define qué software se excluye, incluye o normaliza en los
              reportes. Los cambios se aplican de inmediato sin necesidad de
              reiniciar.
            </p>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs">¿Eliminar todos los filtros?</span>
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded bg-background3 px-3 py-1.5 text-xs transition-colors hover:bg-background5"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded bg-redcremona px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {resetting ? "Restaurando…" : "Confirmar"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex shrink-0 flex-row items-center rounded border border-background5 bg-background3 px-4 py-2 text-sm transition-colors hover:bg-background5"
            >
              <FaTrash className="mr-2" />
              Limpiar todos los filtros
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-end border-b border-background4">
          <div className="flex min-w-0 flex-1 flex-wrap">
            {(
              [
                "exclude",
                "include",
                "normalize",
                "force_exclude",
              ] as FilterType[]
            ).map((tab) => {
              const count = records.filter((r) => r.type === tab).length
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "border-bluecremona text-bluecremona"
                      : "hover: border-transparent"
                  }`}
                >
                  {TAB_LABELS[tab]}
                  <span className="ml-1.5 rounded-full bg-background3 px-1.5 py-0.5 text-xs">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Botones exportar / importar */}
          <div className="flex shrink-0 items-center gap-1 pb-1 pl-2">
            <button
              onClick={handleExport}
              title="Exportar filtros"
              className="flex items-center gap-1.5 rounded border border-background5 bg-background3 px-3 py-1.5 text-xs transition-colors hover:bg-background5"
            >
              <FaDownload />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <label
              title="Importar filtros"
              className={`flex cursor-pointer items-center gap-1.5 rounded border border-background5 bg-background3 px-3 py-1.5 text-xs transition-colors hover:bg-background5 ${importing ? "pointer-events-none opacity-50" : ""}`}
            >
              {importing ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaUpload />
              )}
              <span className="hidden sm:inline">
                {importing ? "Importando…" : "Importar"}
              </span>
              <input
                type="file"
                accept=".json"
                className="sr-only"
                onChange={handleImport}
                disabled={importing}
              />
            </label>
          </div>
        </div>

        {/* Contenido del tab */}
        <div>
          <p className="mb-3 text-xs">{TAB_DESCRIPTIONS[activeTab]}</p>

          {error && (
            <div className="mb-4 rounded border border-redcremona bg-redcremona/10 p-3 text-sm text-redcremona">
              {error}
            </div>
          )}

          <AddFilterForm type={activeTab} onAdd={handleAdd} />

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm italic">
              No hay reglas de tipo &ldquo;{TAB_LABELS[activeTab]}&rdquo;.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {filtered.map((record) => (
                <FilterRow
                  key={record.id}
                  record={record}
                  onDelete={handleDelete}
                  onSave={handleSave}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Guía lateral sticky */}
      <GuiaReferencia />
    </div>
  )
}
