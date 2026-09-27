# LexiClash portal art

Neo-brutalist key art (kawaii mascot + letter grid + "LexiClash" wordmark), generated
via GPT Image 2. Source masters are PNG; the per-portal exact-dimension crops are JPG.

## Assets → portal slots
| File | Dims | Use |
|---|---|---|
| `lexiclash-cover-16x9.png` | 1344×752 | landscape master |
| `lexiclash-cover-portrait-2x3.png` | 688×1024 | portrait master |
| `gd-512x512.jpg` / `gd-512x384.jpg` / `gd-200x120.jpg` | as named | **GameDistribution** required thumbnails (uploaded ✅) |
| `gd-1280x720.jpg` | 1280×720 | GameDistribution marketing (uploaded ✅) |
| `cg-landscape-1920x1080.jpg` | 1920×1080 | **CrazyGames** cover — landscape 16:9 |
| `cg-portrait-800x1200.jpg` | 800×1200 | CrazyGames cover — portrait 2:3 |
| `cg-square-800x800.jpg` | 800×800 | CrazyGames cover — square 1:1 |

Also reusable for **Poki** thumbnail + app-store listings.

## CrazyGames upload status (2026-07-19)
Covers ready but the CG dev-portal cover upload returned server errors (400/401/403/500)
during a CrazyGames data-warehouse migration ("data inconsistencies after June 16" banner).
Retry the Art → Upload New Art flow when the CG portal is stable. CG cover slots:
Landscape 1920×1080, Portrait 2:3 800×1200, Square 1:1 800×800 (+ landscape/portrait
preview videos, which we don't have yet — a gameplay capture is the remaining CG asset).

## Regenerate
`higgsfield generate create gpt_image_2 --prompt "<neo-brutalist LexiClash key art…>" --aspect_ratio 16:9|2:3 --resolution 1k --quality medium --wait`
then crop with ImageMagick: `magick <src> -resize WxH^ -gravity center -extent WxH -quality 92 out.jpg`.
