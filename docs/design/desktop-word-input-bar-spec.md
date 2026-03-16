# Desktop Word Input Bar — Component Design Spec
## LexiClash Neo-Brutalist Design System

---

## 1. Overview and Design Rationale

The current desktop experience has an invisible keyboard listener (`useKeyboardWordInput`) with no UI surface showing the user what they have typed. This creates two problems: discovery friction (users do not know they can type) and confidence loss (no visual confirmation that keystrokes are registering).

This spec introduces three coordinated UI elements:

- **DesktopWordInputBar** — a visible, auto-focused input bar below the grid on `md+` screens only
- **DoubleClickSubmitIndicator** — a cell-level badge on the last click-selected cell
- **DragReleaseHint** — a transient tooltip anchored near the drag selection

These three elements share a single governing principle: they surface existing interactions that users cannot currently discover, without adding new interaction models or cluttering the mobile layout.

---

## 2. Component: DesktopWordInputBar

### 2.1 Placement and Visibility

Rendered **below the grid container**, centered, on `md` screens and up. Hidden entirely on mobile via `hidden md:flex`. Max width 400px to stay contained below a typical grid width.

The component slots in directly below `GridComponent` and above the word list / score display, inside the existing desktop layout column.

### 2.2 Anatomy

```
[ X clear btn ]  [ _____ input field __________ ]  [ ENTER btn ]
```

Left to right in LTR. Right to left in RTL (Hebrew): ENTER on the left, clear on the right. Use logical CSS properties throughout.

### 2.3 State Machine

| State | Trigger | Visual Description |
|---|---|---|
| `idle` | No text typed | Input shows placeholder, neutral cream bg, muted shadow |
| `typing` | 1+ characters | Letters appear uppercase, neutral border, standard shadow |
| `valid` | `isValidOnGrid === true` AND word >= minLength | Green (`neo-lime`) border and left accent bar |
| `invalid` | `isValidOnGrid === false` | Red (`neo-red`) border with gentle shake on each new invalid char |
| `submitting` | Enter pressed, awaiting feedback | Brief pulse animation, input clears immediately |
| `feedback-accepted` | `WordFeedback.type === 'accepted'` | Flash lime bg for 400ms then return to idle |
| `feedback-rejected` | `WordFeedback.type === 'rejected'` | Flash red bg + shake for 400ms |

Note: `valid` and `invalid` states are purely about grid path existence (`isValidOnGrid`), not dictionary validity. Dictionary validation happens after submit, reflected by the existing `WordFeedback` from `useSinglePlayerCore`.

### 2.4 Tailwind Class Compositions

#### Outer wrapper

```
hidden md:flex items-center gap-2
w-full max-w-[400px] mx-auto
mt-3 mb-1
relative
```

#### Input element

Base (idle):
```
flex-1
h-12
px-4
bg-neo-cream
border-3 border-neo-black
rounded-neo
shadow-hard-sm
font-neo-display font-black text-xl uppercase tracking-widest text-neo-black
placeholder:text-neo-black/30 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal
outline-none
transition-all duration-150
```

Typing state — add:
```
shadow-hard
```

Valid state — replace border and add left accent:
```
border-neo-lime
shadow-[4px_4px_0px_theme(colors.neo-lime)]
```

Invalid state — replace border:
```
border-neo-red
shadow-[4px_4px_0px_theme(colors.neo-red)]
animate-neo-shake
```

Submitting state:
```
opacity-60
pointer-events-none
```

RTL note: For `dir="rtl"` contexts (Hebrew locale), the browser handles text direction in `<input>` automatically. The `tracking-widest` class should still apply. No additional RTL class is needed on the input itself.

#### Clear button (left / inline-start)

```
flex-shrink-0
w-10 h-10
flex items-center justify-center
bg-neo-cream
border-3 border-neo-black
rounded-neo
shadow-hard-sm
text-neo-black
font-black text-lg
cursor-pointer
transition-transform duration-100
active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
hover:bg-neo-yellow
disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none
```

Disabled when `typedWord.length === 0`.

#### Submit button (right / inline-end)

```
flex-shrink-0
h-10 px-4
flex items-center justify-center gap-1.5
bg-neo-yellow
border-3 border-neo-black
rounded-neo
shadow-hard-sm
text-neo-black font-black text-sm uppercase tracking-wide
cursor-pointer
transition-transform duration-100
active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
hover:bg-neo-orange
disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none
```

Disabled when `typedWord.length < minWordLength`.

Submit button content: `⏎ ENTER` (the return symbol + text). On smaller viewports within the md range, collapse to just `⏎` — use `hidden lg:inline` on the text.

### 2.5 Entrance and Exit Animations

The bar enters once the game grid is ready (`grid !== null`). Use Framer Motion `AnimatePresence`:

```
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
exit:    { opacity: 0, y: 4, transition: { duration: 0.15 } }
```

Use the existing `AdaptiveMotion` wrapper from `components/motion/AdaptiveMotion` so the entrance is skipped on `prefers-reduced-motion`.

### 2.6 Feedback Flash Animations

On `feedback-accepted`: apply a CSS keyframe that briefly changes `background-color` to `neo-lime` and `border-color` to `neo-lime`, then fades back to `neo-cream`. Duration 400ms total. The animation can be a Tailwind `animate-[...]` arbitrary value or a named keyframe class `animate-input-flash-valid`.

On `feedback-rejected`: apply `animate-neo-shake` (already in design system) and a brief red bg flash. Duration 300ms.

These animations are triggered by watching the `currentFeedback` prop. When `currentFeedback` arrives with `type === 'accepted'`, apply the animation class for one frame cycle, then remove it. A `key` on the animation wrapper forces a fresh animation on each feedback event.

### 2.7 Auto-Focus Behavior

Auto-focus must only happen on desktop (`useIsDesktop()` returns true) and must not run on touch devices. Use a `useEffect` with `inputRef.current.focus()` guarded by:

```ts
if (isDesktop && !('ontouchstart' in window)) {
  inputRef.current?.focus();
}
```

Run this effect when the game grid becomes available (`grid !== null`). Also re-focus after word submission.

Do not use the HTML `autoFocus` attribute — it triggers on initial render regardless of device and would steal focus on mobile.

### 2.8 Integration with useKeyboardWordInput

The existing `useKeyboardWordInput` hook ignores keystrokes from `INPUT` elements (line 299–305 of the hook). This means the hook will **not** capture keys typed inside this input.

The `DesktopWordInputBar` therefore manages its own `onChange` handler on the `<input>` element and calls `submitTypedWord` / `clearTypedWord` from the hook directly. The `typedWord` display value comes from the hook's `typedWord` state (single source of truth).

When the user types in the visible input, the component calls a new `appendTypedWord(char)` method or manages a local controlled value that stays in sync with the hook.

The cleanest approach is to keep the `<input>` as a **controlled component** whose `value` is `keyboardInput.typedWord` and whose `onChange` feeds into a handler that directly calls `setTypedWord` inside the hook. This requires exposing `setTypedWord` or an `appendCharacter` method from `useKeyboardWordInput`. Alternatively, the input can be uncontrolled with a `ref` that is cleared on submit — however, keeping it controlled ensures the grid highlight path stays in sync.

Recommended: expose `setTypedWordDirect(value: string)` from the hook for external controlled input usage.

### 2.9 Prop Interface

```ts
interface DesktopWordInputBarProps {
  typedWord: string;
  isValidOnGrid: boolean;
  minWordLength: number;
  isGameActive: boolean;
  feedback: WordFeedback | null;
  onWordChange: (value: string) => void;  // feeds into setTypedWordDirect
  onSubmit: () => void;                    // calls submitTypedWord
  onClear: () => void;                     // calls clearTypedWord
  className?: string;
}
```

### 2.10 Accessibility

- `<input>` has `aria-label={t('game.typeWordAriaLabel')}` (translation key to add: `"Type a word"`)
- `aria-live="polite"` on the feedback region (reuse the existing `WordFormingArea` pattern)
- `role="search"` on the outer wrapper
- Submit button: `aria-label={t('game.submitWordAriaLabel')}` (`"Submit word"`)
- Clear button: `aria-label={t('game.clearWordAriaLabel')}` (`"Clear word"`)
- When `isValidOnGrid` changes, announce via `aria-describedby` pointing to a visually-hidden status span that says `t('game.wordFoundOnGrid')` or `t('game.wordNotOnGrid')`
- The input is not in the tab order of the letter grid itself — it should be reachable via Tab after the grid

### 2.11 Translation Keys Required

Add to all four language files (`en.js`, `he.js`, `sv.js`, `ja.js`):

```js
'game.typeWordPlaceholder': 'Type a word...',
'game.typeWordAriaLabel': 'Type a word',
'game.submitWordAriaLabel': 'Submit word',
'game.clearWordAriaLabel': 'Clear word',
'game.wordFoundOnGrid': 'Word found on grid',
'game.wordNotOnGrid': 'Word not found on grid',
```

---

## 3. Component: DoubleClickSubmitIndicator

### 3.1 Purpose

When a user has selected 2 or more cells via click-select mode (not drag), show a small badge on the last selected cell indicating that double-clicking will submit.

### 3.2 Trigger Conditions

Show when:
- `selectedCells.length >= 2`
- Interaction mode is click-select (not drag-in-progress)
- Word has not yet been submitted

Hide when:
- `selectedCells.length < 2`
- Word submits (selection clears)
- User starts dragging

### 3.3 Visual Design

A small pill badge, positioned absolute at the **bottom-right corner** of the last selected cell tile. The badge sits slightly outside the cell edge — `bottom-[-6px] end-[-6px]` using logical properties.

Content: a return symbol `⏎` in a compact container.

```
absolute bottom-[-6px] end-[-6px]
z-20
flex items-center justify-center
w-6 h-6
bg-neo-yellow
border-2 border-neo-black
rounded-full
shadow-hard-sm
text-neo-black font-black text-xs
animate-pulse
pointer-events-none
```

The `animate-pulse` from Tailwind (opacity 1 → 0.5 → 1, ~2s cycle) is sufficient to draw attention without being distracting. For `prefers-reduced-motion`, remove `animate-pulse` and use a static badge.

### 3.4 Placement in GridComponent

The badge renders as an absolute-positioned child inside the cell tile component for the last selected cell. Pass a `showSubmitHint` boolean prop to the cell.

Alternatively, render the badge as a portal/overlay anchored to the cell's bounding rect — this avoids prop drilling but adds complexity. Prefer the prop approach given the existing tile component structure.

### 3.5 Entrance Animation

```
initial: { scale: 0, opacity: 0 }
animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 600, damping: 20, delay: 0.3 } }
exit:    { scale: 0, opacity: 0, transition: { duration: 0.1 } }
```

The 0.3s delay prevents the badge from appearing on accidental single clicks or during fast drag movements.

### 3.6 Accessibility

Hidden from screen readers: `aria-hidden="true"`. The double-click action is already announced via the main `aria-live` region when a word is submitted.

---

## 4. Component: DragReleaseHint

### 4.1 Purpose

During an active drag selection, show "Release to submit" near the drag endpoint so new users understand the mechanic. Disappears permanently after the user successfully submits one word via drag.

### 4.2 Persistence Logic

Store a boolean `hasDraggedSuccessfully` in `localStorage` under the key `lexiclash_drag_hint_dismissed`. Check on mount. If `true`, never render the component. Set to `true` on the first successful drag submission. This is intentionally independent of user auth — it is a per-device onboarding hint.

### 4.3 Visual Design

A small floating label that follows the drag endpoint position. Implemented as a fixed-position element whose `top` and `left` are set to the last pointer position plus an offset.

```
fixed
z-50
pointer-events-none
px-3 py-1.5
bg-neo-navy/90
border-2 border-neo-white/30
rounded-neo
text-neo-white font-neo-body text-xs font-medium
shadow-hard-sm
whitespace-nowrap
transform translate-x-4 translate-y-[-120%]
```

The `translate-x-4 translate-y-[-120%]` offset keeps the label above and to the right of the cursor, avoiding visual interference with the selection path.

### 4.4 Entrance and Exit Animations

```
initial: { opacity: 0, scale: 0.9 }
animate: { opacity: 1, scale: 1, transition: { duration: 0.15 } }
exit:    { opacity: 0, transition: { duration: 0.1 } }
```

Show only when `isDragging === true AND selectedCells.length >= 1 AND !hasDraggedSuccessfully`.

### 4.5 Positioning Strategy

The hint anchors to the drag pointer's current `clientX` / `clientY`. Subscribe to `pointermove` events inside the drag handler (already tracked in `GridComponent` for grid interaction) and pass the coordinates as a prop to this component, or manage them in a shared drag state context.

Translation key: `'game.releaseToSubmit': 'Release to submit'`

### 4.6 Accessibility

`aria-hidden="true"` — purely decorative. Screen reader users hear the word accepted/rejected announcement in the `aria-live` region, which is sufficient.

---

## 5. Mobile Behavior Summary

| Component | Mobile behavior |
|---|---|
| DesktopWordInputBar | `hidden md:flex` — completely absent from DOM on mobile |
| DoubleClickSubmitIndicator | Suppressed on touch devices (double-tap already handled differently) |
| DragReleaseHint | Active on mobile too — drag submission exists on touch. Suppress if `hasDraggedSuccessfully` |

---

## 6. Files to Create / Modify

### New files

```
fe-next/components/game/DesktopWordInputBar.tsx           (component)
fe-next/components/game/DoubleClickSubmitIndicator.tsx    (component)
fe-next/components/game/DragReleaseHint.tsx               (component)
fe-next/components/game/__tests__/DesktopWordInputBar.test.tsx
fe-next/components/game/__tests__/DoubleClickSubmitIndicator.test.tsx
fe-next/components/game/__tests__/DragReleaseHint.test.tsx
```

### Files to modify

```
fe-next/hooks/useKeyboardWordInput.ts
  — expose setTypedWordDirect(value: string) in return type
  — update UseKeyboardWordInputReturn interface

fe-next/components/singleplayer/SinglePlayerGame.tsx
  — render <DesktopWordInputBar> below GridComponent

fe-next/components/GridComponent.tsx (or tile component)
  — add showSubmitHint prop to last-selected cell tile

fe-next/translations/en.js, he.js, sv.js, ja.js
  — add 6 new translation keys listed in section 2.11
  — add 'game.releaseToSubmit' key
```

---

## 7. Implementation Notes for Engineers

**Controlled input sync:** The `<input>` value must be controlled by `typedWord` from the hook. When the user types in the input, call `onWordChange(e.target.value.toUpperCase())` which calls `setTypedWordDirect`. This keeps the grid highlight path in sync since `highlightedCells` is derived from `typedWord` inside the hook.

**Enter key in input:** The `<input>` `onKeyDown` should intercept `Enter` and call `onSubmit()`. It should also handle `Escape` (call `onClear()`) and `Backspace` (handled naturally by the input, but ensure `onWordChange` fires).

**Avoid double submission:** The existing global `keydown` listener in `useKeyboardWordInput` already ignores events from `INPUT` elements. No double-submit risk.

**Grid highlight during input typing:** Because the controlled input drives `typedWord` in the hook, `highlightedCells` updates on every character — the grid path highlight already works, it just needs to be wired to a controlled value rather than a global keydown.

**Focus management on submit:** After calling `onSubmit()`, re-focus the input via `inputRef.current?.focus()` in a `setTimeout(0)` to allow the feedback animation to render first.

**RTL layout:** The outer `flex` wrapper will naturally reverse in RTL because `dir="rtl"` is set on the `<html>` element for Hebrew. The clear button (inline-start) will appear on the right and the submit button (inline-end) on the left — which is correct for RTL reading flow. Use `me-2` (margin-end) not `mr-2` to respect this.

**useIsDesktop hook:** Already exists at `fe-next/hooks/useMediaQuery.ts`. Import from there to guard auto-focus and rendering.
