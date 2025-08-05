-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
CREATE TABLE public.users (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.folders (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer,
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT folders_pkey PRIMARY KEY (id),
  CONSTRAINT folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.canvases (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  folder_id integer,
  name character varying NOT NULL DEFAULT 'Untitled'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT canvases_pkey PRIMARY KEY (id),
  CONSTRAINT canvases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT canvases_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE
);
CREATE TABLE public.canvas_versions (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  canvas_id integer NOT NULL,
  parent_version_id integer,
  name character varying NOT NULL,
  is_draft boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT canvas_versions_pkey PRIMARY KEY (id),
  CONSTRAINT canvas_versions_canvas_id_fkey FOREIGN KEY (canvas_id) REFERENCES public.canvases(id) ON DELETE CASCADE,
  CONSTRAINT canvas_versions_parent_fkey FOREIGN KEY (parent_version_id) REFERENCES public.canvas_versions(id) ON DELETE CASCADE
);
CREATE TABLE public.models (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL DEFAULT ''::character varying,
  provider character varying NOT NULL,
  supports_reasoning_effort boolean NOT NULL,
  supports_predicted_outputs boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT models_pkey PRIMARY KEY (id)
);
CREATE TABLE public.prompts (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  canvas_version_id integer NOT NULL UNIQUE,
  model_id integer,
  content character varying,
  reasoning_effort character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prompts_pkey PRIMARY KEY (id),
  CONSTRAINT prompts_canvas_version_id_fkey FOREIGN KEY (canvas_version_id) REFERENCES public.canvas_versions(id) ON DELETE CASCADE,
  CONSTRAINT prompts_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE SET NULL
);
CREATE TABLE public.requirement_groups (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  canvas_version_id integer NOT NULL UNIQUE,
  success_threshold numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT requirement_groups_pkey PRIMARY KEY (id),
  CONSTRAINT requirement_groups_canvas_version_id_fkey FOREIGN KEY (canvas_version_id) REFERENCES public.canvas_versions(id) ON DELETE CASCADE
);
CREATE TABLE public.requirements (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  requirement_group_id integer NOT NULL,
  model_id integer,
  content character varying,
  is_required boolean NOT NULL DEFAULT true,
  weight integer NOT NULL DEFAULT 1,
  type character varying NOT NULL DEFAULT 'Pass/Fail'::character varying,
  threshold numeric,
  reasoning_effort character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT requirements_pkey PRIMARY KEY (id),
  CONSTRAINT requirements_requirement_group_id_fkey FOREIGN KEY (requirement_group_id) REFERENCES public.requirement_groups(id) ON DELETE CASCADE,
  CONSTRAINT requirements_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE SET NULL
);
CREATE TABLE public.evaluations (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  requirement_id integer NOT NULL UNIQUE,
  score numeric NOT NULL,
  explanation character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT evaluations_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE TABLE public.responses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  canvas_version_id integer NOT NULL UNIQUE,
  content character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT responses_pkey PRIMARY KEY (id),
  CONSTRAINT responses_canvas_version_id_fkey FOREIGN KEY (canvas_version_id) REFERENCES public.canvas_versions(id) ON DELETE CASCADE
);
CREATE TABLE public.files (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  prompt_id integer,
  name character varying NOT NULL,
  url character varying NOT NULL,
  mime_type character varying NOT NULL,
  file_size integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE SET NULL
);
CREATE TABLE public.roles (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  description character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permissions (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  description character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.role_permissions (
  role_id integer NOT NULL,
  permission_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE
);
CREATE TABLE public.user_roles (
  user_id integer NOT NULL,
  role_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE
);
CREATE TABLE public.accounts (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  account_id text NOT NULL,
  provider character varying NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamp with time zone,
  refresh_token_expires_at timestamp with time zone,
  scope text,
  id_token text,
  password character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.sessions (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  ip_address character varying,
  user_agent character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE TABLE public.tools (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  prompt_id integer NOT NULL,
  type character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tools_pkey PRIMARY KEY (id),
  CONSTRAINT tools_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE CASCADE
);

CREATE TABLE public.verifications (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  type character varying NOT NULL,
  identifier character varying NOT NULL,
  value character varying NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT verifications_pkey PRIMARY KEY (id)
);
