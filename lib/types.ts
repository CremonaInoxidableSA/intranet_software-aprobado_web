export interface SoftwareRecord {
  computadora: string
  ubicacion: string
  software: string
  version: string
  categoria: string
}

export interface SoftwareApprovalRecord extends SoftwareRecord {
  equipo: string
  aprobado: boolean
}

export interface DbConfig {
  host: string
  user: string
  password: string
  database: string
  port: number
}

export interface FilterParams {
  search?: string
  location?: string
  software?: string
  equipo?: string
  estado?: string
}

export interface SoftwareFilter {
  pattern: RegExp
  replacement: string
}

export interface SoftwareFiltersConfig {
  exclude: RegExp[]
  include?: RegExp[]
  force_exclude?: RegExp[]
  normalize: SoftwareFilter[]
}

export interface StatsData {
  total: number
  filtered: number
  approved?: number
  unapproved?: number
}

export interface ApprovedSoftwareEntry {
  area: string
  puesto: string
  software: string
}

export interface ApprovedSoftwareHierarchy {
  general: string[]
  areas: Map<string, string[]>
  puestos: Map<string, { area: string; software: string[] }>
  computadoras: Map<string, string[]>
}

export interface LocationData {
  ubicacion: string
}

export interface EquipoData {
  equipo: string
}

export interface SoftwareData {
  software: string
}

export interface User {
  id: number
  email: string
  username: string
  nombre: string
  apellido: string
  rol: "superadmin" | "admin" | "user"
  habilitado: boolean
  reporte: boolean
}

export interface UserSession {
  id: number
  email: string
  username: string
  nombre: string
  apellido: string
  rol: "superadmin" | "admin" | "user"
  habilitado: boolean
  reporte: boolean
}
