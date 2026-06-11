"use client"
import { FaSearch, FaTimes } from "react-icons/fa"

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
}

export default function SearchBox({
  value,
  onChange,
  onClear,
  placeholder = "Buscar...",
}: SearchBoxProps) {
  return (
    <div className="relative mx-auto max-w-2xl">
      <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-background4 bg-background2 py-3 pr-12 pl-12 focus:border-transparent focus:ring-2 focus:ring-bluecremona focus:outline-none"
      />
      {value && (
        <button
          onClick={onClear}
          title="Limpiar búsqueda"
          className="hover: absolute top-1/2 right-3 -translate-y-1/2 transform p-1"
        >
          <FaTimes />
        </button>
      )}
    </div>
  )
}
