# Word Tower v2 — Empire art pack

All files in `public/images/word-tower-v2/empire/` (URL `/images/word-tower-v2/empire/<file>`). Generated 2026-09-19 with Higgsfield GPT Image 2.5 (native transparent bg), one shared style prefix (`/tmp/wt2/art/STYLE.txt`): thick black outlines, flat cel shading, lime/pink/cyan/yellow/purple palette, kawaii, no text baked in. Post-processed with sharp (`/tmp/wt2/art/process.cjs` = District 1 + items + backdrops, `/tmp/wt2/art/process2.cjs` = Districts 2-3 + fx), raw sources in `/tmp/wt2/art/raw/`, contact sheet `/tmp/wt2/art/sheet.png`. Alpha verified: every sprite corner alpha = 0.

## Districts → plot types

| district | name | backdrop | plot types (plot 0..4, file id) | base tile look |
|---|---|---|---|---|
| 1 | Downtown | `bg-downtown.webp` | bakery, apartments, library, clocktower, garden | grass + pavement |
| 2 | Harbor | `bg-harbor.webp` | fishmarket, lighthouse, boathouse, warehouse, ferry | wooden dock planks + pavement |
| 3 | Neon Skyline | `bg-neon.webp` | arcade, hotel, skytower, radiomast, club | dark navy pavement + lime neon edge |

## Buildings — conventions

- File: `bld-<type>-<stage>.webp` (type ids above; all 15 distinct).
- Stage by plot level: `l0` = level 0-1 (lot + foundation), `l2` = level 2-3 (scaffold + crane), `l4` = level 4 (complete), `l5` = level 5 (landmark, gold trim + flag + sparkles).
- Every building sprite is a fixed **384x512** transparent canvas. The lot base tile is **~272 px wide** (269-272) in every type, its bottom edge sits on the canvas bottom (y=512), centered at x=192. Draw with anchor **(0.5, 1)** at the plot ground point: all 60 sprites share one ground line and one scale.
- Camera: the same slight 3/4 front view from above; each type's 4 stages came from ONE generation, so they match exactly.
- Damage: overlay `fx-damaged.webp` over any building (bottom-center anchor, ~0.8x building width); it contains no building.

## Files

| file | size (px) | KB | kind | for | anchor / ground |
|---|---|---|---|---|---|
| bld-bakery-l0.webp | 384x512 | 14.1 | building | bakery — lot + foundation (level 0-1) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-bakery-l2.webp | 384x512 | 27.5 | building | bakery — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-bakery-l4.webp | 384x512 | 23.2 | building | bakery — complete (level 4) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-bakery-l5.webp | 384x512 | 30.7 | building | bakery — landmark gold trim (level 5) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-apartments-l0.webp | 384x512 | 13 | building | apartments — lot + foundation (level 0-1) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-apartments-l2.webp | 384x512 | 39.3 | building | apartments — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-apartments-l4.webp | 384x512 | 27.2 | building | apartments — complete (level 4) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-apartments-l5.webp | 384x512 | 37.4 | building | apartments — landmark gold trim (level 5) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-library-l0.webp | 384x512 | 15.3 | building | library — lot + foundation (level 0-1) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-library-l2.webp | 384x512 | 33.1 | building | library — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-library-l4.webp | 384x512 | 21.4 | building | library — complete (level 4) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-library-l5.webp | 384x512 | 31.7 | building | library — landmark gold trim (level 5) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-clocktower-l0.webp | 384x512 | 12.5 | building | clocktower — lot + foundation (level 0-1) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-clocktower-l2.webp | 384x512 | 32.8 | building | clocktower — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-clocktower-l4.webp | 384x512 | 20.5 | building | clocktower — complete (level 4) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-clocktower-l5.webp | 384x512 | 27 | building | clocktower — landmark gold trim (level 5) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-garden-l0.webp | 384x512 | 15.3 | building | garden — lot + foundation (level 0-1) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-garden-l2.webp | 384x512 | 33.7 | building | garden — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-garden-l4.webp | 384x512 | 33.5 | building | garden — complete (level 4) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| bld-garden-l5.webp | 384x512 | 47 | building | garden — landmark gold trim (level 5) | canvas 384x512; base tile bottom edge = canvas bottom (y=512); base tile centered at x=192; anchor (0.5,1) |
| fx-damaged.webp | 364x384 | 27 | overlay | damage overlay (cracks, smoke, flames, rubble) for any building | trimmed; place bottom-center on building sprite, scale width to ~0.8x building width |
| chest-common-closed.webp | 316x268 | 12.7 | item | common chest closed | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| chest-common-open.webp | 328x384 | 21.7 | item | common chest open (coins) | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| chest-rare-closed.webp | 311x297 | 16 | item | rare chest closed | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| chest-rare-open.webp | 375x384 | 33 | item | rare chest open (coins + gems) | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| chest-epic-closed.webp | 300x266 | 16.5 | item | epic chest closed | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| chest-epic-open.webp | 361x384 | 34.1 | item | epic chest open (coins, gold brick, gems) | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| shield.webp | 247x286 | 12.3 | item | shield intact (raid blocked / shield count) | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| shield-broken.webp | 272x320 | 18.2 | item | shield broken (raid broke a shield) | trimmed; shared scale within pair; anchor (0.5,1) bottom-center |
| coin.webp | 121x128 | 6 | item | single coin (HUD, fly-to-counter) | trimmed; anchor (0.5,0.5) center |
| coin-stack.webp | 236x256 | 19.7 | item | coin pile (rewards, stolen coins) | trimmed; anchor (0.5,0.5) center |
| wrecking-ball.webp | 185x256 | 9 | item | raid / wreck attack | trimmed; chain top at y=0 -> anchor (0.5,0) to swing from top |
| golden-brick.webp | 256x229 | 11.5 | item | golden brick (rare chest drop) | trimmed; anchor (0.5,0.5) center |
| blueprint.webp | 256x175 | 12 | item | blueprint scroll (epic chest drop / upgrade) | trimmed; anchor (0.5,0.5) center |
| repair.webp | 225x256 | 14.4 | item | repair action (damaged plot) | trimmed; anchor (0.5,0.5) center |
| revenge.webp | 244x256 | 17.4 | item | revenge badge (raids on you not avenged) | trimmed; anchor (0.5,0.5) center |
| crown.webp | 256x223 | 16.6 | item | #1 rival / leaderboard crown | trimmed; anchor (0.5,0.5) center |
| bg-downtown.webp | 1600x600 | 53.8 | backdrop | District 1 Downtown — day skyline (webp q80) | opaque; ground band along bottom; seamless horizontal tile (edge crossfade) |
| bg-harbor.webp | 1600x600 | 33.8 | backdrop | District 2 Harbor — sunset skyline (webp q80) | opaque; ground band along bottom; seamless horizontal tile (edge crossfade) |
| bg-neon.webp | 1600x600 | 43.9 | backdrop | District 3 Neon Skyline — night (webp q80) | opaque; ground band along bottom; seamless horizontal tile (edge crossfade) |
| bld-fishmarket-l0.webp | 384x512 | 11.8 | building | harbor: fishmarket — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-fishmarket-l2.webp | 384x512 | 26.3 | building | harbor: fishmarket — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-fishmarket-l4.webp | 384x512 | 25.9 | building | harbor: fishmarket — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-fishmarket-l5.webp | 384x512 | 35.6 | building | harbor: fishmarket — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-lighthouse-l0.webp | 384x512 | 10.7 | building | harbor: lighthouse — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-lighthouse-l2.webp | 384x512 | 30.5 | building | harbor: lighthouse — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-lighthouse-l4.webp | 384x512 | 20.9 | building | harbor: lighthouse — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-lighthouse-l5.webp | 384x512 | 30.3 | building | harbor: lighthouse — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-boathouse-l0.webp | 384x512 | 11.9 | building | harbor: boathouse — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-boathouse-l2.webp | 384x512 | 27.8 | building | harbor: boathouse — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-boathouse-l4.webp | 384x512 | 19.6 | building | harbor: boathouse — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-boathouse-l5.webp | 384x512 | 27.3 | building | harbor: boathouse — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-warehouse-l0.webp | 384x512 | 15 | building | harbor: warehouse — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-warehouse-l2.webp | 384x512 | 36 | building | harbor: warehouse — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-warehouse-l4.webp | 384x512 | 29 | building | harbor: warehouse — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-warehouse-l5.webp | 384x512 | 40 | building | harbor: warehouse — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-ferry-l0.webp | 384x512 | 14.5 | building | harbor: ferry — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-ferry-l2.webp | 384x512 | 29 | building | harbor: ferry — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-ferry-l4.webp | 384x512 | 22.4 | building | harbor: ferry — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-ferry-l5.webp | 384x512 | 27 | building | harbor: ferry — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-arcade-l0.webp | 384x512 | 14.9 | building | neon: arcade — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-arcade-l2.webp | 384x512 | 29.7 | building | neon: arcade — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-arcade-l4.webp | 384x512 | 23.2 | building | neon: arcade — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-arcade-l5.webp | 384x512 | 30 | building | neon: arcade — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-hotel-l0.webp | 384x512 | 15.3 | building | neon: hotel — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-hotel-l2.webp | 384x512 | 34.2 | building | neon: hotel — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-hotel-l4.webp | 384x512 | 19.6 | building | neon: hotel — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-hotel-l5.webp | 384x512 | 32.6 | building | neon: hotel — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-skytower-l0.webp | 384x512 | 11.6 | building | neon: skytower — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-skytower-l2.webp | 384x512 | 31.8 | building | neon: skytower — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-skytower-l4.webp | 384x512 | 17.7 | building | neon: skytower — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-skytower-l5.webp | 384x512 | 22.9 | building | neon: skytower — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-radiomast-l0.webp | 384x512 | 10.6 | building | neon: radiomast — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-radiomast-l2.webp | 384x512 | 29.2 | building | neon: radiomast — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-radiomast-l4.webp | 384x512 | 28.1 | building | neon: radiomast — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-radiomast-l5.webp | 384x512 | 36.6 | building | neon: radiomast — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-club-l0.webp | 384x512 | 13.9 | building | neon: club — lot + foundation (level 0-1) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-club-l2.webp | 384x512 | 29.2 | building | neon: club — under construction w/ scaffold + crane (level 2-3) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-club-l4.webp | 384x512 | 30.1 | building | neon: club — complete (level 4) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| bld-club-l5.webp | 384x512 | 41.5 | building | neon: club — landmark gold trim (level 5) | canvas 384x512; base tile bottom = y=512, centered x=192; anchor (0.5,1) |
| fx-dust-puff.webp | 256x107 | 9 | fx | landing / impact dust burst | trimmed; flat bottom -> anchor (0.5,1) at the impact point |
| fx-star.webp | 87x96 | 2.2 | fx | sparkle star for upgrade / perfect-landing bursts (tint/scale/rotate freely) | trimmed, symmetric; anchor (0.5,0.5) |

## Notes

- Backdrops are opaque 1600x600 webp; the left 96 px are crossfaded with the wrapped-around right side, so `repeat-x` / a TilingSprite has no hard seam.
- Chest/shield pairs share one scale within the pair (open chest is taller: lid + loot), so swap closed→open in place with a bottom-center anchor.
- `wrecking-ball.webp` chain runs off the top edge: anchor (0.5, 0) and swing from the top.
- `fx-star.webp` is a single yellow 4-point twinkle (96px) — spawn several, scale 0.3-1, rotate, fade for upgrade / perfect-landing bursts. `fx-dust-puff.webp` has a flat bottom: anchor (0.5,1) at the landing point, scale-x up + fade.
- Known softness: `bld-warehouse-l2` (construction) reads almost complete — scaffold is thin; fine at plot size.
