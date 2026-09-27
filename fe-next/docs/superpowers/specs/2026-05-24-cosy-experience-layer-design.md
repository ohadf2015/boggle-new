# Cosy Experience Layer — global "Calm Mode" for elderly & low-pressure players

**Date:** 2026-05-24
**Goal:** A single, cross-cutting "Cosy / Calm" experience that makes the whole game gentler — fewer effects, less visual noise, no time-pressure escalation, encouraging framing — **while the existing loud/competitive energy remains fully intact**. Players choose the energy they want; both coexist.
**Audience:** Two overlapping groups — (a) **elderly players** (vision, motor, cognition needs) and (b) **anyone who wants a cosy, low-distraction, low-pressure session**.
**Relationship to the other spec:** This is **distinct from** `2026-05-24-cosy-modes-design.md` (a per-mode *feel pass* for Rare Gems / Word Tower / WordCraft, already in flight). That one polishes three specific solo modes. **This one is a global comfort layer** that applies everywhere (practice, daily, solo, and — in a limited, fairness-safe way — multiplayer).

---

## Guiding interpretation

- **"Cosy" ≠ soft gradients / glassmorphism** (anti-brand). Cosy here = *the same neo-brutalist game with the volume turned down*: fewer simultaneous effects, no flashing/urgency, calmer pacing, encouraging copy, bigger text. The personality stays; the overstimulation goes.
- **Cosy is an overlay, not a second game.** It composes existing accessibility primitives + a few new derived preferences. No new `GameMode`, no parallel render path, no second context provider.
- **Cosy can only make things calmer.** It never re-enables an effect a user disabled. (Per-effect re-enable *within* cosy is a deliberate v1 non-goal — see Precedence.)
- **"Have both" = both energies are visible, first-class choices** — not a buried checkbox. There is a hub-level surface, not only a settings switch.

---

## What's already in place (build on, don't reinvent)

- `contexts/AccessibilityContext.tsx` — stores `{ disableFireRoundLights, disableEarthquakeEffects, reduceMotion: boolean|'system', disableHaptics, useLargeLetters }` in `localStorage['boggle_accessibility_settings']` via `useLocalStorageObject(KEY, DEFAULT_SETTINGS)`. Exposes per-flag hooks (`useShouldReduceMotion`, `useDisableFireRoundLights`, `useDisableEarthquakeEffects`, `useHapticsEnabled`, `useLargeLetters`) that most consumers already read.
- `components/grid/selectionEscalation.ts` — `composeSelectedCellStyle({ ..., reduceMotion, suppressAnimations })` already computes `noAnim = reduceMotion || suppressAnimations`. The infinite box-shadow/background repaint storm (the dominant "feels slow when selecting" cause) is gated on this.
- `components/CircularTimer.tsx` — owns time-pressure escalation: `onTimerState('normal'|'low'|'veryLow'|'critical')` at 20s/10s/5s, color/scale escalation.
- `utils/confettiUtils.ts` — canvas-confetti wrapper (particle counts, palette).
- Settings UI at `app/[locale]/settings/PageClient.tsx`; i18n in `translations/{en,he,sv,ja,es}.js` under `settings.*`.

**Key consequence:** because cosy makes the *effective* a11y values flip on, suppressing fire-round lights, earthquakes, reduced-motion animations, and the selection paint storm comes essentially for free via existing hooks.

---

## Architecture

### 1. New preference: `cosyMode`
Add `cosyMode: boolean` (default `false`) to `AccessibilitySettings` + `DEFAULT_SETTINGS`. Hydration-safe: `useLocalStorageObject` merges defaults over stored values, so existing users get `cosyMode: false` with no migration.

### 2. Pure resolver: `lib/cosy/cosyPreferences.ts` (TDD, the spine)
A single pure function turns raw stored settings (+ system reduced-motion) into the **effective** preferences the app reads:

```ts
interface RawCosyInputs {
  cosyMode: boolean;
  reduceMotion: boolean | 'system';
  systemPrefersReducedMotion: boolean;
  disableFireRoundLights: boolean;
  disableEarthquakeEffects: boolean;
  disableHaptics: boolean;
  useLargeLetters: boolean;
}
interface EffectiveCosyPreferences {
  cosyMode: boolean;
  shouldReduceMotion: boolean;       // base logic OR cosy
  disableFireRoundLights: boolean;   // base OR cosy
  disableEarthquakeEffects: boolean; // base OR cosy
  largeLettersEnabled: boolean;      // base OR cosy
  // NEW dimensions cosy introduces:
  suppressTimerUrgency: boolean;     // cosy → true
  celebrationIntensity: 'full' | 'gentle'; // cosy → 'gentle'
}
```

**OR-mask semantics:** for each calming flag, `effective = base || cosyMode`. Cosy can only reduce intensity, never increase it. **Haptics are untouched by cosy in v1** — vibration isn't visual noise and already has its own dedicated toggle (`disableHaptics`); folding it into cosy would surprise users. `hapticsEnabled` therefore stays purely `!disableHaptics`.

**Precedence (decided, documented):** cosy is a **live OR-mask**, not a one-time preset write. Toggling cosy off restores each underlying flag to its own stored value automatically (no prior-state bookkeeping). Re-enabling a specific effect *while cosy is on* is **out of scope for v1** — it's the rare case and would require per-field dirty-tracking. Documented here so it isn't re-litigated.

### 3. Context wiring
`AccessibilityContext` computes `EffectiveCosyPreferences` via the resolver and feeds the **existing** derived values (`shouldReduceMotion`, `disableFireRoundLights`, …) from it. Existing per-flag hooks keep their signatures → **consumers need no changes**. Add:
- `cosyMode` to `settings`, a `toggleCosyMode()` action, `updateSetting('cosyMode', …)` already covered by generic `updateSetting`.
- `useCosyMode(): boolean` and `useCelebrationIntensity(): 'full'|'gentle'`, `useSuppressTimerUrgency(): boolean` (safe-outside-provider, default non-cosy), mirroring existing hook style.

### 4. New-dimension wiring (the only net-new consumer touches)
- **`CircularTimer.tsx`** — when `suppressTimerUrgency`, clamp `onTimerState` to `'normal'` and skip color/scale escalation. Timer still *shown* and still counts (fairness/clarity preserved); it just stops shouting. **MP is unaffected by anything beyond this** — the shared timer keeps running identically; cosy only removes the *visual urgency*, never the timer itself.
- **Celebration / confetti** — a thin helper `lib/cosy/celebrationScale.ts` (pure) maps `celebrationIntensity` → particle-count / spread / shake multipliers. `'gentle'` = fewer particles, no screen-shake, shorter burst — **never zero**. The payoff stays; the assault stops. Wire the main win/level-complete confetti call sites through it.

### 5. Discoverability — both energies as visible choices
- **Settings toggle** (control plane): a prominent "Cosy / Calm mode" switch at the top of `settings/PageClient.tsx`, above the individual a11y switches, with a one-line explanation ("Calmer visuals, no time-pressure flashing, gentler celebrations"). The individual switches remain for fine control.
- **Hub-level surface** (discovery plane, the "have both" answer): a single calm/energetic toggle (a small pill/switch, neo-styled) on the main hub so the target user finds it without digging into settings. It flips the same `cosyMode` pref. *(Sequenced as Phase 1b after confirming the hub component; if the hub surface proves involved, it ships as an immediate follow-up — the settings toggle is the guaranteed v1 entry.)*

---

## MP scope (explicit, so reviewers don't expect more)
In multiplayer, cosy is **a no-op beyond what `reduceMotion` / `disableFireRoundLights` / `disableEarthquakeEffects` already provide**, plus timer-urgency suppression. It does **not** remove or extend the shared timer, change scoring, or alter pacing — that would break fairness on a synced board. Cosy in MP = quieter visuals + calmer timer display only.

---

## Rollout gate — ADMIN ONLY (soft launch)

Calm Mode ships gated to admins first (`useAuth().isAdmin`, sourced from `profiles.is_admin`). Gated at the **entry points** — the only two places `cosyMode` can be set:
- **Settings** — the "Calm Mode" master row renders only when `isAdmin`.
- **Onboarding** — the Calm-vs-Energetic step is injected (and reachable) only for admins; everyone else keeps the base 4-step flow. `displaySteps` in `OnboardingFlow` splices `calmMode` after `returningUser` for admins only.

Because those are the only writers of `cosyMode`, non-admins can neither see nor enable it, so no downstream effect (palette, timer, confetti, motion) ever fires for them. The resolver/context stays ungated (keeps it pure + its tests clean); the one residual edge case — a *former* admin with `cosyMode` already stored — is acceptable for a stable soft-launch admin set. **To roll out to everyone: remove the `isAdmin &&` gate in settings + the admin check in `OnboardingFlow` (`handleNewUser`/`displaySteps`).**

## Phasing

### Phase 1 — Calm Layer (this spec, ship now)
1. `lib/cosy/cosyPreferences.ts` + tests (resolver, OR-mask, new dimensions).
2. `lib/cosy/celebrationScale.ts` + tests (gentle vs full multipliers).
3. `AccessibilityContext` — add `cosyMode`, feed effective values through resolver, add `useCosyMode`/`useSuppressTimerUrgency`/`useCelebrationIntensity` hooks. **No consumer signature changes.**
4. `CircularTimer.tsx` — suppress urgency under cosy.
5. Main confetti/celebration call sites — route through `celebrationScale`.
6. `settings/PageClient.tsx` — cosy master toggle + explanation.
7. i18n: `settings.cosyMode`, `settings.cosyModeDescription` (+ hub label) in `en` + he/sv/ja/es (flagged `native-review pending`).

### Phase 1b — Monochrome palette (SHIPPED in this pass)
`html[data-cosy='true']` in `globals.css` overrides the `--neo-*` vars — every `neo-*` Tailwind utility resolves to a var, so this recolours the whole app with zero component edits. Each family **keeps its hue** (lime/pink/cyan/purple still identify modes) but saturation is cut hard (calm, not flat grey). `--neo-red` (error) and navy bg untouched. Provider sets the attribute via `effective.cosyMode`.

### Phase 1c — Onboarding "Calm vs Energetic" choice (SHIPPED in this pass)
New `components/onboarding/CalmModeChoice.tsx` + a `calmMode` `FlowStep` inserted **after `returningUser`, before `tutorial`** (normal flow only — invite/CrazyGames flows stay minimal). Picking *Calm* calls `updateSetting('cosyMode', true)` so the first tutorial game already reflects it; *Energetic* leaves it off. This is the "have both" promise made explicit: both energies are equal first-class choices at first run, reversible anytime in Settings. The 3 existing onboarding test suites updated for the new step (now a 5-step normal flow).

### Phase 2 — Elderly-specific depth (separate specs; named here, not silently dropped)
The advisor correctly flagged that *calm ≠ accessible-for-elderly*. Still deferred:
- **Motor:** tap-to-select as the cosy default input (vs unforgiving drag-trace); lift-and-resume mid-word; undo-last-letter; larger grid tap targets.
- **Cognition:** first-use explainers for jargon ("blast", "shiritori", "burnout"); simplified instruction copy; no-fail "Game Over" → "Time's up — here's your haul" framing globally.
- **Timing depth:** true zen/untimed or count-up for solo; generous-timer multiplier; pause-anytime. (Phase 1 ships only urgency-suppression, which is free.)
- **Hub surface:** a calm/energetic toggle on the main hub (settings toggle + onboarding choice now cover discovery; a hub pill is a nice-to-have).
- **FOUC fix (known follow-up):** `data-cosy` is set in a `useEffect`, so a returning cosy user can see one frame of the loud palette before the calm overrides apply. Fix with the standard dark-mode-FOUC trick — a tiny synchronous `<head>` script that reads `localStorage['boggle_accessibility_settings'].cosyMode` and sets `document.documentElement.dataset.cosy` before first paint. Low effort, noticeable to the comfort audience.
- **Analytics:** the funnel gains a `calmMode` step — PostHog onboarding-step dashboards need updating on the analytics side.

### Non-goals (v1)
- Re-enabling a specific effect while cosy is on (per-field override).
- Any MP timing/scoring/pacing change.
- New art or audio assets.
- A separate `GameMode` or second context provider.

---

## Test plan
- **`cosyPreferences` (pure):** OR-mask per flag (base off + cosy on → effective on; base on + cosy off → effective on; both off → off); `reduceMotion: 'system'` honored when cosy off; cosy forces `suppressTimerUrgency` + `celebrationIntensity: 'gentle'`; toggling cosy off restores underlying flags.
- **`celebrationScale` (pure):** `'gentle'` reduces particle count & disables shake but stays > 0; `'full'` unchanged from current defaults.
- **`CircularTimer`:** under `suppressTimerUrgency`, never emits `'low'|'veryLow'|'critical'` and applies no escalation class; without it, behavior unchanged.
- **Context:** enabling `cosyMode` flips `shouldReduceMotion`/`disableFireRoundLights`/etc. effective values; existing hooks return cosy-effective values.
- Run `npm run test:frontend` for touched suites; `tsc --noEmit` (full `next build` OOMs per project notes).

## Commit plan (ask before each)
- `feat(cosy): global Calm Mode — cosyPreferences resolver + a11y context wiring`
- `feat(cosy): suppress timer urgency + gentle celebrations under Calm Mode`
- `feat(cosy): settings toggle + i18n` (+ Phase 1b hub surface)
