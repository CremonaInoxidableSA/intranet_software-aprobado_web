"use client"
import { type ReactNode } from "react"

interface FilterSelectProps {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export default function FilterSelect({
  id,
  label,
  icon,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex flex-row items-center text-sm font-medium"
      >
        <span className="mr-2">{icon}</span>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-background4 bg-background2 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-bluecremona focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
