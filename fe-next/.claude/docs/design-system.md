# Design System (Neo-Brutalist "Jackbox Party Pack" Style)

**Theme Philosophy**: Dark-only, clean neo-brutalist, high-contrast

**Hard Shadows (NO blur - critical):**
- Use `shadow-hard-*` utilities: `shadow-hard-sm`, `shadow-hard`, `shadow-hard-lg`
- Example: `shadow-hard` = `2px 2px 0px black` (lightweight)
- Pressed state: `shadow-hard-pressed` (1px offset)
- RTL: Shadows auto-flip for Hebrew (`-2px 2px 0px`)

**Borders:**
- Use `border-neo` (2px) or `border-neo-thick` (3px)
- Border radius: `rounded-neo` (8px), modern soft rounding
- **Border colour is a function of the FILL, not a habit.** Black is correct on
  cream/lime/cyan/yellow (~20:1); on navy it measures **1.23:1** and the border
  effectively disappears. On any `bg-neo-navy*` ground use `border-neo-cream/40`
  (3.74:1) or a solid accent. The 3:1 floor is WCAG 1.4.11 (non-text contrast).
- Translucent accent borders mostly FAIL: `pink/40` = 1.69:1, `red/40` = 1.72:1,
  `purple/60` = 2.18:1. Lime/cyan/yellow need ≥45%; cream/white need ≥40%.
  When in doubt use a **solid** accent border — it matches the brand's
  "solid borders" rule and clears the gate on every tone (min 4.35:1).
- Guarded by `components/education/__tests__/educationBorderContrast.test.ts`,
  which computes real WCAG ratios from the shipped hex values across
  `components/education`, `components/teacher` and `app/[locale]/education`.

**Box shells — reuse, don't retype:**
- `NeoPanel` (`components/ui/panel.tsx`) — the card SHELL. `tone` carries the
  bg AND its matching border colour, so the contrast rule above is impossible
  to get wrong. `asChild` makes a framer-motion element BE the panel.
- `NeoNote` (`components/ui/note.tsx`) — a flat tinted tile INSIDE a panel
  (status line, tip, warning, redacted block). Solid accent border + `/10` fill,
  no shadow. Tones: `ok` / `alert` / `info` / `danger` / `muted`, plus `dashed`.
- `Card` (`components/ui/card.tsx`) — heavy full-height mode/feature tiles only.
- Every variant map holds a **complete literal class string**. Tailwind v4 only
  generates utilities it can see verbatim, so never build one by interpolation.

**Color Palette (4 families):**
- Lime (Primary): `neo-lime` (#BFFF00), `neo-lime-light`, `neo-lime-muted`, `neo-lime-dark`
- Pink (Multiplayer): `neo-pink` (#FF1493), `neo-pink-light`, `neo-pink-muted`, `neo-pink-dark`
- Cyan (Single Player): `neo-cyan` (#00FFFF), `neo-cyan-light`, `neo-cyan-muted`, `neo-cyan-dark`
- Purple (Brain Training): `neo-purple` (#8B5CF6), `neo-purple-light`, `neo-purple-muted`, `neo-purple-dark`
- Error: `neo-red` (#FF3366)
- Background: `neo-navy` (#1a1a2e), `neo-navy-light` (#16213e)
- Text: `neo-white`, `neo-cream` (#FFFEF0)
- Semantic Accents (RESERVED — do NOT use for generic chrome/CTAs):
  - `neo-yellow` (#FFE135): celebration/gold — star ratings, level completion, daily-challenge winner, podium gold, boss victory, coin/XP rewards
  - `neo-orange` (#FF6B35): warmth/streak — streak fire, on-fire combos, comeback bonus, urgency (timer nearing zero)
  - Warning semantic — yellow/orange also allowed for non-critical warnings (alert `warning` variant, toast `warning` type, error-boundary soft warnings). `neo-red` stays for destructive/critical errors.
  - For any other use (buttons, backgrounds, borders, icons without celebratory/warning meaning), pick from the 4 primary families above.

**Typography:**
- Display: Fredoka (`font-neo-display`)
- Body: Rubik (`font-neo-body`)

**Animation Classes:**
- `animate-neo-press` - button press effect
- `animate-neo-pop` - entrance pop
- `animate-neo-wobble` - playful wobble
- `animate-neo-shake` - error shake

**Halftone Texture:** Body has subtle dot pattern overlay, use `texture-halftone` class

**Reuse shadcn/Radix primitives — don't hand-roll:**
- Before writing a `<select>`, modal overlay, dropdown menu, tabs, switch/toggle, tooltip, textarea, or progress bar, check `components/ui/` first: `select.tsx`, `dialog.tsx`/`alert-dialog.tsx`, `dropdown-menu.tsx`, `tabs.tsx`, `switch.tsx`/`toggle-group.tsx`, `tooltip.tsx`, `textarea.tsx`, `progress.tsx` already exist, are Radix-backed (a11y/keyboard-nav for free), and are pre-skinned to this neo-brutalist system.
- These are NOT vanilla shadcn — variants/colors are heavily customized (see button.tsx). Never re-run `npx shadcn add <x> --overwrite`; it reverts to stock Tailwind styling and destroys the customization.
- Exception: game-board/canvas/Pixi interactions, animated combo/health/wave meters, and drag mechanics are intentional custom game-feel — not shadcn's job, don't force a primitive there.
- Radix `Select.Item`/similar can't take `value=""` — use a sentinel (e.g. `"_all"`) and map to/from your real empty-string state at the boundary.

**RTL Directional Icons:** For ANY back/exit/directional icon (arrows, LogOut), use `<DirectionalIcon icon={ArrowLeft} className="…" />` (`components/ui/DirectionalIcon.tsx`) — it auto-flips in RTL. Symmetric arrows flip by default (`rtl:rotate-180`); asymmetric icons (LogOut) need the `mirror` prop (`rtl:scale-x-[-1]`) since rotating them looks upside-down. Full back/exit buttons prefer `BackButton` (nav-up) / `ExitRoomButton` (game→lobby). Never hand-write `rtl:rotate-180` on a directional icon.
