import {
  pgEnum,
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
  foreignKey,
  numeric,
  primaryKey,
  text,
} from "drizzle-orm/pg-core"

/*
-- ENUMs are used here for simplicity and type safety during early development.
-- They're ideal for static or rarely-changing values.
-- In the future, consider replacing frequently updated enums (like model names or tool types)
-- with lookup tables to support easier updates and richer metadata.
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

/*
-- Users of the application. Each user may own folders, canvases, and sessions, among other things.
*/
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  // Optional profile image from OAuth provider. Could also allow the user
  // to upload their own photo.
  image: varchar("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/*
-- Folders are user-scoped and allow users to organize their canvases.
*/
export const folders = pgTable(
  "folders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    name: varchar("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "folders_user_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- A canvas is the top-level concept where users work on prompt + requirement + response sets.
*/
export const canvases = pgTable(
  "canvases",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    folderId: integer("folder_id"),
    name: varchar("name").notNull().default("Untitled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "canvases_user_id_fkey",
    }).onDelete("cascade"),
    /*
    -- When a folder is deleted, that will cascade to all canvases within the folder and delete them too.
    -- Therefore, the user should be warned of this fact when deleting a folder and given the option to
    -- first migrate their files to the root level or to another folder.
    */
    foreignKey({
      columns: [table.folderId],
      foreignColumns: [folders.id],
      name: "canvases_folder_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Each canvas_version represents either a draft (being edited) or an immutable saved snapshot of a canvas.
-- A draft becomes a version when finalized. Versions are immutable once saved.
-- The very first draft or version has no parent_version_id.
-- 
-- This schema design supports both linear versioning and branching.
*/
export const canvasVersions = pgTable(
  "canvas_versions",
  {
    id: serial("id").primaryKey(),
    canvasId: integer("canvas_id").notNull(),
    parentVersionId: integer("parent_version_id"),
    name: varchar("name"),
    isDraft: boolean("is_draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.canvasId],
      foreignColumns: [canvases.id],
      name: "canvas_versions_canvas_id_fkey",
    }).onDelete("cascade"),
    /*
    -- If a version is deleted, all children and grandchildren will be deleted too.
    -- Note: Use with care if enabling branching version trees.
    */
    foreignKey({
      columns: [table.parentVersionId],
      foreignColumns: [table.id],
      name: "canvas_versions_parent_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- LLM models supported in the system
*/
export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: modelNameEnum("name").notNull().unique(),
  provider: modelProviderEnum("provider").notNull().default("openai"),
  supportsReasoningEffort: boolean("supports_reasoning_effort").notNull(),
  supportsPredictedOutputs: boolean("supports_predicted_outputs").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/*
-- The prompt content for a canvas version, plus optional model configuration if prompt is using tools or using a model that accepts config.
*/
export const prompts = pgTable(
  "prompts",
  {
    id: serial("id").primaryKey(),
    /*
    -- One prompt per canvas version. The intent is for this to be a 1:1 relationship, but the schema technically allows for 1:0 (e.g. a parent without a child).
    -- This is typical of SQL, so a true 1:1 relationship must be enforced at the application level.
    */
    canvasVersionId: integer("canvas_version_id").notNull().unique(),
    modelId: integer("model_id"),
    content: varchar("content"),
    reasoningEffort: reasoningEffortEnum("reasoning_effort"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.canvasVersionId],
      foreignColumns: [canvasVersions.id],
      name: "prompts_canvas_version_id_fkey",
    }).onDelete("cascade"),
    /*
    -- If the model is deleted, null out the reference rather than cascading. The user will have to choose a new model prior to submitting this prompt again.
    */
    foreignKey({
      columns: [table.modelId],
      foreignColumns: [models.id],
      name: "prompts_model_id_fkey",
    }).onDelete("set null"),
  ],
)

/*
-- Each canvas version has one group of requirements, used to evaluate the response.
*/
export const requirementGroups = pgTable(
  "requirement_groups",
  {
    id: serial("id").primaryKey(),
    canvasVersionId: integer("canvas_version_id").notNull().unique(),
    successThreshold: numeric("success_threshold").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.canvasVersionId],
      foreignColumns: [canvasVersions.id],
      name: "requirement_groups_canvas_version_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Individual requirements for a canvas version, evaluated against the generated response.
*/
export const requirements = pgTable(
  "requirements",
  {
    id: serial("id").primaryKey(),
    requirementGroupId: integer("requirement_group_id").notNull(),
    modelId: integer("model_id"),
    content: varchar("content"),
    isRequired: boolean("is_required").notNull().default(true),
    weight: integer("weight").notNull().default(1),
    type: requirementTypeEnum("type").notNull().default("pass_fail"),
    threshold: numeric("threshold"),
    reasoningEffort: reasoningEffortEnum("reasoning_effort"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.requirementGroupId],
      foreignColumns: [requirementGroups.id],
      name: "requirements_requirement_group_id_fkey",
    }).onDelete("cascade"),
    /*
    -- If the model is deleted, null out the reference rather than cascading. The user will have to choose a new model prior to submitting this prompt again.
    */
    foreignKey({
      columns: [table.modelId],
      foreignColumns: [models.id],
      name: "requirements_model_id_fkey",
    }).onDelete("set null"),
  ],
)

/*
-- The result of a single requirement's evaluation.
*/
export const evaluations = pgTable(
  "evaluations",
  {
    id: serial("id").primaryKey(),
    /*
    -- One evaluation per requirement. Unlike prompts.canvas_version_id, this is a scenario where a 1:0 situation would initially be acceptable
    -- until the user decides to evaluate a requirement for the first time.
    */
    requirementId: integer("requirement_id").notNull().unique(),
    score: numeric("score").notNull(), // Normalized score (e.g., 0.0 to 1.0)
    explanation: varchar("explanation").notNull(), // Model-provided justification for the score
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.requirementId],
      foreignColumns: [requirements.id],
      name: "evaluations_requirement_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- The model-generated response for a canvas version.
*/
export const responses = pgTable(
  "responses",
  {
    id: serial("id").primaryKey(),
    /*
    -- One response per canvas version. See prompts.canvas_version_id for additional notes.
    */
    canvasVersionId: integer("canvas_version_id").notNull().unique(),
    // The actual response text. If null, indicates user has never generated a response.
    // If empty string, indicates user has cleared out a previously generated response.
    content: varchar("content"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.canvasVersionId],
      foreignColumns: [canvasVersions.id],
      name: "responses_canvas_version_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Files attached to a prompt, such as images or reference documents.
-- When a canvas or canvas version is deleted, associated prompts may be deleted via cascade,
-- which in turn may nullify the prompt_id reference here.
-- We intentionally do NOT delete files from Vercel Blob Storage at the time of cascade deletion.
-- Instead, orphaned file records (i.e., where prompt_id IS NULL) are retained in the database
-- and cleaned up later by a scheduled background job that deletes both the database row
-- and the corresponding blob in storage.
--
-- The following should *never* happen, but...
-- In the reverse case — if a file is deleted from storage but still referenced in the DB — we should
-- take a "lazy" validation approach and detect the issue only when trying to access the file. Errors
-- can be handled gracefully in the app with UI messaging and we should consider logging the incident
-- in Sentry or whatever is most appropriate. Then the corrupted database row should be deleted.
*/
export const files = pgTable(
  "files",
  {
    id: serial("id").primaryKey(),
    promptId: integer("prompt_id"),
    name: varchar("name").notNull(),
    url: varchar("url").notNull(),
    mimeType: varchar("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.promptId],
      foreignColumns: [prompts.id],
      name: "files_prompt_id_fkey",
    }).onDelete("set null"),
  ],
)

/*
-- Role definitions for access control (e.g., admin, user).
*/
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: varchar("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/*
-- System-wide permissions that can be attached to roles.
*/
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: varchar("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/*
-- Role to permission mapping (many-to-many). a.k.a. bridge table. Roles can have many permissions, and permissions can be assigned to many roles.
*/
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id").notNull(),
    permissionId: integer("permission_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "role_permissions_role_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: "role_permissions_permission_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- User to role mapping (many-to-many). a.k.a. bridge table. Users can have many roles, and roles can be assigned to many users.
-- The schema specifically does not allow permissions to be assigned directly to users. Users gain their permissions only indirectly
-- via the roles that they are assigned.
*/
export const userRoles = pgTable(
  "user_roles",
  {
    userId: integer("user_id").notNull(),
    roleId: integer("role_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_roles_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "user_roles_role_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Connected accounts for login strategies, including both third-party OAuth providers (Google, GitHub, etc.) and native
-- email/password authentication. Because of the email/password login strategy, technically not every row represents a
-- third-party provider. This also explains why columns related to 3rd party auth providers are nullable.
-- 
-- If a user signs in with an OAuth provider and the email from that provider matches the email
-- of an existing user in the `users` table, the account will be automatically linked.
-- 
-- If the emails do not match (or if the OAuth provider does not expose an email),
-- the user must first sign in via their primary method, then manually link the additional
-- account from the user settings page.
-- 
-- This approach allows for flexible authentication while ensuring that each user has
-- exactly one account in the system, regardless of how they log in.
*/
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    // Provider-specific account or user ID
    accountId: text("account_id").notNull(),
    // The OAuth provider, or 'email_password'
    provider: authProviderEnum("provider").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    // Only for email/password auth
    password: varchar("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "accounts_user_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Authenticated sessions for users.
-- Each session represents a unique login (e.g., different devices or browsers).
-- Multiple concurrent sessions per user are supported, enabling multi-device access.
-- Session tokens are stored here and can be revoked or expired individually for security.
--
-- In certain cases, it makes sense to revoke or delete all sessions for a user:
-- - When a user changes their password (for security hardening)
-- - After detecting suspicious login activity or a breach
-- - If the user explicitly logs out of all devices (if the UI allows this)
-- This can be implemented by deleting all session rows for that user, or marking them expired/inactive.
--
-- In rare cases, it may be necessary to clear all sessions for all users,
-- such as after a security breach, auth system migration, token format change,
-- or when enforcing new global authentication policies.
*/
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address"),
    userAgent: varchar("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "sessions_user_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Tools used during prompt execution, like function-calling plugins.
*/
export const tools = pgTable(
  "tools",
  {
    id: serial("id").primaryKey(),
    promptId: integer("prompt_id").notNull(),
    type: toolTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.promptId],
      foreignColumns: [prompts.id],
      name: "tools_prompt_id_fkey",
    }).onDelete("cascade"),
  ],
)

/*
-- Temporary codes used for verifying emails, resetting passwords, etc.
-- 
-- Rows in this table should be deleted in the following cases:
-- 1. When the user successfully completes the corresponding verification flow.
-- 2. Periodically via a cron or scheduled job (e.g., daily or weekly) that deletes expired entries based on 
--    the `expires_at` timestamp, to prevent unnecessary storage accumulation and keep the table clean.
*/
export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  type: verificationTypeEnum("type").notNull(),
  // If verification_type is 'email_verification' or 'password_reset', then this is the user's email.
  // If other strategies are supported in the future, then identifier could be something other than email.
  identifier: varchar("identifier").notNull(),
  // The actual code/token
  value: varchar("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
