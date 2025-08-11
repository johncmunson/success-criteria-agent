import { relations } from "drizzle-orm"
import {
  pgEnum,
  pgTable,
  varchar,
  boolean,
  timestamp,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core"

/**
 * Note: There are often multiple ways to achieve basically the same thing when defining a schema in Drizzle.
 * The approach taken here is to prefer standards-compliant SQL where possible. For example, using `varchar`
 * instead of `text` for strings, or id: integer().primaryKey().generatedAlwaysAsIdentity() instead of
 * id: serial().primaryKey() for primary keys. This is to ensure that the schema is as portable as possible
 * across different SQL databases if a migration is ever needed.
 */

/**
 * TODO: DOUBLE CHECK THIS BEHAVIOR
 * The `timestamps` object adds `createdAt` and `updatedAt` columns to your tables:
 * - `createdAt` is set automatically on insert.
 * - `updatedAt` is set automatically on insert and on every update (handled by Drizzle).
 * Most of the time, your app code doesn't need to worry about these—Drizzle manages them for you.
 * If you update rows outside Drizzle (like in a DB GUI), you'll need to set `updatedAt` manually.
 */
const timestamps = {
  createdAt: timestamp({ withTimezone: true })
    // The db engine creates a new timestamp on row insert
    .defaultNow()
    .notNull(),
  updatedAt: timestamp({ withTimezone: true })
    // The db engine creates a new timestamp on row insert
    .defaultNow()
    // Drizzle creates a new timestamp on row insert or row update
    .$onUpdateFn(() => new Date())
    .notNull(),
}

/**
 * ENUMs are used here for simplicity and type safety during early development.
 * They're ideal for static or rarely-changing values.
 * In the future, consider replacing frequently updated enums (like model names or tool types)
 * with lookup tables to support easier updates and richer metadata.
 */

export const authProviderEnum = pgEnum("auth_provider_enum", [
  "google",
  "microsoft",
  "apple",
  "github",
  "email_password",
])

export const verificationTypeEnum = pgEnum("verification_type_enum", [
  "email_verification",
  "password_reset",
])

/**
 * Users of the application. Each user may own folders, canvases, and sessions, among other things.
 */
export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  // TODO: Be sure to normalize and lowercase emails before inserting or querying.
  // TODO: Decide how to handle email plus addressing.
  email: varchar().unique().notNull(),
  emailVerified: boolean().notNull().default(false),
  // Optional profile image from OAuth provider. Could also allow the user
  // to upload their own photo.
  image: varchar(),
  ...timestamps,
})

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  userRoles: many(usersToRoles),
}))

/**
 * Role definitions for access control (e.g., admin, user).
 */
export const roles = pgTable("roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull().unique(),
  description: varchar(),
  ...timestamps,
})

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolesToPermissions),
  userRoles: many(usersToRoles),
}))

/**
 * System-wide permissions that can be attached to roles.
 */
export const permissions = pgTable("permissions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull().unique(),
  description: varchar(),
  ...timestamps,
})

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolesToPermissions),
}))

/**
 * Role to permission mapping (many-to-many). a.k.a. bridge table. Roles can have many permissions, and permissions can be assigned to many roles.
 */
export const rolesToPermissions = pgTable(
  "role_permissions",
  {
    roleId: integer()
      .references(() => roles.id, {
        onDelete: "cascade",
      })
      .notNull(),
    permissionId: integer()
      .references(() => permissions.id, {
        onDelete: "cascade",
      })
      .notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
)

export const rolesToPermissionsRelations = relations(
  rolesToPermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolesToPermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolesToPermissions.permissionId],
      references: [permissions.id],
    }),
  }),
)

/**
 * User to role mapping (many-to-many). a.k.a. bridge table. Users can have many roles, and roles can be assigned to many users.
 * The schema specifically does not allow permissions to be assigned directly to users. Users gain their permissions only indirectly
 * via the roles that they are assigned.
 */
export const usersToRoles = pgTable(
  "user_roles",
  {
    userId: integer()
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    roleId: integer()
      .references(() => roles.id, {
        onDelete: "cascade",
      })
      .notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
)

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  user: one(users, {
    fields: [usersToRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [usersToRoles.roleId],
    references: [roles.id],
  }),
}))

/**
 * Connected accounts for login strategies, including both third-party OAuth providers (e.g., Google, GitHub) and native email/password authentication.
 *
 * Note: Not every row represents a third-party provider due to the inclusion of email/password authentication.
 * As a result, columns related to third-party auth providers are nullable.
 *
 * - If a user signs in with an OAuth provider and the email from that provider matches an existing user in the `users` table, the accounts are automatically linked.
 * - If the emails do not match, or if the OAuth provider does not provide an email, the user must first sign in using their primary method, then manually link the additional account from the user settings page.
 *
 * This design enables flexible authentication while ensuring each user has exactly one account in the system, regardless of their login method.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Provider-specific account or user ID
    accountId: varchar().notNull(),
    // The OAuth provider, or 'email_password'
    provider: authProviderEnum().notNull(),
    accessToken: varchar(),
    refreshToken: varchar(),
    accessTokenExpiresAt: timestamp({
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp({
      withTimezone: true,
    }),
    scope: varchar(),
    idToken: varchar(),
    // Only for email/password auth
    password: varchar(),
    ...timestamps,
  },
  (table) => [unique().on(table.provider, table.accountId)],
)

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

/**
 * Authenticated sessions for users.
 *
 * Each session represents a unique login (e.g., different devices or browsers).
 * Multiple concurrent sessions per user are supported, enabling multi-device access.
 * Session tokens are stored here and can be revoked or expired individually for security.
 *
 * Scenarios for revoking or deleting all sessions for a user include:
 * - When a user changes their password (for security hardening)
 * - After detecting suspicious login activity or a breach
 * - If the user explicitly logs out of all devices (if the UI supports it)
 * These cases can be handled by deleting all session records for the user, or marking them expired/inactive.
 *
 * In rare cases, all sessions for all users may need to be cleared, such as:
 * - Following a security breach
 * - After an authentication system migration
 * - When the token format changes
 * - To enforce new global authentication policies
 */
export const sessions = pgTable("sessions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  token: varchar().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: varchar(),
  userAgent: varchar(),
  ...timestamps,
})

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

/**
 * Temporary codes used for verifying emails, resetting passwords, etc.
 *
 * Rows in this table should be deleted in the following cases:
 * 1. When the user successfully completes the corresponding verification flow.
 * 2. Periodically via a cron or scheduled job (e.g., daily or weekly) that deletes expired entries
 *    based on the `expires_at` timestamp, to prevent unnecessary storage accumulation and keep the table clean.
 */
export const verifications = pgTable("verifications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: verificationTypeEnum().notNull(),
  // If verification_type is 'email_verification' or 'password_reset', then this is the user's email.
  // If other strategies are supported in the future, then identifier could be something other than email.
  identifier: varchar().notNull(),
  // The actual code/token
  value: varchar().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ...timestamps,
})
