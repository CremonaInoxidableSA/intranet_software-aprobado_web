import mysql from "mysql2/promise"
import { DbConfig } from "./types"

let pool: mysql.Pool | null = null

export const dbConfig: DbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "glpi",
  port: parseInt(process.env.DB_PORT || "3306"),
}

async function ensureTablesExist(p: mysql.Pool): Promise<void> {
  const conn = await p.getConnection()
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS creminox_software_autorizado (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        software     VARCHAR(255) NOT NULL,
        area         VARCHAR(255) DEFAULT NULL,
        puesto       VARCHAR(255) DEFAULT NULL,
        computadora  VARCHAR(255) DEFAULT NULL,
        created_at   DATETIME    DEFAULT NOW(),
        INDEX idx_software    (software(191)),
        INDEX idx_area        (area(191)),
        INDEX idx_computadora (computadora(191))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    // Migración: agregar columna si la tabla ya existía sin ella
    try {
      await conn.execute(
        `ALTER TABLE creminox_software_autorizado ADD COLUMN computadora VARCHAR(255) DEFAULT NULL`
      )
      await conn.execute(
        `ALTER TABLE creminox_software_autorizado ADD INDEX idx_computadora (computadora(191))`
      )
    } catch {
      // La columna ya existe — ignorar el error
    }

    // Migración: ampliar ENUM de creminox_software_filters con force_exclude
    try {
      await conn.execute(
        `ALTER TABLE creminox_software_filters MODIFY COLUMN type ENUM('exclude','include','normalize','force_exclude') NOT NULL`
      )
    } catch {
      // Ya incluye el valor — ignorar el error
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS creminox_software_filters (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        type        ENUM('exclude','include','normalize','force_exclude') NOT NULL,
        pattern     VARCHAR(1000) NOT NULL,
        flags       VARCHAR(10) DEFAULT 'i',
        replacement VARCHAR(500) DEFAULT NULL,
        order_index INT DEFAULT 0,
        created_at  DATETIME DEFAULT NOW(),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  } finally {
    conn.release()
  }
}

export async function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })

    try {
      const connection = await pool.getConnection()
      connection.release()
      await ensureTablesExist(pool)
    } catch (error) {
      throw error
    }
  }

  return pool
}

export async function closeDbPool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
