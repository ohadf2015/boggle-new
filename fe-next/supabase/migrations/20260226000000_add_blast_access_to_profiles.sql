-- Add blast_access column to profiles table
-- Allows admins to grant blast mode access to specific players
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blast_access BOOLEAN DEFAULT FALSE NOT NULL;

-- Only admins can update this column (players cannot self-grant)
CREATE POLICY "Admin can update blast_access" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.is_admin = TRUE
    )
  )
  WITH CHECK (TRUE);
