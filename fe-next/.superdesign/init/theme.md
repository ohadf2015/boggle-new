# Theme — LexiClash Neo-Brutalist

## Design Philosophy
Dark-only, neo-brutalist "Jackbox Party Pack" style. High contrast, hard shadows (NO blur), bold borders.

## Color Palette (CSS Variables)
```
--neo-lime: #BFFF00       (Primary)
--neo-pink: #FF1493        (Multiplayer)
--neo-cyan: #00FFFF        (Single Player)
--neo-purple: #8B5CF6      (Brain Training)
--neo-yellow: #FDE047      (DEPRECATED but still used)
--neo-orange: #FB923C      (DEPRECATED)
--neo-red: #FF3366         (Error)
--neo-navy: #1a1a2e        (Background)
--neo-navy-light: #16213e
--neo-cream: #FFFEF0
--neo-black: 0 0 0         (rgb format)
--neo-white: 255 255 255   (rgb format)
```

## Typography
- Display: `font-neo-display` → Fredoka (bold headings)
- Body: `font-neo-body` → Rubik

## Shadows (Hard, NO blur)
- `shadow-hard-sm`: `2px 2px 0px black`
- `shadow-hard`: `3px 3px 0px black`
- `shadow-hard-lg`: `4px 4px 0px black`
- `shadow-hard-pressed`: `1px 1px 0px black`
- Color shadows: `shadow-hard-cyan`, `shadow-hard-yellow`, `shadow-hard-pink`

## Borders
- `border-neo`: 2px solid black
- `border-neo-thick`: 3px solid black
- `border-3`: 3px width

## Border Radius
- `rounded-neo`: 8px
- `rounded-neo-lg`: 12px
- `rounded-3xl`: 24px (used on profile cards)

## Animations
- `animate-neo-press`: button press
- `animate-neo-pop`: entrance pop
- `animate-neo-wobble`: playful wobble

## RTL Support
- Hebrew is RTL; shadows auto-flip
- Use `inset-s-*`/`inset-e-*` for logical positioning
- Use `me-*`/`ms-*` for logical margins
