-- app_secrets — server-only key/value secret store (e.g. rotatable Higgsfield token).
-- SECURITY: RLS enabled with NO policies → only the service role (which bypasses
-- RLS) can read/write. The anon/auth clients can never select these rows.
-- See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B §6b).

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: locks the table to the service role only.

COMMENT ON TABLE public.app_secrets IS
  'Server-only secrets (service-role access only; RLS on with no policies). e.g. higgsfield_token, rotatable live via /api/admin/higgsfield-token.';
