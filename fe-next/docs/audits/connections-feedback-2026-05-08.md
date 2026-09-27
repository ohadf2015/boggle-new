# Connections Feedback Audit — 2026-05-08

Scope: all `connections_feedback` rows (n=56) since launch. Goal: find root cause of disliked Hebrew puzzles, surface similar at-risk puzzles, improve.

## Telemetry summary

- 56 feedback rows, **all locale=he**.
- 3 distinct authed users; 1 power-tester drove 47 rows (32 dislikes / 15 likes / 43 gave-ups). Other 2 users 8 rows, 1 dislike.
- Auto-ban view (`v_connections_banned_puzzles`) requires ≥3 distinct authed dislike+gave_up — ALL HE dislikes are single-user, so the view never fired. Manual cleanup batches removed 31 of 33 disliked IDs from source files.
- Remaining disliked-in-source at audit start: `he-e-037`, `he-e-043` (and `he-g-173` in generated, also already gone).

## Why `gave_up` alone is not a quality signal

12 of 15 LIKED puzzles also had `gave_up=true`. Players give up on hard-but-fair puzzles too. Ranking by `gave_up` would punish good content.

**Quality signal hierarchy:**
1. `dislike` (primary, intentional)
2. `dislike` AND `gave_up` (high confidence — failed and resented)
3. `gave_up` alone — difficulty signal, NOT quality

## Root cause

Within-player natural experiment: same user, same skill level, same locale, contrasting reactions. Comparing the 15 liked vs 32 disliked HE puzzles:

| Pattern | Liked | Disliked |
|---|---|---|
| `שקית-תה-ירוק` (tea bag + green tea) | ✓ | |
| `מיץ-תפוח-עץ` (apple juice + apple tree) | ✓ | |
| `חמאת-בוטנים-קלויים` (peanut butter + roasted peanuts) | ✓ | |
| `וילון-חלון-ראווה` ("window curtain"? + display window) | | ✗ |
| `כוכב-סרט-ישראלי` ("movie star" English calque + Israeli movie) | | ✗ |

**Root cause:** at least one side of the smichut chain is grammatical-but-unidiomatic Hebrew — usually an English calque or a reversed construct order. Hebrew smichut has fixed word order; speakers reject "סלט פירות" reversed as "פירות סלט" even if every dictionary entry is "real."

## Upstream root cause (validator)

`lib/connections/generator/validator.ts` only checks Wikipedia bigram frequency for `w1 br` and `br w2`. **Frequency hits ≠ idiomatic naturalness.** A pair like `כוכב סרט` may appear in articles (English-influenced writing) but is not what speakers naturally produce ("כוכב הסרט" / "כוכב קולנוע" is native form).

The validator has no:
- Smichut directionality check (HE construct order is fixed)
- Calque heuristic (English noun-noun compound applied to HE)
- Register check (technical term vs everyday speech)

## Fixes shipped this audit

1. **`he-e-037`** — `word1: וילון` → `אדן`. New compounds: "אדן חלון" (windowsill, everyday) + "חלון ראווה" (display window).
2. **`he-e-043`** — `word1: כוכב` → `במאי`. New compounds: "במאי סרט" (movie director) + "סרט ישראלי" (Israeli movie). Replaces the English calque.
3. **`he-m-099`** — `word1: חשמל` → `סיפור`. Fixes reversed smichut. New compounds: "סיפור מתח" (thriller) + "מתח גבוה" (high voltage/tension). Bridge `מתח` plays on tension/voltage duality.
4. **`he-m-104`** — DELETED. "בלוטות פעיל" has no natural rescue; cleaner to drop.
5. **`he-h-052`** — DELETED. Exact duplicate of `he-e-029` (כף|יד|ימין).
6. **`lib/connections/generator/validator.ts`** — added doc-comment that bigram frequency is not a naturalness check; HE generated triples need native-review before merge.

## At-risk list — flag for native review

LLM-flagged via the heuristic above. **Do not mass-mutate without HE native review.**

### High confidence (FIXED this audit, see Fixes Shipped)

| id | resolution |
|---|---|
| he-m-099 | word1 swap (`חשמל` → `סיפור`); turns reversed-smichut into a thriller/voltage pun |
| he-m-104 | deleted; no clean compound on right side |
| he-h-052 | deleted as exact dup of he-e-029 |

### Medium confidence (flag for HE native review — no LLM mutation)

| id | word1 | bridge | word2 | issue |
|---|---|---|---|---|
| he-e-022 | כנף | ציפור | שיר | "ציפור שיר" literary/biological, not everyday |
| he-e-094 | זכרונות | ילדות | עליזה | "ילדות עליזה" uncommon collocation |
| he-e-098 | חופש | קיץ | ארוך | should be construct-form "חופשת קיץ" |
| he-e-100 | ניקיון | אביב | פורח | "ניקיון אביב" English calque ("spring cleaning") |
| he-e-105 | יום | שוק | אוכל | "יום שוק" archaic |
| he-m-006 | מיץ | תפוחים | אדומים | plural form unusual; "מיץ תפוח" more natural |
| he-m-052 | בוקר | יום | שלישי | "בוקר יום" not idiomatic standalone |
| he-m-058 | שמש | קיץ | לוהט | "שמש קיץ" uncommon vs "שמש קיצית" |
| he-m-119 | תפריט | ארוחה | עסקית | "תפריט ארוחה" borderline |
| he-h-088 | חולצת | טריקו | ארוך | "טריקו ארוך" uncommon |
| he-h-097 | ספת | עור | שחור | "עור שחור" double-meaning may read as race |

## Recommendations

### Process
- Treat `dislike` (not `gave_up`) as primary quality signal.
- Lower auto-ban threshold for HE: ≥3 distinct users is too tight given low HE traffic. Consider per-locale tuning, e.g. ≥2 distinct authed users for HE, or `dislikes ≥ 2 AND likes = 0`.

### Generator pipeline (`lib/connections/generator/validator.ts`)
- Add comment documenting that Wikipedia bigram frequency is not a naturalness check.
- Raise `minFreq` for HE (calques accidentally appear in HE Wikipedia at modest frequencies).
- Future: post-validate via a HE collocation DB or a small native-reviewer pass on each batch before merging into source.

### Post-launch
- Monthly: regenerate the at-risk list above and route to a HE native speaker.
- Add a one-line comment to each `he-g-*` puzzle listing the two compounds it asserts as natural — makes review tractable.

## Files touched
- `lib/connections/puzzles/he-easy.ts` (037, 043 word1 swap)
- `lib/connections/puzzles/he-medium.ts` (099 word1 swap, 104 deleted)
- `lib/connections/puzzles/he-hard.ts` (052 deleted as dup)
- `lib/connections/generator/validator.ts` (doc-comment about frequency≠naturalness)
- `docs/audits/connections-feedback-2026-05-08.md` (new — this file)
