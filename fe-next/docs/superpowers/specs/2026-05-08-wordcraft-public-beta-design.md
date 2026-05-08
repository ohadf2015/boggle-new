# WordCraft Public Beta — Design Spec

**Date**: 2026-05-08  
**Status**: Approved  
**Scope**: Email-gated public route, 5-locale dictionaries, Heat Meter twist, PixiJS+GSAP juice, mode card, achievements

---

## 1. Access Control

### Email Whitelist Gate
```ts
// lib/word-craft/betaAccess.ts
const BETA_EMAILS = ['ohadf2015@gmail.com', 'eden320@gmail.com']
export const isWordCraftBetaUser = (email: string | undefined): boolean =>
  !!email && BETA_EMAILS.includes(email)
```

- Client-side only (same pattern as existing admin gate). No backend changes needed — game is fully in-memory.
- Auth source: `useAuth().profile?.email`
- Admin route `/admin/word-craft` stays alive for dev access (no change).

### Route
- New public route: `app/[locale]/word-craft/page.tsx` + `PageClient.tsx`
- If `!isWordCraftBetaUser(email)` → redirect to `/${locale}` (hub)
- Route is `noindex` via metadata export until public launch

---

## 2. Mode Card (Hub)

**File**: `components/landing/LandingChallengeCards.tsx`

- Add `'wordCraft'` to `LandingCardKey` union and `FEATURED_MODES` set
- Add `case 'wordCraft'` to `renderCard` switch
- Props:
  - `variant="purple"`
  - `badge="BETA"`
  - `title={t('wordcraft.modeTitle')}`
  - `description={t('wordcraft.modeDesc')}`
  - `href={`/${language}/word-craft`}`
  - `icon={<Layers className="w-6 h-6" />}`
  - `modeImage="/modes/word-craft.png"` (placeholder until art ships)
  - `locked={!isWordCraftBetaUser(email)}` with `lockedMessage={t('wordcraft.betaLocked')}`

Card animates with existing stagger pattern (`animate-[fadeInUp_0.4s_ease-out_both]`).

---

## 3. Multi-Language Dictionaries

### Architecture
New module: `lib/word-craft/dictionary.ts`

```ts
export async function loadWordCraftDictionary(locale: string): Promise<Set<string>>
export function isValidWord(word: string, dict: Set<string>): boolean
```

Each locale loaded once on game init via dynamic import, stored in a `useRef` Set. Validation is synchronous after load (same as current EN approach).

### Per-Locale Sources

| Locale | Source | Approach |
|--------|--------|----------|
| `en` | `an-array-of-english-words` | Dynamic import (already working) |
| `sv` | `@arvidbt/swedish-words` | Dynamic import (already installed) |
| `he` | `/api/validate-word?locale=he` | API call per validation |
| `es` | `/api/validate-word?locale=es` | API call per validation |
| `ja` | `/api/validate-word?locale=ja` | API call per validation |

HE/ES/JA use the existing server-side dictionary API (`app/api/dictionary`) to avoid bundling large wordlists client-side. A 300ms debounce on submit prevents spam. An `isValidating` state shows a spinner on the Submit button during the async call.

### Japanese Tile Bag
- Hiragana tiles (48 base characters + dakuten variants)
- Rack shows kana characters instead of latin letters
- Tile point values based on character frequency (rare kana = higher value)
- Board direction: left-to-right (standard for grid games, locale-independent)
- Tile bag defined in `lib/word-craft/tileBags/ja.ts`

### Tile Bags
Each locale gets its own `lib/word-craft/tileBags/[locale].ts` with letter distribution + point values. EN tile bag already exists in `lib/word-craft/tileBag.ts` — refactor to locale map pattern.

---

## 4. Responsive Board

### Size
- `< 768px` → 13×13 board
- `≥ 768px` → 15×15 board (existing)

Board size computed once on init from `window.innerWidth`, stored in game state as `boardSize: 13 | 15`. Premium square layout adapts (13×13 uses a scaled-down version of the canonical layout with equivalent symmetry).

### Tile Sizing
```css
/* tile size scales to fit board in viewport */
--wc-tile-size: min(calc((100vw - 32px) / var(--wc-cols)), 38px);
```
CSS custom property `--wc-cols` set to 13 or 15 at root. All tile sizing references this variable.

### Mobile UX
- Rack displayed below board (not side-by-side)
- Heat meter sits between board and rack
- Controls (Submit / Pass / Swap) as a sticky bottom bar

---

## 5. Heat Meter / Overdrive Twist

### State additions to `WordCraftState`
```ts
heat: number           // 0–100
overdrive: boolean     // multiplier active this turn
overdriveWarns: number // turns sitting at 100 without playing (max 2 → burnout)
burnout: boolean       // true = skip this player turn
```

### Heat gain formula
```ts
const heatGain = Math.min(Math.floor(wordScore / 5), 25)
// 10pt word → +2 heat. 50pt word → +10. 125pt+ word → +25 (cap)
```

### Overdrive mechanics
1. Heat reaches 100 → `overdrive = true`
2. While overdrive: all tile face values ×2, premium multipliers stack normally
3. Player submits a word during overdrive → score banked, `heat = 60`, `overdrive = false`, `overdriveWarns = 0`
4. Player passes/does nothing during overdrive → `overdriveWarns++`
5. `overdriveWarns >= 2` → `burnout = true`, player skips next turn, `heat = 40`, `overdrive = false`

### New Actions
```ts
| { type: 'UPDATE_HEAT'; gain: number }
| { type: 'OVERDRIVE_WARN' }
| { type: 'BURNOUT_RECOVER' }
```

`UPDATE_HEAT` dispatched inside `COMMIT_PLAYER` handler.  
`OVERDRIVE_WARN` dispatched inside `PASS` handler when overdrive is active.  
`BURNOUT_RECOVER` dispatched at turn start when `burnout = true` (clears the flag, returns control to bot).

---

## 6. Visual Effects — PixiJS + GSAP

### Separation of concerns
- **GSAP**: DOM/React element animations (tiles, rack, meter bar, score floats, text)
- **PixiJS**: Full-screen particle overlays (overdrive burst, bingo shower, burnout flash)
- Pattern follows existing `WordCraftCelebration.tsx` — transparent canvas overlay

### New component: `WordCraftEffects.tsx`
Extends the existing `WordCraftCelebration` with new event types:
```ts
export type EffectKind =
  | 'bingo'       // existing star shower
  | 'gameOver'    // existing tile rain
  | 'overdrive'   // NEW: lime spark burst from meter
  | 'burnout'     // NEW: red flash + screen shake
  | null
```

#### Overdrive effect (PixiJS)
- 120 lime (`0xbfff00`) spark particles burst from heat meter position
- Radial velocity 3–8px/frame, gravity 0.1, alpha fade over 800ms
- Board tint: `ColorMatrixFilter` → lime wash, lerped back to neutral over 600ms
- "OVERDRIVE!" text: `Text` object, Fredoka-equivalent, slides in from left with GSAP

#### Burnout effect (PixiJS + GSAP)
- Red (`0xff3333`) flash overlay: `Graphics.rect(fullscreen).fill(red)`, alpha 0 → 0.5 → 0 over 400ms
- GSAP rack shake: `gsap.to(rackRef.current, { x: [-5, 5, -5, 5, 0], duration: 0.3, ease: 'power2.out' })`

#### Tile submit (GSAP)
- Each pending tile: `gsap.from(tileEl, { y: -20, opacity: 0, duration: 0.15, stagger: 0.04, ease: 'back.out(1.7)' })`
- Tile lands with a brief scale punch: `gsap.to(tileEl, { scale: 1.1, duration: 0.08, yoyo: true, repeat: 1 })`

#### Score float-up (GSAP)
- `+{score}` text floats up 40px then fades: `gsap.to(el, { y: -40, opacity: 0, duration: 0.8, ease: 'power1.out' })`
- Overdrive color: lime. Normal: white. Bingo: gold (#FFE135).

#### Encouragement text (GSAP)
- Random phrase from `t('wordcraft.encouragement.N')` (8 strings, N=0–7)
- Same float-up pattern, larger font, below score popup, 1.2s duration

#### Heat meter (GSAP)
- `gsap.to(meterFill, { width: `${heat}%`, duration: 0.4, ease: 'power2.out' })`
- Color timeline: `0–59%` → lime, `60–84%` → orange, `85–99%` → red, `100%` → pulsing gold
- Pulse at 100%: `gsap.to(meterFill, { scale: 1.03, yoyo: true, repeat: -1, duration: 0.5 })`

---

## 7. Achievements

Routed through existing `AchievementQueue`. New achievement keys:

| Key | Trigger condition | Reward |
|-----|-----------------|--------|
| `wordcraft_first_word` | First valid word placed | Confetti mini-burst |
| `wordcraft_bingo` | All 7 tiles used in one turn | PixiJS star shower |
| `wordcraft_overdrive_enter` | Heat reaches 100 first time | Lime spark burst |
| `wordcraft_overdrive_cash` | Word played during overdrive | Gold score float |
| `wordcraft_heat_streak` | Enter overdrive 3× in one game | Gold badge + fanfare |
| `wordcraft_linguist` | Play in 3 different locales | Meta unlock, persisted |

Achievement checks happen in the `COMMIT_PLAYER` handler (or on game init for `linguist`). `linguist` state persisted in `localStorage('wc_locales_played')` as a Set.

---

## 8. i18n Keys

All 5 locale files (`en/he/sv/ja/es`) get new `wordcraft.*` keys:

```js
wordcraft: {
  modeTitle: 'WordCraft',
  modeDesc: '...', // per locale
  betaLocked: '...',
  overdrive: 'OVERDRIVE!',
  burnout: 'BURNED OUT!',
  heatLabel: 'Heat',
  encouragement: {
    0: 'Nice word!', 1: 'Beautiful!', 2: 'Unstoppable!',
    3: 'Sizzling!',  4: 'On fire!',   5: 'Magnificent!',
    6: 'Brilliant!', 7: 'Keep it up!'
  }
}
```

HE/SV/JA/ES encouragement strings = LLM-generated, flagged for native review.

---

## 9. Files Created / Modified

### New
- `lib/word-craft/betaAccess.ts` — email whitelist util
- `lib/word-craft/dictionary.ts` — per-locale dictionary loader
- `lib/word-craft/tileBags/en.ts` — extracted from tileBag.ts
- `lib/word-craft/tileBags/sv.ts`
- `lib/word-craft/tileBags/he.ts`
- `lib/word-craft/tileBags/es.ts`
- `lib/word-craft/tileBags/ja.ts`
- `components/word-craft/WordCraftEffects.tsx` — extended PixiJS overlay
- `components/word-craft/HeatMeter.tsx` — heat bar UI + GSAP animations
- `components/word-craft/ScoreFloat.tsx` — GSAP float-up text
- `app/[locale]/word-craft/page.tsx` — public beta page
- `app/[locale]/word-craft/PageClient.tsx` — game client

### Modified
- `lib/word-craft/useWordCraftGame.ts` — add heat state + actions
- `lib/word-craft/types.ts` — add `heat`, `overdrive`, `burnout` to state
- `lib/word-craft/tileBag.ts` — refactor to import from tileBags/en.ts
- `components/word-craft/WordCraftCelebration.tsx` — extend EffectKind
- `components/landing/LandingChallengeCards.tsx` — add wordCraft card
- `translations/en.js` (+ he/sv/ja/es) — add wordcraft.* keys

---

## 10. Out of Scope (this sprint)

- Blank tile picker (existing MVP gap, deferred)
- Bot GADDAG improvement
- Multiplayer
- Persistence (refresh = new game)
- SEO / sitemap listing (noindex until public)
- Admin `/word-craft` route removal
