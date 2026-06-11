"use client"
import { FaSpinner } from "react-icons/fa"

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <FaSpinner className="mb-4 animate-spin text-5xl text-bluecremona" />
      <span className="text-lg">Cargando datos...</span>
    </div>
  )
}
