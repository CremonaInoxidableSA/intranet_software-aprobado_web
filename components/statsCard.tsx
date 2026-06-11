"use client"
import { type ReactNode } from "react"

interface StatsCardProps {
  icon: ReactNode
  label: string
  value: number
  color: "bluecremona" | "purple" | "greencremona" | "redcremona"
}

const colorClasses = {
  bluecremona: "bg-bluecremona/20 text-bluecremona border-bluecremona/40",
  purple: "bg-bluecremona/20 text-bluecremona border-bluecremona/40",
  greencremona: "bg-greencremona/20 text-greencremona border-greencremona/40",
  redcremona: "bg-redcremona/20 text-redcremona border-redcremona/40",
}

export default function StatsCard({
  icon,
  label,
  value,
  color,
}: StatsCardProps) {
  return (
    <div className={`${colorClasses[color]} rounded-sm border p-6`}>
      <div className="mb-3 text-3xl">{icon}</div>
      <div className="mb-1 text-sm opacity-80">{label}</div>
      <div className="text-4xl font-bold">{(value ?? 0).toLocaleString()}</div>
    </div>
  )
}
