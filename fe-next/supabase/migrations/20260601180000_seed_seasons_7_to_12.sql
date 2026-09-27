-- Seed seasons 7-12 (monthly cadence continuing from season 6's 2026-10-01 end).
-- Matches the client SEASON_CATALOG identities in fe-next/lib/seasons.ts
-- (theme / tagline / accent_color / twist art). Idempotent — safe to re-run.
INSERT INTO public.seasons (id, name, theme, tagline, accent_color, status, start_date, end_date, image_url, description)
VALUES
  (7,  'Season 7: Frost Lexicon',   'Frost Lexicon',   'Cool letters, hot streaks',        '#7DD3FC', 'active', '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z', '/seasons/season-7-frost-lexicon.jpg',   'Keep your streak warm while the board freezes over.'),
  (8,  'Season 8: Neon Nights',     'Neon Nights',     'The board comes alive after dark', '#E040FB', 'active', '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z', '/seasons/season-8-neon-nights.jpg',     'Neon trails follow every word you find.'),
  (9,  'Season 9: Solar Surge',     'Solar Surge',     'Burn bright, score brighter',      '#FF8A00', 'active', '2026-12-01T00:00:00Z', '2027-01-01T00:00:00Z', '/seasons/season-9-solar-surge.jpg',     'The longer your run, the hotter the board glows.'),
  (10, 'Season 10: Verdant Vault',  'Verdant Vault',   'Grow your lead, word by word',     '#34D399', 'active', '2027-01-01T00:00:00Z', '2027-02-01T00:00:00Z', '/seasons/season-10-verdant-vault.jpg',  'Every find plants the next. Watch your score blossom.'),
  (11, 'Season 11: Cosmic Cipher',  'Cosmic Cipher',   'Decode the stars',                 '#818CF8', 'active', '2027-02-01T00:00:00Z', '2027-03-01T00:00:00Z', '/seasons/season-11-cosmic-cipher.jpg',  'Letters drift like constellations across the grid.'),
  (12, 'Season 12: Crimson Crown',  'Crimson Crown',   'The final ascent',                 '#FB7185', 'active', '2027-03-01T00:00:00Z', '2027-04-01T00:00:00Z', '/seasons/season-12-crimson-crown.jpg',  'The year closes — every point writes the record books.')
ON CONFLICT (id) DO NOTHING;
