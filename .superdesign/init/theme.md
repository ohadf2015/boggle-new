# Theme — LexiClash

## Design System: Neo-Brutalist "Jackbox Party Pack" Style
- Dark-only theme
- High contrast, bold borders, hard shadows (no blur)
- Playful, game-like aesthetic

## Color Palette (CSS Variables)
- `--neo-lime: #BFFF00` (Primary/CTA)
- `--neo-pink: #FF1493` (Multiplayer accent)
- `--neo-cyan: #00FFFF` (Single player accent)
- `--neo-purple: #8B5CF6` (Brain training)
- `--neo-red: #FF3366` (Error/destructive)
- `--neo-navy: #1a1a2e` (Background)
- `--neo-navy-light: #16213e` (Elevated background)
- `--neo-cream: #FFFEF0` (Light text)
- `--neo-black: 0 0 0` (rgb values)
- `--neo-white: 255 255 255` (rgb values)
- `--neo-yellow: #FFE135` (deprecated)
- `--neo-orange: #FF6B35` (deprecated)
- `slate-800` used for card backgrounds

## Typography
- Display: Fredoka (`font-neo-display`) — headings, buttons
- Body: Rubik (`font-neo-body`) — body text
- Font weights: `font-black` for display, `font-bold` for labels

## Borders & Shadows
- `border-neo` = 2px solid black
- `border-neo-thick` / `border-3` = 3px
- `border-4` for prominent cards
- `rounded-neo` = 8px, `rounded-neo-lg` = 12px
- Hard shadows (NO blur): `shadow-hard-sm` (1px), `shadow-hard` (2px), `shadow-hard-lg` (3px)
- Pressed: `shadow-hard-pressed` (1px offset)
- RTL: shadows auto-flip

## Spacing
- Compact: `p-2`, `p-3` for mobile
- Standard: `p-4`, `p-5` for desktop
- Gap: `gap-2` mobile, `gap-4`-`gap-6` desktop

## Breakpoints
- `lg: 1024px` — desktop layout trigger
- `xl: 1280px`
- Custom: `desktop-tall` (≥1024w, ≥700h)

## Animation
- Framer Motion springs for entrance
- `animate-neo-press`, `animate-neo-pop`
- Staggered entrance with `delay: i * 0.1`
