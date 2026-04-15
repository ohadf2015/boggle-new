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
- DEPRECATED (do not use in new code): `neo-yellow`, `neo-orange`

**Typography:**
- Display: Fredoka (`font-neo-display`)
- Body: Rubik (`font-neo-body`)

**Animation Classes:**
- `animate-neo-press` - button press effect
- `animate-neo-pop` - entrance pop
- `animate-neo-wobble` - playful wobble
- `animate-neo-shake` - error shake

**Halftone Texture:** Body has subtle dot pattern overlay, use `texture-halftone` class
