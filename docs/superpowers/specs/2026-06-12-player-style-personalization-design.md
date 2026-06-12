# Player Style Personalization — Design Spec

**Date:** 2026-06-12
**Goal:** Let each player pick a "style" (music genre) that personalizes their **main music**, their **accent color**, and the **mascot** that represents them. Chosen in onboarding + editable in profile/settings, saved to the account (localStorage if guest). Existing users see a one-time popup to pick or keep default. Avatar themed-parts is a deferred follow-up.

---

## 1. Core concept — the `STYLES` registry (spine)

One source of truth: `fe-next/lib/playerStyle/styles.ts`.

```ts
export interface PlayerStyle {
  key: PlayerStyleKey;        // 'default' | 'rock' | 'hasidic' | ...
  labelKey: string;          // i18n: playerStyle.styles.<key>
  accentHex: string;         // overrides --accent
  musicFile: string | null;  // /music/styles/<key>.mp3 ; null = use original
  mascot: string;            // /mascots/styles/<key>.png ; default uses existing mascot
  emoji: string;             // quick fallback / chip glyph
}
```

`default` is a **first-class style**: `musicFile: null` (keeps `in_game.mp3`), `accentHex` = current default accent value, `mascot` = `mascot-new-main.jpg`. "Keep default" in the popup just selects `default`.

Style roster (12 genres + default). Accent hexes chosen to fit the genre and stay visually distinct:

| key | music file | accent | mascot vibe |
|---|---|---|---|
| default | (none / in_game) | lime `#bfff00` | main |
| rock | rock_and_roll.mp3 | crimson `#ff2d4b` | leather/guitar |
| hasidic | hasidic.mp3 | royal blue `#3b6fff` | shtreimel/klezmer |
| jazz | jazz.mp3 | amber gold `#f2b134` | sax/fedora, smoky |
| arabic | arabic.mp3 | emerald `#1fb88a` | oud, desert |
| epic | epic_movie.mp3 | orange `#ff6b35` | armor/cape, heroic |
| viking | viking.mp3 | ice blue `#5fd0 e6`→`#46c5e0` | horned helm |
| arcade | old_arcade.mp3 | neon magenta `#ff37d0` | pixel/8-bit |
| latin | latin.mp3 | coral `#ff5e57` | maracas, festive |
| reggae | reggea.mp3 | rasta green `#36b04a` | dreads, chill |
| japanese | japanese.mp3 | sakura pink `#ff7eb6` | kimono/sakura |
| desert_epic | middle_east_epic_movie.mp3 | deep gold `#e0a526` | cinematic desert |
| fanfare | trumpets_celebration_hollywood.mp3 | gold `#ffd13b` | trumpets, triumphant |

(Exact hexes finalized in code; all are full 2–3.6 min loops — verified, none is a sting.)

**Adding a style later** = drop `<key>.mp3` into `public/music/styles/`, generate `<key>.png` mascot, add one registry row + 5 i18n labels. Nothing else.

---

## 2. Music swap

Seam: `MusicContext.tsx` `TRACKS` registry + `getOrCreateHowl`. A style overrides the **signature in-game theme** (and optionally lobby) only. Functional cues (countdown `before_game`, `almost_out_of_time`, results `bossa`) stay **universal** — they're gameplay feedback, not vibe.

Implementation: resolve `TRACKS.inGame` through `resolveStyleTrack(styleKey, 'inGame')` which returns `STYLES[styleKey].musicFile ?? TRACKS.inGame`. Howl is keyed by track-key today; to avoid stale Howls when style changes, dispose/recreate the `inGame` howl on style change. Pure resolver `resolveStyleTrack` is unit-tested.

Audio assets: copy the 12 Downloads mp3s → `public/music/styles/<key>.mp3` (~50MB total; precedented — `in_game.mp3` already 7.5MB; lazy Howl loads on demand).

---

## 3. Accent color (the "only one color changes" requirement)

**Decision:** introduce a real `--accent` CSS variable; do NOT hijack a mode-coded family (lime/pink/cyan/purple carry mode meaning — recoloring them is a regression to "competitive clarity").

- Default `--accent` = the value those surfaces use **today**, so existing/"keep default" users see **zero change**.
- Apply `--accent` only to **mode-neutral personal/brand chrome**: logo wordmark glow, primary non-mode CTAs, focus/selection rings, profile header, the player's own name/row highlight, avatar ring. Rule: **if a surface carries mode meaning, never accent it.**
- Runtime override: `document.documentElement.style.setProperty('--accent', hex)` — mechanism proven by `data-cosy` calm-mode. Applied by a new `PlayerStyleContext` on mount/style-change.

This is "one color" conceptually even across several spots → honors the constraint while being visible.

---

## 4. Persistence (account or localStorage)

- **Supabase:** migration adds `profiles.player_style TEXT DEFAULT NULL` and `profiles.player_style_modal_shown_at TIMESTAMPTZ DEFAULT NULL`. Read via `PROFILE_SELECTS.settings`; write via `useProfileManagement.updateUserProfile`.
- **Guest:** `profileStorage.ts` keys `boggle_player_style` + `boggle_player_style_modal_shown`.
- **Auth-agnostic hook** `usePlayerStyle()`: returns `{ styleKey, style, setStyle(key) }`. Reads profile col when authed else localStorage; writes to the right layer. On login, if guest had a style and account has none, migrate it up (best-effort).

---

## 5. Style picker UI + preview

`StylePicker` component = grid of **mascot buttons** (the mascots ARE the buttons). Each button: genre mascot art + label, selected ring uses that style's accent.

**Preview on click** (not commit): clicking a style live-applies accent (`setProperty`) + plays a short snippet of its track + swaps the preview mascot, WITHOUT persisting. A "Choose / Confirm" action commits via `setStyle`. Leaving without confirm reverts accent + stops preview.

Mounted in: (a) a new onboarding step (after profile setup), (b) settings/profile Appearance section. Visual design pass via **impeccable** (mascot-button grid is a real surface; neo-brutalist, RTL-aware).

---

## 6. One-time popup (existing users)

`PlayerStyleOnboardingWrapper` = clone of `ProfileCustomizationWrapper`. Gate: authed → `!profile.player_style_modal_shown_at`; guest → `!hasPlayerStyleModalBeenShown()`. Shows the `StylePicker` in a modal once. "Keep default" or confirm both set the shown timestamp/flag. Mounted alongside existing wrappers in the app shell.

---

## 7. Deferred (v2, behind want-to / flag)

Themed **avatar parts** per genre. Seam already identified: extend `buildConfig(gender, vibe, pick)` in `shared/types/customAvatar.ts` or a parallel `THEMED_PART_SETS` map keyed by style. "Build avatar from style, keep some elements randomized." Out of scope for v1; spec'd here so the registry leaves room (`STYLES[key]` can later gain `avatarHints`).

---

## 8. Testing & conventions

- **TDD strict** (project rule): pure resolvers first (`resolveStyleTrack`, accent resolution, modal-gate, hook storage-routing), then UI.
- All text via `t()` in 5 locales (en/he/sv/ja/es); RTL check `?locale=he`.
- `npm run lint && npm run test && npm run build`; commit per phase (ask before commit).

## 9. Phases

0. Registry + audio copy + 12 genre mascots.
1. Persistence (migration + storage + hook).
2. Style-aware music.
3. Accent token + PlayerStyleContext.
4. Picker UI + preview (onboarding + settings).
5. One-time popup.
6. i18n + RTL + validate.
