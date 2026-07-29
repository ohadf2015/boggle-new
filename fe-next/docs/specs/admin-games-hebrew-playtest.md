# Admin-Only Games → Hebrew Playtest Readiness

**Date:** 2026-05-29 · **Source:** claude-council (gemini-3-flash + grok-4.20) + 5 code audits

## Games in scope (all admin-gated)
| Game | Route | Council verdict |
|---|---|---|
| Word Forge | `/[locale]/word-forge` | **P0** — unplayable in Hebrew (English-only letters) |
| Word Tower | `/[locale]/word-tower` | **P1** — Hebrew sofit final-forms render wrong (Pixi) |
| Shiritori Solo | `/[locale]/shiritori/solo` | Keep **Japanese-only** (authentic); add onboarding + tests |
| Word Alchemy | `/[locale]/word-alchemy` | English-content (known limitation); add ops onboarding |

## DONE criteria (concrete) — ✅ MET (verified 2026-05-29)
Each game: (1) loads + plays first ~3 min at `/he` without breakage, (2) has first-run guidance, (3) gives **specific** (not generic "invalid") rejection feedback.

**Verification (Playwriter, local dev `/he`):**
- Word Forge: 25/25 Hebrew tiles on a 5×5 board; Hebrew howTo on idle screen; specific reject chip (duplicate/constraint/oath/notWord) + reject SFX + dict-load guard; sofit on selected-word preview.
- Word Tower: Hebrew How-To card (RTL) ✓; sofit on crane beam (unit-tested); dev-gate bypass.
- Shiritori: Hebrew How-To card (RTL) ✓; dev-gate bypass; pure engine already covered by `spEngine.test.ts`.
- Word Alchemy: Hebrew How-To card (RTL) ✓; dev-gate bypass; English puzzle content (scoped limitation).
- lint 0 errors · `next build` ✓ (168/168 static pages) · 61 targeted tests green.

## Key findings (verified in code)
- `applyHebrewFinalLetters(word)` already exists (`shared/utils/wordNormalization.ts:93`) — linear sofit helper for Tower beam + Forge selected-word display. **No new helper needed.**
- `generateHebrewGrid(size, random)` already exists (`lib/adventure/gridLanguages.ts:83`) → `string[][]`, clusters matres-lectionis for word-richness. Forge delegates to it for `he`.
- `pickRichestBoardClient(boardFn, language, n)` already accepts + Hebrew-weights `language` (`lib/boardSelection.ts`). Forge hardcodes `'en'` at 3 sites in `hooks/useWordForgeRun.ts:207,249,415`.
- Forge grid = `string[][]`, **path-selection** Boggle, **DOM** render (`WordForgeGrid.tsx`). Grid tiles stay regular; sofit applies only to the **selected-word** linear display.
- Scoring is **letter-frequency only, no solver** — for English too. Hebrew ships at English parity. **Deferred:** Hebrew Boggle solver for board richness.
- Boss `censor` constraint hardcodes `AEIOU` (`bossConstraints.ts:32`) → silent no-op in Hebrew. Fix: add `אהוי`.
- Only Forge is dev-reachable (`isAdmin || isDev`). Add `|| isDev` to Shiritori/Alchemy and Tower for local `/he` verification + playtester preview.

## Explicit scope decisions
- **Shiritori stays Japanese-only.** A naive Hebrew last-letter port is a worse game (both councils). Hebrew "שרשרת מילים" mode = future separate work, not this pass.
- **Word Alchemy stays English-content.** Transformation puzzles (STAR→RATS) rely on Latin orthography; authoring Hebrew puzzles is content-design work, deferred. Chrome is fully translated; instructions already note "(התוכן באנגלית)".

## Deferred
- Hebrew Boggle solver (board-richness verification for Forge — same gap exists for English).
- Hebrew Alchemy puzzle content.
- Proper Hebrew word-chain game mode.
- Per-game telemetry funnels (start→first-valid→first-win→drop).
