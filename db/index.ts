import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless"
import { Pool as PgPool } from "pg"
import ws from "ws"
import * as schema from "./schema"

/*
  Centralized database client & pool setup for Neon + Drizzle.

  - Production (Vercel Fluid, Node runtime):
    Uses a module-scoped singleton pool so all requests in a warm instance share connections.
    Default to a small pool size (~5) since each instance has its own pool; scale cautiously.

  - Development (Next.js with HMR):
    Wraps the pool in a globalThis guard to prevent new pools on hot reloads, avoiding connection leaks.

  - Test (Vitest, isolated workers):
    No globalThis caching; each worker gets its own pool and closes it in afterAll. Use low maxConnections (1–2).
    Recommended vite config: { { test: { pool: 'forks', isolate: true, fileParallelism: true } } }
    We want to run tests in parallel, but 'forks' and isolation provide the most stability and leak prevention.

  - https://neon.com/docs/connect/connection-pooling
  - https://neon.com/docs/connect/choose-connection
  - https://vercel.com/guides/connection-pooling-with-serverless-functions
*/

type DrizzleDb = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>

const NODE_ENV = process.env.NODE_ENV
const isProd = NODE_ENV === "production"
const isDev = NODE_ENV === "development"
// const isTest = NODE_ENV === "test"

const connectionString = process.env.DATABASE_URL!

// Suggested starting point for DB_MAX_CONNECTIONS:
// prod: ~5 (per Fluid instance; prevents exhausting Neon connections)
// dev: same as prod (globalThis guard handles HMR reloads)
// test: 1–2 (many parallel workers)
// Tune over time based on load and connection limits.
const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS ?? "5", 10)
const idleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "10000", 10)

declare global {
  // Dev-only HMR cache
  // (Do not use in test; Vitest manages its own isolation)
  // eslint-disable-next-line no-var
  var __DB__: DrizzleDb | undefined
  // eslint-disable-next-line no-var
  var __POOL__: NeonPool | PgPool | undefined
}

let _pool: NeonPool | PgPool | undefined
let _db: DrizzleDb | undefined

function createDb(): { pool: NeonPool | PgPool; db: DrizzleDb } {
  if (isProd) {
    neonConfig.webSocketConstructor = ws
    const pool = new NeonPool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: idleTimeoutMs,
    })
    const db = drizzleNeon(pool, { schema, casing: "snake_case" })
    return { pool, db }
  }
  // dev/test: node-postgres by default
  const pool = new PgPool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: idleTimeoutMs,
  })
  const db = drizzlePg(pool, { schema, casing: "snake_case" })
  return { pool, db }
}

// Initialize
if (isDev) {
  if (!globalThis.__DB__ || !globalThis.__POOL__) {
    const { pool, db } = createDb()
    globalThis.__POOL__ = pool
    globalThis.__DB__ = db
  }
  _pool = globalThis.__POOL__
  _db = globalThis.__DB__
} else {
  // production or test: no globalThis
  const created = createDb()
  _pool = created.pool
  _db = created.db
}

export function getDb(): DrizzleDb {
  return _db!
}

// Never call per request; tests and CLIs should call this in teardown.
export async function closeDb() {
  const p = _pool
  _pool = undefined
  _db = undefined
  if (isDev) {
    globalThis.__POOL__ = undefined
    globalThis.__DB__ = undefined
  }
  if (p) await p.end()
}
