-- Add cover_image_url column to community_boards
ALTER TABLE community_boards
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create storage bucket for UGC board cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-covers',
  'board-covers',
  true,
  2097152, -- 2MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read public board covers
CREATE POLICY "Public board covers are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'board-covers');

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload board covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'board-covers'
    AND auth.role() = 'authenticated'
  );

-- RLS: Users can delete their own uploads
CREATE POLICY "Users can delete own board covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'board-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
