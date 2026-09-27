-- Migration: Update collectible_items image_url from .png to .webp
-- Context: Badge images were migrated from PNG to WebP format but database URLs were not updated

-- Update all badge image URLs from .png to .webp
UPDATE collectible_items
SET image_url = REPLACE(image_url, '.png', '.webp')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%.png'
  AND category = 'badge';

-- Also update avatar image URLs if they exist
UPDATE collectible_items
SET image_url = REPLACE(image_url, '.png', '.webp')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%.png'
  AND category = 'avatar';

-- Add comment for future reference
COMMENT ON TABLE collectible_items IS 'Collectible items catalog. Image URLs should use .webp format.';
