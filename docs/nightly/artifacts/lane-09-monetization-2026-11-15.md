status: research-only
files_touched: none

Why no ship tonight:
- Brief's "known surface" claims education upsell has NO pricing/lead-capture. FALSE —
  already shipped: `app/[locale]/education/for-schools/page.tsx` + `content.ts`,
  `lib/education/schoolLead.ts`, `app/api/education/school-lead/route.ts`
  (+ test). Lane 09's top candidate action was already done in a prior session.
  Fix the prompt's "known surface" note.
- The next-best candidates (ad-UX wiring, iap probe) all live in files already
  `M` (dirty, uncommitted) at session start: `utils/growthTracking.ts`,
  `lib/education/schoolLead.ts`, `lib/education/pro/schoolQuote.ts`,
  `lib/experiments.ts`. Editing a file another in-flight session/lane is mid-edit on
  risks a collision (per `.claude/rules/60-recurring-pitfalls.md` Class 2/3). Left
  untouched tonight.

Ranked backlog for tomorrow:
1. [S] `iap_viewed`/`iap_purchased` growth events exist in the `GrowthEvent` union
   (utils/growthTracking.ts) with ZERO call sites anywhere in the app — fully unwired.
   Need one UI entry point (e.g. a "remove ads / supporter" row in settings) before an
   interest probe can fire. No such entry point exists yet — picking the entry point
   is a product call, not mine to invent tonight.
2. [S, needs live verify first] Brief says `rewarded_ad_watched` 0/24h (7d avg 0) —
   before touching `hooks/useRewardedAd.ts`, confirm live whether the H5/AdMob flag
   gate is simply off right now (expected — H5 ads are pending approval per brief) vs
   a real regression on the native 6 rewarded surfaces. Don't code a fix for a flag
   that's correctly off.
3. [M] Once `growthTracking.ts`/`experiments.ts` are no longer mid-edit, revisit
   wiring `rewarded_ad_offered` on any surface missing it (brief notes some gaps) so
   tomorrow's intelligence brief has non-zero offer/decline data.

next_steps: re-run with a corrected "known surface" note (lead-capture already live);
check whether growthTracking.ts/experiments.ts/schoolLead.ts/schoolQuote.ts have
landed (committed) by morning before touching them; if still dirty, pick #1 (iap
probe) only after a settings entry point is agreed, or #2 after a live AdMob check.
