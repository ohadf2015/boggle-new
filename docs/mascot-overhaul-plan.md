# Mascot Overhaul Plan: Lexi 2.0

## Character Style
Kawaii marshmallow cube — same as existing mode cards and comeback GIF.
Comedy comes from **situations and reactions**, not character redesign.
Oversized props, physical comedy, exaggerated reactions, persistent energy.

## 20 Variants Needed

| # | Variant | Type | Description |
|---|---|---|---|
| 1 | happy | GIF | Bouncing → leaping with sparkles |
| 2 | gaming | GIF | Gripping controller → frantic button mashing |
| 3 | thinking | GIF | Chin on fist → lightbulb eureka moment |
| 4 | oops | GIF | Banana peel step → flat on back, dizzy stars |
| 5 | celebration | GIF | Party popper pull → buried in confetti |
| 6 | dj | GIF | Oversized headphones blind → head bobbing, notes flying |
| 7 | trophy | GIF | Dragging giant trophy → sitting on it like throne |
| 8 | panic | GIF | Staring at alarm clock → running in blur circle |
| 9 | crying | GIF | Lip wobbling with tissue → fountain tears, floor pounding |
| 10 | onfire | GIF | Poking flame on head → riding flame with sunglasses |
| 11 | bored | GIF | Drooping eyelids, cobweb → asleep standing, snot bubble |
| 12 | mindblown | GIF | Reading book, eyes growing → Home Alone hands on cheeks |
| 13 | encouraging | GIF | Holding "GO!" sign → aggressive fist pumps, headband |
| 14 | explorer | GIF | Safari hat over eyes, map upside down → heroic pose on rock |
| 15 | flexing | GIF | Straining noodle arms → one comically buff arm, wink |
| 16 | scared | GIF | Peeking from blanket → jumping into cardboard box |
| 17 | shopkeeper | GIF | Apron + monocle presenting → wheeler-dealer SALE sign |
| 18 | spectating | GIF | Tiny chair, popcorn → standing screaming, face paint |
| 19 | waving | GIF | Shy hand rising → frantic two-hand wave blur |
| 20 | powerup | GIF | Glowing hands confusion → floating, cape, hero landing |

## Animation Pipeline
1. Generate start + end frame images (Midjourney / AI image gen)
2. Animate with Runway Gen-3 (upload 2 frames → interpolated video)
3. Export as GIF
4. Run `/remove-bg-gif` for transparency
5. Compress with `gifsicle -O3 --lossy=80 --resize-width 200`
6. Target: <500KB per GIF

## Codebase Migration
1. Drop new GIFs into `/public/mascot/` (same filenames)
2. Archive old GIFs to `/public/mascot/v1/`
3. Redraw `PlacementMascot.tsx` inline SVG
4. Verify all 20 variants render
5. Update any hardcoded paths (DJMascot, ComebackBonusModal)

## Base Prompt
kawaii marshmallow cube character, simple rounded white body with rosy cheeks, tiny stubby arms and legs, big round expressive eyes, cute single tooth smile, soft pastel shading, clean white background, centered, high quality digital art, smooth cel shading, adorable chibi proportions
