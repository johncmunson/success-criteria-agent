import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"

import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless"
import { Pool as PgPool } from "pg"
import ws from "ws"

import * as schema from "./schema"

type DrizzleDb = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>

const dbCache = new WeakMap<
  Request,
  { db: DrizzleDb; cleanup: () => Promise<void> }
>()

/**
 * getDb dynamically chooses the appropriate database driver and returns a Drizzle-ORM instance
 * along with a cleanup function for use in Next.js App Router handlers.
 *
 * - In production, we use Neon because it's a modern Postgres service that pairs well with
 *   Vercel Serverless Functions and supports connection pooling via WebSocket (`ws`). Using `ws`
 *   with Neon enables pooling, which is otherwise not available with Neon HTTP connections.
 * - Locally, we use regular Postgres (node-postgres), as it's simpler to run and closely mirrors
 *   the Neon setup, keeping dev and prod as similar as possible.
 *
 * - Drizzle is used in both cases to standardize the application code, making it easier to switch
 *   environments without changes to query logic.
 * - The pooling setup is intentionally similar for both drivers, as Neon serverless is designed to
 *   be a drop-in replacement for node-postgres, maintaining parity between environments.
 *
 * - A WeakMap<Request, { db, cleanup }> is used to cache the database connection and cleanup
 *   function per request. This is critical in Vercel Serverless Functions and similar environments,
 *   where you should treat each request as isolated. Caching by request ensures db connections are
 *   not leaked across invocations and helps avoid resource contention.
 *
 * - `maxConnections` limits how many database connections the pool can have open at once.
 *   `idleTimeoutMs` (or `idleTimeoutMillis`) controls how long idle connections stay open before
 *   being closed. Tuning these values can help balance database load and cold start performance:
 *   higher values may increase throughput, but risk exhausting db resources; lower values may
 *   conserve resources, but increase latency if new connections need to be opened.
 */
export function getDb(req: Request): {
  db: DrizzleDb
  cleanup: () => Promise<void>
} {
  if (dbCache.has(req)) return dbCache.get(req)!

  const useNeon = process.env.USE_NEON === "true"
  const connectionString = process.env.DATABASE_URL!
  const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || "3", 10)
  const idleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT_MS || "10000", 10)

  let db: DrizzleDb
  let cleanup: () => Promise<void>
  let pool: NeonPool | PgPool

  if (useNeon) {
    neonConfig.webSocketConstructor = ws

    pool = new NeonPool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: idleTimeoutMs,
    })

    db = drizzleNeon(pool as NeonPool, { schema, casing: "snake_case" })
    cleanup = async () => await pool.end()
  } else {
    pool = new PgPool({
      connectionString,
      max: maxConnections,
      idleTimeoutMillis: idleTimeoutMs,
    })

    db = drizzlePg(pool as PgPool, { schema, casing: "snake_case" })
    cleanup = async () => await pool.end()
  }

  dbCache.set(req, { db, cleanup })
  return {
    db,
    cleanup,
  }
}

type RouteHandlerContext<
  P extends Record<string, string | string[] | undefined> = Record<
    string,
    string | string[] | undefined
  >,
> = {
  params: Promise<P>
}

type HandlerWithDb<
  P extends Record<string, string | string[] | undefined> = Record<
    string,
    string | string[] | undefined
  >,
  T = Response,
> = (params: {
  db: DrizzleDb
  req: Request
  context?: RouteHandlerContext<P>
}) => Promise<T>

/**
 * withDb is a higher-order function for Next.js route handlers that ensures
 * a database connection is acquired and always cleaned up per request.
 *
 * This is essential in serverless environments, where failing to close the
 * database pool can quickly exhaust available connections.
 *
 * Usage:
 *
 * // Static route:
 * export const GET = withDb(async ({ db, req }) => {
 *   // use db, no params
 *   return new Response("ok");
 * });
 *
 * // Dynamic route (/items/[slug]):
 * export const GET = withDb<{ slug: string }>(async ({ db, req, context }) => {
 *   const { slug } = await context!.params;
 *   // use db and slug
 *   return new Response(slug);
 * });
 */
export function withDb<
  P extends Record<string, string | string[] | undefined> = Record<
    string,
    string | string[] | undefined
  >,
  T = Response,
>(handler: HandlerWithDb<P, T>) {
  return async function (
    req: Request,
    context?: RouteHandlerContext<P>,
  ): Promise<T> {
    const { db, cleanup } = getDb(req)

    try {
      return await handler({ db, req, context })
    } finally {
      await cleanup()
    }
  }
}
