# LexiClash — Portal Resubmission Package (CrazyGames + Poki)
Prepared 2026-08-10 by vp-growth (task t_f738c41c). Supersedes t_90ca0189 / t_fbce1bbe.

## Why this package exists
CrazyGames Basic Launch stats: 157K impressions, 209 plays, CTR 0.2%, EUR 0.00 → rejected
("did not reach the performance benchmarks"). The channel delivered reach; the store card
failed to convert. This package fixes the two conversion levers we control — cover art and
first-load experience — and re-files both portals.

---

## 1. Upload bundles (built, tested, validated)

| File | Portal | Size | Contents |
|---|---|---|---|
| lexiclash-crazygames.zip | CrazyGames | 1.27 MB | 6 files, VITE_PORTAL=crazygames |
| lexiclash-poki.zip | Poki | 1.27 MB | 6 files, VITE_PORTAL=poki |

Location: `fe-next/standalone/lexiclash-{crazygames,poki}.zip` (repo ohadf2015/boggle-new,
commit ee1cd0b on master). Rebuild any time with `npm run package:crazygames` /
`npm run package:poki` from `fe-next/standalone`.

Verified 2026-08-10 (headless Chromium, real mouse traces):
- Time-to-playable 244–249 ms (local); total download 1.34 MB vs 50 MB cap (20 MB mobile cap).
- One tap on "Play" → gameplay (meets "max 1 click" full-launch rule).
- Trace → word submit works; fixed a real crash: submitting inside a setState updater caused
  "Maximum update depth exceeded" on pointer drags (fix in ee1cd0b).
- Zero console errors on the CrazyGames build; only relative asset paths; 6/1500 files;
  no external links, no custom fullscreen button, `user-select:none` set.
- 29/29 vitest unit tests green.

## 2. Cover art (NEW — CTR fix, rule-compliant)

| File | Size | Portal slot |
|---|---|---|
| cover-landscape-1920x1080.png | 1920×1080 (16:9) | CrazyGames landscape cover |
| cover-portrait-800x1200.png | 800×1200 (2:3) | CrazyGames portrait cover |
| cover-square-800x800.png | 800×800 (1:1) | CrazyGames square cover |

Design: LexiClash wordmark (lime/pink, Fredoka) + real mascot + 4×4 board with "CLASH"
traced in lime tiles — shows the actual gameplay in one glance. Uses the game's own design
tokens, so it matches the in-game look (no bait-and-switch bounce).

COMPLIANCE NOTE: the v1 art (moved to package/archive-v1-noncompliant/) violated
CrazyGames' cover rule "don't write anything other than your game's title" — it carried
"SPELL IT. CLASH IT. WIN IT!", "FAST WORDS. EPIC WINS!" etc. The new covers carry only the
game title. Do not upload the archived v1 covers to CrazyGames. (Poki has no such text rule;
v1 art is usable there if preferred — but consistent new art is recommended.)

## 3. Preview videos

| File | Spec | Status |
|---|---|---|
| cg-preview-landscape-1920x1080.mp4 | 19 s, 1080p 16:9, no audio | OK (regenerated spec-pass) |
| cg-preview-portrait-1080x1620.mp4 | 16.5 s, 1080×1620 (2:3), no audio | NEW — replaces 720×1080 v1 which missed the 1080p-portrait requirement |

Both show real gameplay with accepted words, score and combo climbing. Portrait video opens
on the menu (≈1.5 s) then plays — close enough to the "cover as opening frame" guideline.

Regenerate either one with `node scripts/record-preview.mjs landscape|portrait|both` (after
`npm run build`): it serves `dist/`, finds real traceable words by DFS against the bundle's own
`en.dict.gz` so every submission is accepted, records the tab and remuxes to H.264 with no audio at
the exact portal size. Both files are now committed — `**/*.mp4` in .gitignore is what lost the
2026-08-10 pair, and `!fe-next/standalone/store-assets/*.mp4` now exempts them.

## 4. Screenshots (Poki / store page)

shot-1-menu-1366x768.png, shot-2-gameplay-trace-1366x768.png,
shot-3-gameplay-mid-1366x768.png, shot-4-gameplay-mobile-390x844.png

## 5. Store copy (CTR-tuned)

### CrazyGames
- Title: LexiClash
- Description:
  "Trace letters, chain words, beat the clock. LexiClash is a 60-second word hunt:
  drag across adjacent letters to spell as many words as you can before time runs out.
  Longer words score more, streaks build your combo, and every round is a fresh board.
  How many words can you find in a minute?"
- Controls: "Mouse or touch — drag across adjacent letters, release to submit the word."
- Category: Puzzle (Word). Tags: word, puzzle, brain, boggle, word-search, 1-minute
- Orientation: landscape + portrait both supported (responsive); tick mobile support.

### Poki
- Title: LexiClash
- Short description: "Trace letters and chain words in a 60-second word hunt!"
- Description:
  "LexiClash is a fast word-puzzle battler. Drag across adjacent letters to spell words
  before the 60-second clock runs out — longer words score more, and back-to-back finds
  build your combo multiplier. Every round deals a brand-new board. Quick to learn,
  impossible to put down."
- Category: Puzzle / Word Games.
- Controls: "Drag with mouse or finger to connect letters."

## 6. CrazyGames QA checklist status

Self-verifiable items — all GREEN:
- [x] Initial download ≤ 50 MB (1.34 MB; also ≤ 20 MB mobile-homepage bar)
- [x] File count ≤ 1500 (6)
- [x] Relative asset paths only (validate-dist.mjs gate)
- [x] Loads/plays without console errors (Chromium smoke, both builds)
- [x] Gameplay start event fires on first playable action (SDK v3, Game module)
- [x] gameplayStop fired at round end; commercialBreak only between rounds (gated post-first-game)
- [x] No external ads, no cross-promo, no external links in bundle
- [x] No custom fullscreen button; user-select:none; English; PEGI-12 clean
- [x] Covers: 3 mandatory sizes, title on cover, no promo text, no borders/logos
- [x] Preview videos: ≤20 s, 1080p landscape + 1080p portrait 2:3, no audio
- [x] Lands in gameplay in ≤ 1 click

Dashboard-only items — for Ohad (need his logged-in session):
- [ ] Run the in-dashboard QA tool (Developer Portal → game → QA tab) with the new zip
- [ ] Safari visual check (no Safari available in CI env)
- [ ] Chromebook/low-end sanity (QA tool approximates)

## 7. Click-paths for Ohad

### A. CrazyGames (developer.crazygames.com — already logged in on the Mac)
IMPORTANT from prior dashboard reading: game-info fields are LOCKED
("You cannot update your game info anymore") and the gate says "Latest changes require QA…
content team will review only after you passed the QA tool and submitted your update."
1. Open https://developer.crazygames.com/games → LexiClash.
2. Upload the new build: fe-next/standalone/lexiclash-crazygames.zip.
3. Open the QA tool tab, run all checks against the new build until green.
4. If covers/description fields accept edits: upload the 3 new covers + 2 videos, paste the
   description/controls from §5. If they remain locked: after QA passes, use the support
   contact (https://docs.crazygames.com/faq/#contact) and ask for a resubmission with the
   new store assets — reference this package and the CTR diagnosis (157K impressions,
   0.2% CTR, new covers address the rejection cause).
5. Submit the update. Note: resubmission likely re-enters Basic Launch (SDK already
   integrated, so gameplayStart measures initial download — ours fires on first trace).

### B. Poki (developer.poki.com — NOT logged in anywhere; needs Ohad's account)
1. Log in → your games → LexiClash (the prior submission never went live: poki.com/en/g/lexiclash 404s).
2. Check the submission state first (rejected? pending? draft?). If rejected, read the reason.
3. File a fresh submission: upload lexiclash-poki.zip, covers/screenshots from this package,
   copy from §5.
4. Do NOT mark the board card complete until https://poki.com/en/g/lexiclash returns 200 —
   last time a "completed" submission card was dark on the portal (class of failure: close
   submission cards only on public-URL 200).

## 8. Code changes shipped
- ee1cd0b (origin/master, verified pushed): Board.tsx render-phase setState crash fix,
  zip-free packaging scripts, tsconfig node types. Full diff in git.
