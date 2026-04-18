-- Drop broad SELECT policies on public buckets (advisor 0025).
-- Public buckets serve object GETs via CDN bypassing RLS; these policies
-- only enable SDK enumeration (.list/.download) which the app never uses.
-- Removing them stops filename harvesting without breaking hotlinked URLs.

DROP POLICY IF EXISTS "Public board covers are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for daily-challenges"      ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures"             ON storage.objects;
