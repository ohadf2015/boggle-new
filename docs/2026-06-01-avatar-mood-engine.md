# Avatar Mood Reaction Engine

> Council consensus (gemini-cli + grok-cli, 2026-06-01): avatars are strong but **static after creation**. Highest-leverage quality win = make the same SVG layers *react* to game events.

## Goal
Make avatars emote during gameplay (correct/wrong/streak/win/lose/thinking/afk) by temporarily overriding the eyes/eyebrows/mouth layers + a short wrapper animation. Reuse the existing part vocabulary — no new art.

## Non-negotiables
- **No-op when undefined.** `mood` absent/`idle` → render byte-identical to today. This is the regression guarantee for a component every screen uses.
- **Transient, never permanent.** Paid parts (galaxy/infinity eyes) return the instant the mood clears. Pure renderer re-derives from base `config` each render — moods never mutate stored config.
- **Expression survives reduced-motion; only the transform is gated.** The eye/mouth swap is *information*, not decoration.
- **Decoupled from `disableEffects`.** `disableEffects` kills the continuous tier wrapper (paint-bound) in rosters. A mood expression-swap is one cheap element → fires regardless. Mood class attaches to the inner `<svg>`; tier wrapper is the outer `Avatar.tsx` div → they compose, no transform clobber.
- Phone + TV, RTL-safe, 5 langs (moods are visual → no new i18n in core slice).

## Architecture
1. **`lib/avatar/avatarMood.ts`** (pure, zero deps, zero mocks):
   - `AVATAR_MOODS` / `AvatarMood` union.
   - `MoodEffect = 'none'|'pop'|'shake'|'pulse'`.
   - `MOOD_EXPRESSIONS: Record<AvatarMood, {eyes?,eyebrows?,mouth?,effect}>` — typed against `CustomAvatarConfig` fields so only valid enum values compile. Deliberate full-vocabulary mapping:
     | mood | eyes | eyebrows | mouth | effect |
     |---|---|---|---|---|
     | idle | — | — | — | none |
     | thinking | curious | raised | oh | none |
     | correct | happy | raised | grin | pop |
     | wrong | dizzy | worried | frown | shake |
     | streak | flame | angryThick | grin | pulse |
     | win | star | raised | grin | pop |
     | lose | sad | worried | pout | shake |
     | afk | sleepy | flat | flat | none |
   - `applyMood(config, mood?) → CustomAvatarConfig` — identity for idle/undefined; never mutates input.
   - `getMoodEffect(mood?)`, `getMoodAnimationClass(mood?)`.
2. **`hooks/useAvatarMood.ts`** — transient state. `trigger(mood, durationMs?)` auto-clears to idle (transient moods) or persists (thinking/afk = duration 0). Cleans timer on unmount. (fake-timers test.)
3. **`AvatarRenderer.tsx`** — `+ mood?: AvatarMood`. Part selection uses `applyMood(config, mood)`; `getMoodAnimationClass` on `<svg>` className; `data-mood` attr. Import `avatar-mood-animations.css`.
4. **`Avatar.tsx`** — thread `mood` to **both** call sites (custom L120 + fallback L134).
5. **`styles/avatar-mood-animations.css`** — pop/shake/pulse keyframes; reduced-motion media query nulls only these.

## Slices
- **Slice 1 (this):** engine + hook + renderer/Avatar prop + CSS. TDD. Self-contained, regression-safe.
- **Slice 2 (next):** wire exactly ONE real surface (results reveal: winner→`win`, others→`lose`) to prove it alive end-to-end.
- **Deferred:** SR live-region on mood change; more surfaces (TV card, in-game submit, lobby emote wheel); `?mood=` on PNG endpoint.

## Tests (RED first)
- `applyMood(c,'idle') === c` (identity) and `applyMood(c)` identity.
- `applyMood(c,'correct')` overrides eyes/eyebrows/mouth, leaves base `c` unmutated, preserves all other fields (skinColor, premium parts).
- every `AvatarMood` maps to valid `CustomAvatarConfig` enum values.
- `getMoodAnimationClass`: '' for idle/undefined, `avatar-mood-shake` for wrong, etc.
- hook: `trigger('correct')` → mood='correct'; after duration → 'idle'; `trigger('afk')` persists; unmount clears timer.
- renderer: `mood='wrong'` renders frown mouth testid / data-mood='wrong'; no mood → data-mood='idle' and identical part set.
