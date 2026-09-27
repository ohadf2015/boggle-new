# LexiClash IRL Sticker Pack — Print Guide

10 die-cut stickers, 300 DPI, transparent PNG. Every QR was **decode-verified from the
final rendered file** (OpenCV scans it back to the exact URL) — they will scan.

## What's here
**Classic pack** (`out/sticker_*.png`) — 3"×3" square, mascot + punchline + QR.
| File | Line | Accent |
|---|---|---|
| sticker_1_smug   | SCAN IF YOU THINK YOU'RE SMART | pink |
| sticker_2_battle | 30 SECONDS. GET DESTROYED.     | lime |
| sticker_3_cheeky | YOUR VOCABULARY IS SHOWING     | cyan |
| sticker_4_sly    | SCAN TO START A FIGHT          | purple |

**Street pack** (`out/street_*.png`) — 2.4"×3.7" "pole-slap" tower. The **kicker** calls
back the surface it's stuck on (the real→virtual blink); the headline is the dare.
| File | Stick it on… | Kicker → Headline |
|---|---|---|
| street_1_stopsign | a stop sign       | YES, THE STOP SIGN. → Stop scrolling. Start spelling. |
| street_2_meter    | a parking meter   | TICK. TOCK. → Your round started already. |
| street_3_trashbin | a trash bin       | FOUND YOUR VOCABULARY. → Want a better one? |
| street_4_bench    | a bench / bus stop| BORED ON THIS BENCH? → 30 seconds. One round. Go. |
| street_5_mirror   | a mirror / window | THAT'S YOU. HI. → Out-spell a cube? Doubt it. |
| street_6_door     | a shop/café door  | BEFORE YOU GO IN — → Bet you can't spell it. |

## QR / tracking
- Encodes `https://www.lexiclash.live/?utm_source=sticker&utm_medium=irl&utm_campaign=mascot`.
- That UTM is the ONLY way to measure whether stickers convert — it shows up in PostHog as
  `utm_source=sticker`. **Can't be retrofitted onto printed stickers**, so it's baked in now.
- Error-correction level Q (~25% scuff/peel tolerance) + a full quiet zone. QR is ~0.8"+
  on a light cream panel = scannable from arm's length and after wear.

## Send to a printer (Sticker Mule / StickerApp / local)
- **Cut line = die-cut / "contour cut" to the rounded shape.** The art already includes the
  white border + ~3mm full bleed; just say "die-cut, transparent background."
- Material: **white vinyl, gloss or matte laminate** (laminate = weatherproof for street use).
- ⚠️ **Neon shift (the one real gotcha):** `#BFFF00` lime and `#FF1493` pink are outside the
  CMYK print gamut — they'll print a bit duller/darker than they look on screen. For true
  electric punch, ask the printer for a **5th-color / fluorescent (neon) ink** option, or
  accept the slightly muted CMYK version. The QR (black on cream) is unaffected.
- Keep 300 DPI. Don't let any tool downscale; don't re-compress to JPG (kills QR edges).

## Legal / placement
Sticking on public/private property (signs, meters, bins) can be vandalism depending on
city — use lamp-post community boards, your own windows, café tip-jars (with permission),
events, laptops, and hand-outs to stay clean. The wit lands the same on a friend's laptop.

## Regenerate / edit
```bash
cd stickers
.venv/bin/python3 build_sticker.py --mascot assets/cut-smug.png \
  --caption "NEW LINE\nSECOND LINE" --accent pink --out out/new.png
.venv/bin/python3 build_street.py  --mascot assets/cut-sly.png \
  --kicker "SURFACE CALLBACK." --headline "Punch\nline." --accent cyan --out out/new.png
```
Both scripts re-run the decode check and print `OK`/`FAIL`. New mascot poses: generate on
flat white via Higgsfield (anchor to `fe-next/public/mascot-new-main.jpg`), then
`.venv/bin/python3 keyout.py` to cut them out.

---

# Die-Cut Vinyl Pack (10 cm, transparent, no card) — `out/diecut/`

Matches the irregular die-cut vinyl reference (cookie/cat style): silhouette-follows-art,
**re-grown uniform white contour**, transparent background, long edge = **10 cm @ 300 DPI**.

**Scene family** (mascot fused with a street element, self-contained, small QR tag):
`bus · busstop · sign · light · scooter · trash`

**Merge family** (`merge-*`, NO QR — designed to overlap REAL objects):
- `merge-peek` — peeks up over a horizontal rim → stick the flat bottom edge on a **real
  trash-can lid / monitor / fence / sign top**; mascot pops above the real edge.
- `merge-climb` — hauling itself over a ledge → real wall-top / box / shelf edge.
- `merge-sidepeek` — peeks around a vertical edge → stick the right edge on a **real pole /
  door frame / sign post**; mascot hides behind the real thing.

## Pipeline (so it's reproducible)
`build_diecut.py`: flood-fills ALL background white from the edges (the AI's own white
border is the same white as the bg, so it gets removed too), keeps the largest connected
blob (a real die-cut is ONE piece — floating bits fall off / are unprintable), then
**dilates the alpha** to grow a fresh clean white border + a thin dark keyline, and resizes
to 10 cm. Re-run any scene: `.venv/bin/python3 build_diecut.py --src assets/scene-X.png --out out/diecut/X.png [--no-qr]`.

## Printer notes for these
- Order **die-cut / contour-cut, transparent**. The white border + keyline are baked in.
- Merge stickers: tell the printer the cut follows the outer white edge **including the
  straight grip edge** — that straight edge is the part you align to the real-world rim.
- Same neon-CMYK caveat applies to the pink helmet; everything else is in-gamut.

---

# QR tab (updated) + Swag pack

**QR is now a CONNECTED TAB**, not an overlay: it hangs below the art and bridges into the
white die-cut border, so the whole thing prints as ONE piece and the QR never hides the
illustration. Each QR carries a **per-sticker `utm_content`** (e.g. `utm_content=trash`),
so PostHog shows which design drives scans. Every build **decodes the QR back from the final
10 cm pixels** (`QR-OK`) — verified scannable at print size.

URL pattern: `https://www.lexiclash.live/?utm_source=sticker&utm_content=<slug>`

## Swag pack — `out/swag/` (hand-outs for friends)
Cool mascot die-cut + accent flex-banner + QR tab. 10 cm, transparent, one piece.
| File | Pose | Flex line |
|---|---|---|
| shades | sunglasses, arms crossed | CERTIFIED WORD BRAWLER |
| trophy | lifting gold trophy | PROFESSIONALLY UNBEATABLE |
| peace  | peace sign + wink | ASK ME ABOUT MY STREAK |

Make more swag (any pose + line + accent):
```bash
.venv/bin/python3 build_diecut.py --src assets/swag-trophy.png --out out/swag/x.png \
  --slug swag-x --caption "BORN TO SPELL" --accent purple
```
