-- blast_combo_codex
-- Persists Combo Codex discovery progress per player.
-- Uses additive merge: discovered_combos never shrinks.

CREATE TABLE IF NOT EXISTS blast_combo_codex (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discovered_combos text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE blast_combo_codex ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own record
CREATE POLICY "Users can view own combo codex"
  ON blast_combo_codex FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own combo codex"
  ON blast_combo_codex FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own combo codex"
  ON blast_combo_codex FOR UPDATE
  USING (auth.uid() = user_id);
