import { relations, sql } from "drizzle-orm"
import {
  pgEnum,
  pgTable,
  varchar,
  boolean,
  timestamp,
  integer,
  numeric,
  primaryKey,
  AnyPgColumn,
  unique,
  index,
  uniqueIndex,
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
export const requirementTypeEnum = pgEnum("requirement_type_enum", [
  "pass_fail",
  "subjective",
])

export const modelProviderEnum = pgEnum("model_provider_enum", ["openai"])

export const modelNameEnum = pgEnum("model_name_enum", [
  "gpt-4o",
  "chatgpt-4o-latest",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "o3",
  "o3-pro",
  "o3-mini",
  "o1",
  "o1-pro",
  "o4-mini",
])

export const toolTypeEnum = pgEnum("tool_type_enum", [
  "web_search",
  "code_interpreter",
])

export const reasoningEffortEnum = pgEnum("reasoning_effort_enum", [
  "low",
  "medium",
  "high",
])

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
  folders: many(folders),
  canvases: many(canvases),
  accounts: many(accounts),
  sessions: many(sessions),
  userRoles: many(usersToRoles),
}))

/**
 * Folders are user-scoped and allow users to organize their canvases.
 */
export const folders = pgTable("folders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  name: varchar().notNull(),
  ...timestamps,
})

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, {
    fields: [folders.userId],
    references: [users.id],
  }),
  canvases: many(canvases),
}))

/**
 * A canvas is the top-level concept where users work on prompt + requirement + response sets.
 */
export const canvases = pgTable("canvases", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  /**
   * When a folder is deleted, that will cascade to all canvases within the folder and delete them too.
   * Therefore, the user should be warned of this fact when deleting a folder and given the option to
   * first migrate their files to the root level or to another folder.
   */
  folderId: integer().references(() => folders.id, { onDelete: "cascade" }),
  name: varchar().notNull().default("Untitled"),
  ...timestamps,
})

export const canvasesRelations = relations(canvases, ({ one, many }) => ({
  user: one(users, {
    fields: [canvases.userId],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [canvases.folderId],
    references: [folders.id],
  }),
  canvasVersions: many(canvasVersions),
}))

/**
 * Each canvas version represents either a draft (being edited) or an immutable saved snapshot of a canvas.
 * A draft becomes a version when finalized. Versions are immutable once saved.
 * The very first draft or version has no parent_version_id.
 *
 * This schema design supports both linear versioning and branching.
 */
export const canvasVersions = pgTable(
  "canvas_versions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    canvasId: integer()
      .references(() => canvases.id, { onDelete: "cascade" })
      .notNull(),
    /**
     * If a version is deleted, all children and grandchildren will be deleted too.
     * Use with care if enabling branching version trees.
     *
     * Also, since this is a self-referential foreign key, Drizzle requires us to
     * explicitly define the return type of the callback function using AnyPgColumn.
     *
     * The unique constraint enforces the reflexive one-to-one relationship inherent
     * in a linear versioning system. If we later decide to move to a branching
     * versioning system, we can remove this constraint. Nulls are not considered
     * equal in SQL, so this design still allows for many root versions (with
     * null parent_version_id) across canvases and users.
     */
    parentVersionId: integer()
      .references((): AnyPgColumn => canvasVersions.id, {
        onDelete: "cascade",
      })
      .unique(),
    name: varchar(),
    isDraft: boolean().notNull(),
    ...timestamps,
  },
  (t) => [
    // Partial unique index: at most one draft per canvas
    uniqueIndex("uniq_canvas_draft")
      .on(t.canvasId)
      .where(sql`${t.isDraft} = true`),
  ],
)

export const canvasVersionsRelations = relations(
  canvasVersions,
  ({ one, many }) => ({
    canvas: one(canvases, {
      fields: [canvasVersions.canvasId],
      references: [canvases.id],
    }),
    parentVersion: one(canvasVersions, {
      fields: [canvasVersions.parentVersionId],
      references: [canvasVersions.id],
    }),
    // TODO: See note above about the unique constraint for linear versioning.
    // This might need to change to...
    // one(canvasVersions, { fields: [canvasVersions.id], references: [canvasVersions.parentVersionId] })
    childVersions: many(canvasVersions),
    prompt: one(prompts),
    requirementGroup: one(requirementGroups),
    response: one(responses),
  }),
)

/**
 * LLM models supported in the system
 */
export const models = pgTable("models", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: modelNameEnum().notNull().unique(),
  provider: modelProviderEnum().notNull().default("openai"),
  supportsReasoningEffort: boolean().notNull(),
  supportsPredictedOutputs: boolean().notNull(),
  ...timestamps,
})

export const modelsRelations = relations(models, ({ many }) => ({
  prompts: many(prompts),
  requirements: many(requirements),
}))

/**
 * The prompt content for a canvas version, plus optional model configuration if prompt is using tools or using a model that accepts config.
 */
export const prompts = pgTable("prompts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /**
   * One prompt per canvas version. The intent is for this to be a 1:1 relationship, but the schema technically allows for 1:0 (e.g. a parent without a child).
   * This is typical of SQL, so a true 1:1 relationship must be enforced at the application level.
   */
  canvasVersionId: integer()
    .references(() => canvasVersions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  // If the model is deleted, null out the reference rather than cascading. The user will have to choose a new model prior to submitting this prompt again.
  modelId: integer().references(() => models.id, {
    onDelete: "set null",
  }),
  content: varchar(),
  reasoningEffort: reasoningEffortEnum(),
  ...timestamps,
})

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  canvasVersion: one(canvasVersions, {
    fields: [prompts.canvasVersionId],
    references: [canvasVersions.id],
  }),
  model: one(models, {
    fields: [prompts.modelId],
    references: [models.id],
  }),
  tools: many(tools),
  files: many(files),
}))

/**
 * Each canvas version has one group of requirements, used to evaluate the response.
 */
export const requirementGroups = pgTable("requirement_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  canvasVersionId: integer()
    .references(() => canvasVersions.id, {
      onDelete: "cascade",
    })
    .notNull()
    .unique(),
  successThreshold: numeric().notNull(),
  ...timestamps,
})

export const requirementGroupsRelations = relations(
  requirementGroups,
  ({ one, many }) => ({
    canvasVersion: one(canvasVersions, {
      fields: [requirementGroups.canvasVersionId],
      references: [canvasVersions.id],
    }),
    requirements: many(requirements),
  }),
)

/**
 * Individual requirements for a canvas version, evaluated against the generated response.
 */
export const requirements = pgTable("requirements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  requirementGroupId: integer()
    .references(() => requirementGroups.id, {
      onDelete: "cascade",
    })
    .notNull(),
  // If the model is deleted, null out the reference rather than cascading. The user will have to choose a new model prior to submitting this prompt again.
  modelId: integer().references(() => models.id, {
    onDelete: "set null",
  }),
  content: varchar(),
  isRequired: boolean().notNull().default(true),
  weight: integer().notNull().default(1),
  type: requirementTypeEnum().notNull().default("pass_fail"),
  threshold: numeric(),
  reasoningEffort: reasoningEffortEnum(),
  ...timestamps,
})

export const requirementsRelations = relations(requirements, ({ one }) => ({
  requirementGroup: one(requirementGroups, {
    fields: [requirements.requirementGroupId],
    references: [requirementGroups.id],
  }),
  model: one(models, {
    fields: [requirements.modelId],
    references: [models.id],
  }),
  evaluation: one(evaluations),
}))

/**
 * The result of a single requirement's evaluation.
 */
export const evaluations = pgTable("evaluations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /**
   * One evaluation per requirement. Unlike prompts.canvas_version_id, this is a scenario where a 1:0 situation would initially be acceptable
   * until the user decides to evaluate a requirement for the first time.
   */
  requirementId: integer()
    .references(() => requirements.id, {
      onDelete: "cascade",
    })
    .notNull()
    .unique(),
  score: numeric().notNull(), // Normalized score (e.g., 0.0 to 1.0)
  explanation: varchar().notNull(), // Model-provided justification for the score
  ...timestamps,
})

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
  requirement: one(requirements, {
    fields: [evaluations.requirementId],
    references: [requirements.id],
  }),
}))

/**
 * The model-generated response for a canvas version.
 */
export const responses = pgTable("responses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // One response per canvas version. See prompts.canvas_version_id for additional notes.
  canvasVersionId: integer()
    .references(() => canvasVersions.id, {
      onDelete: "cascade",
    })
    .notNull()
    .unique(),
  // The actual response text. If null, indicates user has never generated a response.
  // If empty string, indicates user has cleared out a previously generated response.
  content: varchar(),
  ...timestamps,
})

export const responsesRelations = relations(responses, ({ one }) => ({
  canvasVersion: one(canvasVersions, {
    fields: [responses.canvasVersionId],
    references: [canvasVersions.id],
  }),
}))

/**
 * Represents files attached to a prompt, such as images or reference documents.
 *
 * When a canvas or canvas version is deleted, associated prompts may be deleted via cascade,
 * which may nullify the `prompt_id` reference in this record.
 *
 * Files are intentionally not deleted from Vercel Blob Storage during cascade deletions.
 * Orphaned file records (where `prompt_id` is `NULL`) are retained in the database
 * and later removed by a scheduled background job, which also deletes the corresponding
 * blob in storage.
 *
 * The following situation should never occur, but if a file is deleted from storage while
 * still referenced in the database, the issue is detected only upon access ("lazy" validation).
 * In such cases, errors should be handled gracefully in the app with UI messaging,
 * and incidents should be logged (e.g., in Sentry). The corrupted database row should then be deleted.
 */
export const files = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  promptId: integer().references(() => prompts.id, {
    onDelete: "set null",
  }),
  name: varchar().notNull(),
  url: varchar().notNull(),
  mimeType: varchar().notNull(),
  fileSize: integer().notNull(),
  ...timestamps,
})

export const filesRelations = relations(files, ({ one }) => ({
  prompt: one(prompts, {
    fields: [files.promptId],
    references: [prompts.id],
  }),
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

/*
 * Tools used during prompt execution, like function-calling plugins.
 */
export const tools = pgTable("tools", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  promptId: integer()
    .references(() => prompts.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: toolTypeEnum().notNull(),
  ...timestamps,
})

export const toolsRelations = relations(tools, ({ one }) => ({
  prompt: one(prompts, {
    fields: [tools.promptId],
    references: [prompts.id],
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
