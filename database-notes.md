--------------------------------------------------------------------------------
-- 1. USERS
--------------------------------------------------------------------------------
```sql
CREATE TABLE users (
    id               SERIAL          PRIMARY KEY,
    email            VARCHAR(255)    UNIQUE NOT NULL,
    full_name        VARCHAR(255)    NOT NULL,
    password_hash    VARCHAR(255)    NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);
```

--------------------------------------------------------------------------------
-- 2. FOLDERS
--------------------------------------------------------------------------------
```sql
CREATE TABLE folders (
    id          SERIAL        PRIMARY KEY,
    user_id     INT           NOT NULL,
    name        VARCHAR(255)  NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

--------------------------------------------------------------------------------
-- 3. CANVASES
--------------------------------------------------------------------------------
```sql
CREATE TABLE canvases (
    id          SERIAL        PRIMARY KEY,
    user_id     INT           NOT NULL,
    folder_id   INT           NULL,
    name        VARCHAR(255)  NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);
```

--------------------------------------------------------------------------------
-- 4. CANVAS VERSIONS (Immutable Snapshots)
--------------------------------------------------------------------------------
```sql
CREATE TABLE canvas_versions (
    id                 SERIAL        PRIMARY KEY,
    canvas_id          INT           NOT NULL,
    parent_version_id  INT           NULL,
    version_number     INT           NOT NULL,
    success_threshold  NUMERIC(3,2)  NOT NULL DEFAULT 0.8,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_version_id) REFERENCES canvas_versions(id) ON DELETE SET NULL,
    UNIQUE (canvas_id, version_number)      -- <---- Enforces per-canvas uniqueness
);
```

--------------------------------------------------------------------------------
-- 5. CANVAS DRAFT (Single Mutable Draft per Canvas, always anchored to a version)
--------------------------------------------------------------------------------
```sql
CREATE TABLE canvas_drafts (
    id                 SERIAL PRIMARY KEY,
    canvas_id          INT NOT NULL UNIQUE,    -- Only one draft per canvas allowed
    base_version_id    INT NOT NULL,           -- The version the draft is anchored to
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
    FOREIGN KEY (base_version_id) REFERENCES canvas_versions(id) ON DELETE CASCADE
);
```

--------------------------------------------------------------------------------
-- 6. PROMPTS (Attach to Canvas Version OR Canvas Draft, never both)
--------------------------------------------------------------------------------
```sql
CREATE TABLE prompts (
    id                  SERIAL PRIMARY KEY,
    canvas_version_id   INT NULL,
    canvas_draft_id     INT NULL,
    content             TEXT NOT NULL,
    model_used          VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (canvas_version_id) REFERENCES canvas_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (canvas_draft_id) REFERENCES canvas_drafts(id) ON DELETE CASCADE,
    -- Only one parent allowed
    CHECK (
        (canvas_version_id IS NOT NULL AND canvas_draft_id IS NULL)
        OR (canvas_version_id IS NULL AND canvas_draft_id IS NOT NULL)
    ),
    UNIQUE (canvas_version_id),
    UNIQUE (canvas_draft_id)
);
```

--------------------------------------------------------------------------------
-- 7. REQUIREMENTS (Attach to Canvas Version OR Canvas Draft)
--------------------------------------------------------------------------------
```sql
CREATE TABLE requirements (
    id                  SERIAL PRIMARY KEY,
    canvas_version_id   INT NULL,
    canvas_draft_id     INT NULL,
    content             TEXT NOT NULL,
    is_required         BOOLEAN NOT NULL DEFAULT FALSE,
    weight              NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    requirement_type    VARCHAR(50) NOT NULL DEFAULT 'subjective',
    threshold           NUMERIC(3,2) NOT NULL DEFAULT 0.7,
    model_used          VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (canvas_version_id) REFERENCES canvas_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (canvas_draft_id) REFERENCES canvas_drafts(id) ON DELETE CASCADE,
    CHECK (
        (canvas_version_id IS NOT NULL AND canvas_draft_id IS NULL)
        OR (canvas_version_id IS NULL AND canvas_draft_id IS NOT NULL)
    )
);
```

--------------------------------------------------------------------------------
-- 8. RESPONSES (Attach to Canvas Version OR Canvas Draft)
--------------------------------------------------------------------------------
```sql
CREATE TABLE responses (
    id                  SERIAL PRIMARY KEY,
    canvas_version_id   INT NULL,
    canvas_draft_id     INT NULL,
    content             TEXT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (canvas_version_id) REFERENCES canvas_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (canvas_draft_id) REFERENCES canvas_drafts(id) ON DELETE CASCADE,
    CHECK (
        (canvas_version_id IS NOT NULL AND canvas_draft_id IS NULL)
        OR (canvas_version_id IS NULL AND canvas_draft_id IS NOT NULL)
    )
);
```

--------------------------------------------------------------------------------
-- 9. REQUIREMENT EVALUATIONS (per requirement/response pair, both in versions or in draft)
--------------------------------------------------------------------------------
```sql
CREATE TABLE requirement_evaluations (
    id               SERIAL PRIMARY KEY,
    requirement_id   INT NOT NULL,
    response_id      INT NOT NULL,
    score            NUMERIC(3,2) NULL,
    pass_fail        BOOLEAN NULL,
    evaluation_notes TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
);
```