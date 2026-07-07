# Design System (Neo-Brutalist "Jackbox Party Pack" Style)

**Theme Philosophy**: Dark-only, clean neo-brutalist, high-contrast

**Hard Shadows (NO blur - critical):**
- Use `shadow-hard-*` utilities: `shadow-hard-sm`, `shadow-hard`, `shadow-hard-lg`
- Example: `shadow-hard` = `2px 2px 0px black` (lightweight)
- Pressed state: `shadow-hard-pressed` (1px offset)
- RTL: Shadows auto-flip for Hebrew (`-2px 2px 0px`)

**Borders:**
- Use `border-neo` (2px) or `border-neo-thick` (3px) with black
- Border radius: `rounded-neo` (8px), modern soft rounding

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
