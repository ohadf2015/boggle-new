# Education Pro Assets Manifest

## Overview
Three visual assets for `/teacher/upgrade` page and `ClassLimitUpsellModal`. All follow neo-brutalist design (dark navy ground #1a1a2e, hard-edged pixel shadows, solid black borders, electric colors: lime #BFFF00, cyan #00FFFF, pink #FF1493, purple #8B5CF6). **ZERO baked text** across all assets — all UI copy lives in page HTML via `t()` localization.

## Assets

### pro-hero (Classroom Celebration Loop)
**Purpose**: Decorative hero video for `/teacher/upgrade` page. Energetic classroom scene showing students celebrating Pro features.

**Files**:
- `pro-hero.mp4` (234 KB, 960×540, 4s, h264 preset fast crf 28)
- `pro-hero.webm` (270 KB, VP9 preset fast crf 32)
- `pro-hero-poster.webp` (12 KB, first frame as poster)

**Description**: Dark navy isometric classroom, bright students with hands raised high in genuine upward motion celebrating, letter tiles actively falling from top with visible motion trails in lime and cyan colors, kawaii mascot in center bouncing with raised arms in celebration. Hard-edged pixel art style, solid black borders, no gradients.

**Motion verification**: Palindrome loop (first 2s forward + reversed) measured SSIM 0.418 (frame 0 vs frame 2s midpoint), confirming visible real motion well below 0.92 threshold.

**Localization**: No text, no numbers, no UI chrome. All copy supplied by page.

---

### cap-hit (Free-Tier Limit Unlock)
**Purpose**: Compact dashboard modal asset shown in `ClassLimitUpsellModal` when teacher hits free-tier class limit. Communicates opportunity contrast: what's blocked vs what's on the other side.

**Files**:
- `cap-hit.mp4` (54 KB, 512×512, 3s, h264 preset fast crf 28)
- `cap-hit.webm` (79 KB, VP9 preset fast crf 32)
- `cap-hit-poster.webp` (2 KB, first frame as poster)

**Description**: Dark navy #1a1a2e background. Bright pink/magenta door frame on left side (solid black outline, hard 2px offset shadow) swings open with visible motion. Reveals packed classroom overflowing with many students at desks learning, colorful lime and cyan geometric book/papers floating. Flat vector style: solid black outlines, hard offset shadows (zero blur), no gradients, no glow. Semantic reading: the cap wall opens onto abundance, not emptiness.

**Motion verification**: Palindrome loop (first 1.5s forward + reversed) measured SSIM 0.805 (frame 0 vs frame 1.5s midpoint), confirming visible real motion below 0.92 threshold.

**Localization**: No text, no numbers, no UI chrome. All copy supplied by modal.

---

### pro-unlocks (Feature Comparison Infographic)
**Purpose**: Static infographic for upgrade page comparison: what's included in free tier vs Pro tier.

**Files**:
- `pro-unlocks.webp` (65 KB, 1168×880, cwebp -q 85)

**Description**: Hard-edged split composition on dark navy background. Left side: 2 stacked limited classrooms with padlocks (desaturated grey, muted colors, limited capability visual). Right side: 4 stacked unlimited classrooms with visible students (lime and cyan bright, energetic, abundant). All shapes use solid black borders and hard 2px offset shadows (zero blur). No text, no soft effects, no glow.

**Localization**: No text, no numbers, no UI chrome. All feature list labels supplied by page via HTML.

---

## Weight Budget
- Pro-hero total: 516 KB (mp4 + webm + poster)
- Cap-hit total: 135 KB (mp4 + webm + poster)
- Pro-unlocks: 65 KB
- **Grand total: 716 KB** (under 900 KB budget)

## Encoding Notes
- **Video codecs**: h264 mp4 (preset fast, crf 28), VP9 webm (preset fast, crf 32, b:v 0)
- **Still format**: WebP (cwebp -q 85)
- **Resolution**: Pro-hero 960×540 (16:9), Cap-hit 512×512 (1:1), Pro-unlocks 1168×880
- **Seamless loops**: Pro-hero and cap-hit use palindrome structure (forward + reversed to eliminate loop seam) with verified motion SSIM ≤ 0.92
- **Posters**: Extracted from actual video first frame to guarantee consistency

## Usage Notes
- All three assets are **purely decorative** (pro-hero) **or informational** (cap-hit, pro-unlocks)
- No pixel-coordinate overlay regions — all text flows normally in page/modal HTML
- All copy localization via `t()` in component code, never embedded in images
- Videos use flexbox/max-width responsive scaling, posters scale with container
- No hard-coded dimensions for text overlay or positioning
