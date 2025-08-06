import './envConfig.ts'
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./db/schema.ts", // path to your schema
  dialect: "postgresql",
  dbCredentials: {
    // Option 1
    url: process.env.DATABASE_URL!,
    // Option 2
    // host: "host",
    // port: 5432,
    // user: "user",
    // password: "password",
    // database: "dbname",
    // ssl: true, // can be boolean | "require" | "allow" | "prefer" | "verify-full" | options from node:tls
  },
})
