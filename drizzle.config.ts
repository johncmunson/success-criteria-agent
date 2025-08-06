import "./lib/envConfig.ts"
import { defineConfig } from "drizzle-kit"
import { getEnvVar } from "./lib/utils.js"

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Option 1
    url: getEnvVar("DATABASE_URL"),
    // Option 2
    // host: "host",
    // port: 5432,
    // user: "user",
    // password: "password",
    // database: "dbname",
    // ssl: true, // can be boolean | "require" | "allow" | "prefer" | "verify-full" | options from node:tls
  },
})
