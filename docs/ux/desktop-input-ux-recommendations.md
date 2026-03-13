# Desktop Input UX Recommendations
# LexiClash — Word Grid Gameplay

**Prepared by:** UI/UX Design
**Date:** 2026-03-13
**Scope:** Desktop-specific input method improvements for the Boggle-style word grid

---

## Problem Statement

The primary input method — drag/swipe across adjacent tiles — maps directly to mobile touch but creates friction on desktop:

- Mouse drag requires sustained button-hold while moving, which is physically tiring over a 2-minute round
- Imprecise diagonal selections cause mis-selections on small tiles
- No keyboard path exists, which excludes fast typists from their strongest modality
- Players who switch from mobile to desktop experience a perceived skill regression even though they know the game

The goal is to support three coexisting input modes (drag, click-sequence, keyboard) with zero mode-switching UI overhead, while maintaining the neo-brutalist visual identity.

---

## Competitive Benchmark

| Game | Desktop Input | Key Lesson |
|---|---|---|
| Wordle | Keyboard only | Single-mode simplicity is learnable in one session |
| Words With Friends (web) | Click tiles to place | Click-to-select works well for grid games |
| Scrabble GO (web) | Click-select + drag | Offering both without a toggle reduces friction |
| SpellTower | Keyboard + click | Keyboard input that highlights matching tiles feels magical |
| TypeShift | Keyboard-first | Typing speed becomes the skill expression on desktop |
| Letterpress | Click-to-chain | Sequential selection with undo-last is a strong pattern |

The consensus from successful web word games: **keyboard + click-sequence together, drag as the third optional mode**. Do not force players to choose a mode upfront.

---

## Recommendations — Ranked by Impact / Effort

### 1. Click-to-Select (HIGH impact / LOW effort)

**Behavior:** Clicking a tile adds it to the current word chain. Clicking the last-added tile removes it (undo last). Clicking a non-adjacent tile resets the chain with a brief shake animation.

**Rules:**
- Only tiles adjacent to the last selected tile are eligible for the next click
- Non-eligible tiles show a subtle visual dim (opacity 60%) on hover while a chain is in progress
- Clicking the submit button or pressing Enter submits the word
- Pressing Escape or clicking the word display area clears the chain

**Why it works:** Click-select removes sustained mouse pressure entirely. Each click is a deliberate discrete action. This mode is immediately intuitive because it matches "shopping cart" mental models — add an item, confirm.

**Visual feedback:**
- Selected tiles: Same highlight state as drag (neo-yellow border + shadow-hard)
- Connection line: SVG path drawn between tile centers, 3px stroke, neo-yellow, 0.3s draw-in animation
- Hover on eligible next tile: Pulse border (neo-cyan, 1.5s loop) to invite the click
- Hover on ineligible tile during chain: Tile dims + cursor changes to `not-allowed`

**Implementation note:** The adjacency check already exists for drag validation. Click-select reuses that exact logic — it is a new event handler calling the same tile-selection function, not new game logic.

---

### 2. Keyboard Typing Input (HIGH impact / MEDIUM effort)

**Behavior:** When no text input is focused, keyboard characters are intercepted. As the player types, the grid highlights all tiles matching the typed sequence using the shortest valid adjacent path. Backspace removes the last character. Enter submits.

**Two sub-modes to support:**

**a. Path-highlighting mode (recommended primary):**
The system finds the best valid path on the grid as the player types. Each keystroke extends the highlighted path. If no valid extension exists, the tile flashes red (shake) and the character is rejected — the word cannot continue. This gives instant spatial feedback without requiring the player to look at the grid while typing.

**b. Free-type mode (fallback):**
Characters are accepted into the word buffer without grid highlighting. On submit, the system validates the word exists as a valid grid path. If invalid, the word display shakes and clears. This is lower fidelity but easier to implement and still faster than drag.

Recommend implementing (a). It preserves the core spatial constraint that makes Boggle skill-based.

**Path-finding algorithm:** For each new character, find all grid tiles matching that letter that are adjacent to the last highlighted tile. If multiple options exist, select the one that leaves the most valid continuations (greedy lookahead, 1 step). This handles ambiguous grids gracefully.

**Visual feedback:**
- Typed characters appear in the word display area in real time (same as drag)
- Matched tiles highlight progressively as each character is typed
- Invalid character (no adjacent match): word display shakes, character rejected, no tile highlighted
- Keyboard mode indicator: small `[A]` badge bottom-right of grid (see Discoverability section)

**Conflict avoidance:** Only intercept keystrokes when no modal, dropdown, or text input is focused. Use a `document.activeElement` check and a React context flag (`keyboardCapturingInput: boolean`).

---

### 3. Hybrid Input (Auto-coexistence, not a toggle)

**Core principle:** All three input modes are active simultaneously. The player's last action determines which visual affordances are foregrounded. There is no mode selector UI.

**Detection logic:**

```
Last action was mouse-down + drag  →  drag mode active
Last action was mouse-click on tile  →  click-select mode active
Last action was keyboard keystroke  →  keyboard mode active
```

Mode state resets to neutral when the word is submitted or cleared.

**Why no manual toggle:** A mode selector creates a decision tax before every word. It also fragments the mental model. The game should feel responsive to whatever the player does next, not require configuration.

**Edge case — mixed input mid-word:** Allow it. If a player starts clicking and then types, extend the typed path from the last clicked tile. This feels natural (like autocomplete) and rewards experimentation.

---

### 4. Discoverability — Teaching Without Interrupting

**Do not use a modal tutorial for input methods.** Modal tutorials for mechanics this simple cause abandonment and are ignored after the first session.

Instead, use three progressive disclosure layers:

**Layer 1 — First session, first word only:**
A single inline tooltip appears below the grid: `"Tip: You can also click tiles or just type."` It auto-dismisses after 6 seconds or on first interaction. It never appears again once a word has been submitted. Uses the existing NeoToast system styled as an inline hint (not a floating notification).

**Layer 2 — Persistent micro-indicator:**
Three small pill badges sit in the grid's bottom-right corner at all times (not occluding tiles):

```
[drag]  [click]  [type]
```

The active mode's pill becomes neo-yellow. Inactive pills are neo-white at 40% opacity. These are 28px wide, 16px tall — small enough to be environmental, large enough to read. They are not interactive (no click-to-switch). They serve as a passive reminder of available modes and as a live indicator of which mode is currently active.

**Layer 3 — Hover affordance on the grid:**
When the player hovers the grid without interaction for 800ms (idle hover), eligible starting tiles subtly pulse (neo-cyan outline, 1 cycle). This invites both click and drag. It does not trigger during active play.

---

### 5. Micro-interactions Per Mode

Each mode needs a distinct but consistent visual language. They share the same highlight color (neo-yellow) and hard shadow treatment to preserve design coherence. Differentiation is in motion, not color.

**Drag mode:**
- Continuous connection line drawn under pointer in real time
- Tiles scale up slightly (1.05) as pointer enters them
- Line snaps back and tiles de-highlight on release

**Click-select mode:**
- Each click produces a small radial burst from the tile center (neo-yellow, 200ms, opacity 0 → 0.6 → 0)
- Connection line draws between clicks with a spring animation (stiffness 300, damping 25)
- Last tile in chain has a pulsing border to signal it is the current anchor

**Keyboard mode:**
- Tiles appear to "light up" sequentially with a 50ms stagger (like a trail being illuminated)
- No connection line — the letters in the word display area are the primary feedback channel
- Invalid key: word display does a 2-frame horizontal shake (same as current rejection animation)

**Shared submit moment:**
- All three modes converge on the same submit animation: tiles bounce (scale 1 → 1.15 → 1, 300ms) then clear
- This makes success feel consistent regardless of how the word was formed

---

### 6. Keyboard Shortcut for Submit and Clear

These are universally expected on desktop and currently absent:

| Key | Action |
|---|---|
| `Enter` | Submit current word |
| `Escape` | Clear current chain / typed word |
| `Backspace` | Remove last tile from chain (all modes) |

Backspace working in click and keyboard modes is particularly important. Players will frequently misclick or mistype — a recoverable action without a full clear reduces frustration significantly.

---

## Implementation Priority

| Recommendation | Impact | Effort | Priority |
|---|---|---|---|
| Click-to-select | High | Low | 1 — Do first |
| Enter / Escape / Backspace keys | High | Low | 1 — Do first (same PR) |
| Persistent mode indicator pills | Medium | Low | 2 |
| Keyboard typing (path-highlighting) | High | Medium | 3 |
| Hover affordance on idle | Low | Low | 4 |
| First-session inline tip | Medium | Low | 4 (pair with #3) |

Click-to-select + keyboard shortcuts covers roughly 80% of the desktop friction at the lowest engineering cost. Ship those together. Keyboard typing is the highest-value follow-up.

---

## Accessibility Notes

- All keyboard interactions must work with screen readers disabled (game context, not document navigation)
- Focus trap the grid container during active gameplay on desktop so Tab does not move focus out of the game
- The mode indicator pills must have `aria-label` values: `"Current input mode: keyboard"` updated dynamically via `aria-live="polite"`
- Connection lines (SVG) are decorative — `aria-hidden="true"`
- Backspace handling must check `event.target` to avoid intercepting backspace in any text input field that may exist on the same page (chat, room name, etc.)

---

## Design System Fit

All recommendations use existing LexiClash design tokens:

- Highlight: `neo-yellow` (#FFE135) — same as current drag selection
- Invitation/eligible: `neo-cyan` (#00FFFF) — distinct from selection, reads as "available"
- Error/invalid: existing `animate-neo-shake` + `neo-orange` border flash
- Micro-burst particles: inline Framer Motion, respects `AdaptiveMotion` (reduceMotion-safe)
- Mode pills: `border-neo`, `rounded-neo`, `shadow-hard-sm` — fully neo-brutalist

No new color tokens required. No new animation utilities required.

---

## Open Questions for Validation

1. In a 2-minute competitive round, do players actually switch modes mid-game, or do they commit to one? (Usability test: observe 5 desktop sessions, count mode switches)
2. Does path-highlighting keyboard mode confuse players who expect free-type? (A/B: ship free-type first, measure submission error rate vs. path-highlighting)
3. Do mode indicator pills get noticed at 40% opacity, or do they disappear into the dark background? (Eye-tracking or 5-second test on static mockup)
