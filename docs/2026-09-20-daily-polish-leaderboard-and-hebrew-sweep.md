# Daily polish, hub leaderboard, mode handoff, Hebrew Word Bridge sweep — 2026-09-20

Branch `daily/polish-and-leaderboard`, cut from `origin/master` (`ca4de9a4a`).
Follows PR #1094 (`gauntlet/daily-evolve-2026-09-19`), which parked two of these
as deliberate open questions.

## Why

Owner brief: the daily still is not polished enough and **each card should stay
recognizable**; the hub **should have a leaderboard**; the **transition from one
daily challenge to the next should be smooth**; and the **Hebrew Connections
riddles are largely low quality**. Reuse existing code where possible.

Two of these reverse calls #1094 made on purpose — the hub board was removed
(three names at ~12 weekly players reads as a dead product) and the day-to-day
handoff (P1) was parked. The owner's instruction overrides both; the tests that
guarded the removal are inverted rather than deleted, so the reversal is as
deliberate as the removal was.

## 1. Cards are recognizable again

- `QuestCard` `COLOR_CONFIGS` had **no `purple` entry**, so Connections fell
  through to `cyan` and rendered identically to Word Tower whenever it was the
  hero. Added purple; widened the `color` prop.
- The hero's art was chosen by an inline ternary chain with **no Connections
  branch**, so Connections showed the **Word Hunt mascot** —
  `public/daily/connections-mascot.jpg` has shipped all along.
- `CompactModeRow` (the three secondary rows) differed only by a 24px icon
  tint: same navy, same lime Play chip. Each row now carries its mode's
  artwork, a solid accent edge (`start-0`, so it flips in Hebrew) and an
  accent-coloured focus ring.
- Mode artwork moved into the `DAILY_MODES` registry (`art`), so hub hero,
  compact rows and the end-of-game handoff cannot disagree about a mode's
  picture. The hub's per-mode data is now one record instead of four ternaries.

### i18n: one real bug, and four I invented by auditing badly

The first pass of this audit reported five defects here — es/ru rendering a
congratulation sentence as a card title, he/sv untranslated, and sv naming Word
Tower and Word Bridge identically. **Four of those five were false.** Only one
is real:

| locale | key | was | now |
|---|---|---|---|
| sv | `daily.wordHunt.title` | `Word Hunt` (untranslated) | `Ordjakt` |

**Why the audit was wrong, and why it matters:** it read the translation files
as TEXT with lazy regexes like `"wordTower": \{[\s\S]*?"questTitle": "..."`.
`[\s\S]*?` happily runs past the end of its block into the next one, so the
"wordTower" probe actually matched a line **inside the `connections` block**,
and the `connections` probe matched that same line. Two probes reading one line
looks exactly like a collision. `sv.js` also has a **duplicate top-level
`wordTower` key** (lines 618 and 1378), so the value that a text search finds
first is not the value that wins at runtime.

Resolving `daily.wordHunt.title` etc. as actual objects against `HEAD` showed
he/es/ru were already correctly translated and sv's `Ordtorn`/`Ordbro` were
already distinct.

The edits made from that bad audit were worse than useless: three were no-ops
on unresolved duplicate nodes, and one **created** the very collision it
claimed to fix by renaming `connections.daily.questTitle` from `Ordbro` to
`Ordtorn`. All four were reverted; only the sv Word Hunt fix was kept, applied
by walking to the resolved node rather than by text match.

**The guard that caught it** is `__tests__/daily-mode-titles-distinct.test.ts`,
written before the revert. It resolves every mode's `titleKey` through the real
locale bundle and asserts the four titles are **pairwise distinct per locale**
and short enough to be names. It failed immediately on the collision I had just
introduced. Existing parity tests could not have caught any of this: they assert
a key EXISTS and is non-empty, which every one of these values did.

Lesson recorded in memory: audit i18n by RESOLVING the key path, never by
grepping the file — duplicate keys and lazy regexes both lie.

## 2. Hub leaderboard restored

Re-renders the existing `components/daily/landing/LeaderboardTeaser` — already
written, already tested, previously just not mounted.

**It sums Word Hunt + Word Wheel only**, because those are the two modes with a
per-player daily board keyed by `player_id`/`guest_fingerprint`. The Connections
daily leaderboard route does not return player ids at all, and Word Tower's
board is not daily+locale scoped. Rather than ship a board that silently
excludes two of four visible cards (rules/60 Class 3), the header **names its
scope** — built from the two modes' existing title keys, so it needed no new
translation.

Extending to four modes means changing `app/api/connections/daily/[date]/leaderboard`
to expose an identity column. Deliberately not done here.

Inverted tests flipped — both were **vacuous**:
- `guestIdentity`: queried `tabbed-daily-leaderboard`, which the hub never
  rendered in either design, so it passed regardless.
- `hubRedesign`: looked for a `lucide-trophy` icon; the teaser uses `Crown`.

## 3. Smooth mode-to-mode handoff

New `components/daily/results/NextQuestCta` + `pickNextUnplayedMode` in
`lib/dailyModes`. Reads `useDailyPlayedStatus` — the **same server-backed hook
the hub reads** — so hub and results can never disagree about what is left
today (rules/60 Class 1). Returns `null` when the day is cleared, which the
component renders as an all-clear link to the hub rather than a stale CTA.

What it replaced:
- **Word Hunt**: `wheelCtaNode` ("STEP 2 OF 2" → Word Wheel) and
  `backToDailyCtaNode`. Both predate Word Tower and Connections going public,
  so a player who finished Hunt + Wheel was told the day was over with two
  modes unplayed, and the badge miscounted a four-mode day as two. The **guest
  branch had no next step at all** (~90% of daily players).
- **Word Wheel**: three hand-chained sticky CTAs (Connections → Word Hunt →
  hub) that never mentioned Word Tower. ~130 lines removed.
- **Connections**: only a countdown to tomorrow. The handoff now sits above it,
  on both the solved and zero-solved branches.

Preserved deliberately: sticky positioning for authed players and the
`cross_promo_click` event the old CTAs emitted.

**Guests get the handoff too, inline rather than pinned.** The prior rule was
"no CTA for a guest", but its stated reason was specifically that the slot is
PINNED and a guest's signup card already lives there. Keeping the rule only
where its reason applies means ~90% of players are not dead-ended, and Word
Wheel stops behaving differently from Word Hunt for the same player (Class 3).

**The component owns its own wrapper** (`className` prop) rather than being
nested inside a caller-supplied `sticky z-30` box. With the box outside, a
`return null` while play state loads would leave an empty pinned element
behind. It also renders a **fixed-height skeleton** instead of `null` during
that fetch: for an authed player the hook is a network round-trip, so returning
nothing let the primary CTA pop in after paint and shove the screen down.

Not animated, on purpose: an entrance opacity/transform tween on a full-width
block is a known mobile-Chromium flash source here (rules/60 Class 5), and
`m.a` also broke every results suite whose framer-motion mock defines only
`div`/`span`.

**Word Tower results were not touched** — a separate run is live on that
worktree.

## 4. Hebrew Word Bridge sweep

Measured before judging. No paste-error cluster: **0 duplicate hints, 0
duplicate triples** across 407 rows — the defect is semantic.

Six independent `fable` judges, one per ~68-row chunk, briefed as "ruthless
native editor, default REJECT" per `.claude/skills/connections-puzzle-craft`.
**0 hallucinated ids** across 138 flags.

Applied to `public.connections_puzzles` (DB is source of truth), then
`materialize-puzzles.mjs he`:

| action | count |
|---|---|
| culled (`is_active=false`, never deleted) | 97 |
| hints rewritten | 111 |
| `accepted_answers` merged (law 3 uniqueness) | 21 |
| difficulty retiered **downward** | 32 |

**407 → 310 active.** The `he-pool.test.ts` floor is >300, so this is 10 above
it; the next sweep needs replacement generation first.

Dominant failure was **law 2, generic-adjective pairings**: `עוף צלוי`,
`בננה בשלה`, `תפוח אדום`, `שמש חמה` — word2 swappable for twenty others, so the
second compound is not a set phrase. Reviews (41) were **kept**, not culled;
culling them too would have dropped the pool to 269, under the floor.

Law 6 respected: nothing was culled for being easy — easy familiar compounds
are a deliberate feature, so 32 went down a difficulty tier instead.

One judge-proposed hint was **rejected by an automated check**: `he-e-075`
(bridge `ים`) was given the hint `גוף מים גדול, כחול ומלוח`, which shows the
answer inside `מים`. The original hint was kept.

`CURATED_OPENING.he` had exactly one culled member — `he-o-002`
(`עץ תפוח` / `תפוח אדום`) — replaced with `he-e-024`
(`זנב סוס` / `סוס מרוץ`, ponytail → racehorse), a stronger pivot at the same
difficulty.

Rollback: `public.connections_he_backup_20260920` (583 rows, pre-change).

## 5. Hebrew PYRAMID pool — the other half of the days

`lib/connections/dailyVariant.ts` alternates the Connections daily between the
5-riddle chain and the **pyramid**, by UTC day. Sweeping `connections_puzzles`
therefore only fixed about half the Hebrew days.

Pyramid base triples are stored **denormalized** in
`connections_pyramid_puzzles`, so cross-referencing the 97 culled triples by
WORDS (not id) against all 63 base triples found defects still shipping:

- `he-pyr-m003-b3` — `ספל · קפה · חזק`: exact match of culled `he-o-036`
  (`קפה חזק` is a generic-adjective pairing; the set phrase is `קפה שחור`).
- `he-pyr-605-b1` — `מנורת · רחוב · שקט`: `רחוב שקט` is law 2 (`סואן`/`צר`/`ארוך`
  fit equally).
- `he-pyr-606-b2` — `כף · רגל · ימין`: law 3 lottery — `יד` fits both sides
  (`כף יד` / `יד ימין`) and is not in `acceptedAnswers`.

The pair-match is noisy and each hit had to be read against its cull REASON:
`he-pyr-202-b2` (`סדר · יום · הולדת`) looked like a hit but is fine — `he-e-081`
was culled for its *word1* side (`אמצע יום`), and `סדר יום` is real.

The pyramid pool had never been judged, so all 21 went through the same
default-REJECT pass with the structural laws added (bridges pairwise distinct,
meta forms a real phrase with each bridge, meta not present in a base). The
judge had to write out all three formed meta phrases per pyramid as evidence,
which is what caught law B:

| pyramid | meta + bridge | verdict |
|---|---|---|
| `he-pyr-204` | `ראש שנה` | only real as `ראש השנה` — needs the article |
| `he-pyr-208` | `כדור ארץ` | only real as `כדור הארץ` |
| `he-pyr-605` | `אור רחוב` | not a set phrase (`תאורת רחוב` is) |

**21 → 14 active.** Culled: those three, plus `he-pyr-209` (`עין סערה` needs the
article, and it near-duplicated `he-pyr-302`), `he-pyr-609` (`כדורגל ישראלי` is
a 4-way lottery — כדורסל/טניס/קולנוע/תיאטרון all fit), and `he-pyr-m003`.

Fixed rather than culled: `he-pyr-m003-b3` `קפה חזק` → `קפה שחור` (the judge's
own recommendation, and the set phrase). That correction is what made m003 a
letter-identical duplicate of `he-pyr-602`, so m003 was dropped and 602 kept —
602 carries the alternative answers. Shipped pool now has **0 duplicate base
triples**.

Also applied: 13 hint rewrites, including two `metaHint` fixes — one a gender
error (`כוס` is feminine, so `ממנו` → `ממנה`).

Of the judge's 4 proposed law-3 alternatives, **2 survived review of its own
suggestion**. An alternative that equals ANOTHER base's bridge in the same
pyramid would give two bases the same answer:
- `he-pyr-602-b2` += `תה` — rejected: `תה` is b3's answer, and b2's rewritten
  hint (`אספרסו, הפוך או טורקי`) already excludes tea.
- `he-pyr-303-b3` += `יד` — rejected: `יד` is 303-b1's own bridge. That left
  `כף · רגל · שמאל` an unresolvable lottery in place, so **303 was culled** —
  the judge had already flagged 303/606 as a redundant pair (same meta `כדור`,
  2 of 3 bridges shared), and 606 can carry `יד` legitimately because `יד` is
  not one of its bridges.

Two more pool-level cleanups: 12 `accepted` entries were just the bridge echoed
back (noise that can mask a real alternative — the bridge always solves), and
`he-pyr-m001`'s three bases were tagged `hard` while being easy familiar
compounds (`בקבוק יין`/`מים`/`שמן`), so they were retiered down per law 6
rather than culled. Final: **0 bridge echoes, 0 in-pyramid answer collisions,
0 duplicate base triples.**

### A silent no-op worth remembering

The first `add_accepted` write **succeeded and changed nothing**. The jsonb base
objects key alternatives as `accepted`; `materialize-pyramids.mjs:61` reads
`b.accepted` and only then emits it as `acceptedAnswers`. Writing
`acceptedAnswers` into the jsonb added a key nothing reads — no error, no
warning, and the shipped file was byte-identical on that field. Caught only by
diffing the regenerated file against what the DB said, not by trusting the
update's success. rules/60 Class 4, in a new costume.

### Root-level hint leaks

Two judges noted that a Hebrew hint can leak the answer by shared ROOT where a
substring check sees nothing (`מודיעין` vs `מידע`, both י־ד־ע). A root-aware
sweep over the shipped 310 found four the substring check had passed:
`he-g-138`, `he-g-36` (both י־ד־ע), `he-o-080` (`אזהרה`/`זהירות`, ז־ה־ר) and
`he-g-118` (`מנוע`/`שנעה`, נ־ו־ע). All four rewritten.

## Verification

`tsc --noEmit` 0 errors (`RC_TSC=0`, verified by sentinel, not a reported exit
code — a wrapper reported "exit code 0" over a run with 27 real failures during
this work).

## Follow-ups

- Generate replacement Hebrew puzzles; 310 is close to the >300 floor.
- Re-judge the 41 `review`-severity Hebrew items with a native tie-break.
- Give the Connections daily leaderboard an identity column so the hub board can
  cover all four modes.
- 35 Hebrew bridges are reused 3+ times (`בית` 8×) — a variety cap, not a
  correctness bug.
