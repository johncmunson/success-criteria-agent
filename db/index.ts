import ws from "ws"
import { Pool as PgPool } from "pg"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
import { getEnvVar } from "@/lib/utils"
import * as schema from "./schema"

import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { NeonDatabase } from "drizzle-orm/neon-serverless"

/**
 * Summary
 * Unified Drizzle ORM + Postgres/Neon database pooling setup for consistent prod/dev/test behavior
 * in Next.js with HMR-safe dev handling
 *
 * Objectives
 * - Maintain strong parity across prod/dev/test while optimizing for each environment’s constraints.
 * - Use a single DATABASE_URL everywhere and consistent tuning knobs.
 *
 * Environments
 * - Production: Neon with client-side pooling over WebSockets.
 *   - Uses @neondatabase/serverless Pool + WebSocket transport (neonConfig.webSocketConstructor = ws).
 *   - Requires a direct Neon URL (no "-pooler") to avoid double pooling; we assert this at startup.
 *   - Drizzle driver: drizzle-orm/neon-serverless.
 * - Development/Test: Local Postgres via node-postgres.
 *   - Uses pg.Pool to mirror pooled behavior in production.
 *   - Drizzle driver: drizzle-orm/node-postgres.
 *
 * Parity choices
 * - All environments construct a Pool and bind Drizzle to that Pool; only the driver/transport differs.
 * - Pool tuning is uniform:
 *     DB_MAX_CONNECTIONS  -> pool.max
 *     DB_IDLE_TIMEOUT_MS  -> pool.idleTimeoutMillis
 * - One DATABASE_URL; no env-specific variable sprawl.
 *
 * Vercel Fluid Compute / Next.js specifics
 * - We keep the pool at module scope. In production, warm containers reuse it across invocations.
 * - No need to create a new pool/connection for each request, as used to be common in edge/serverless,
 *   thanks to Vercel's Fluid Compute model.
 * - In development, a globalThis guard preserves a single pool across HMR to prevent leaks and
 *   avoid spawning new pools on every file change.
 *
 * Testing
 * - Run Vitest migrations once in a setup file.
 * - Tests use a tiny pg.Pool (e.g., max=1) for stability and isolation.
 * - Use closePool() in afterAll to ensure clean shutdown.
 * - Vitest integration testing config for strong isolation and no shared state:
 * - { test: { pool: 'forks', fileParalellism: false, isolate: true, maxWorkers: 1, minWorkers: 1 } }
 */

type AnyPool = PgPool | NeonPool
type AnyDb = NodePgDatabase<typeof schema> | NeonDatabase<typeof schema>

const nodeEnv = getEnvVar("NODE_ENV")
const isProd = nodeEnv === "production"
const isDev = nodeEnv === "development"
const isTest = nodeEnv === "test"

const databaseUrl = getEnvVar("DATABASE_URL")

// When using client-side pooling with Neon, ensure a direct URL (no "-pooler"), otherwise it will double pool.
// https://neon.com/docs/connect/choose-connection#common-pitfalls
if (isProd && /-pooler\./.test(databaseUrl)) {
  throw new Error(
    'DATABASE_URL must be a direct Neon endpoint (no "-pooler") when using client-side pooling.',
  )
}

const defaultMaxConnections = isProd ? 10 : isTest ? 1 : 5

const defaultIdleTimeoutMs = 10_000

const maxConnections = Number.isFinite(Number(process.env.DB_MAX_CONNECTIONS))
  ? Number(process.env.DB_MAX_CONNECTIONS)
  : defaultMaxConnections

const idleTimeoutMs = Number.isFinite(Number(process.env.DB_IDLE_TIMEOUT_MS))
  ? Number(process.env.DB_IDLE_TIMEOUT_MS)
  : defaultIdleTimeoutMs

function createProdPool(): NeonPool {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket

  return new NeonPool({
    connectionString: databaseUrl,
    max: maxConnections,
    idleTimeoutMillis: idleTimeoutMs,
  })
}

function createDevOrTestPool(): PgPool {
  return new PgPool({
    connectionString: databaseUrl,
    max: maxConnections,
    idleTimeoutMillis: idleTimeoutMs,
  })
}

function createDbAndPool(): { db: AnyDb; pool: AnyPool } {
  if (isProd) {
    const pool = createProdPool()
    const db = drizzleNeon(pool, { schema })
    return { db, pool }
  } else {
    const pool = createDevOrTestPool()
    const db = drizzlePg(pool, { schema })
    return { db, pool }
  }
}

const g = globalThis as unknown as {
  __DB__?: AnyDb
  __POOL__?: AnyPool
}

let db: AnyDb
let pool: AnyPool

if (isDev) {
  // In dev, use the global object to persist the pool/db across Next.js HMR reloads.
  // This allows us to avoid creating a new pool/db on every file change.
  if (!g.__POOL__ || !g.__DB__) {
    const created = createDbAndPool()
    g.__POOL__ = created.pool
    g.__DB__ = created.db
  }
  db = g.__DB__!
  pool = g.__POOL__!
} else {
  const created = createDbAndPool()
  db = created.db
  pool = created.pool
}

// For use in test cleanup. Do not use in route handlers or other code that runs in production.
async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
  }
  if (isDev) {
    g.__POOL__ = undefined
    g.__DB__ = undefined
  }
}

export { db, closePool }
