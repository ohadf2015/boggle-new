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
