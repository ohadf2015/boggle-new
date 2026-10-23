# Design

> Neo-Brutalist refined. Dark navy canvas, hard pixel shadows, solid borders, electric color-coded modes. This captures the EXISTING committed identity (Tailwind tokens in `tailwind.config.js`). Variants preserve it — do not reflex-reject the fonts/lane.

## Theme
Dark. Deep navy canvas with electric accents. Physical reference: a neon arcade cabinet / party-game show graphics, not a dashboard.

## Color
Strategy: **Full palette** — 5 named electric mode-roles over a dark navy base, each used deliberately.

| Token | Hex | Role |
|---|---|---|
| `--neo-navy` | `#1a1a2e` | base canvas |
| `--neo-navy-light` | (lighter navy) | raised surface |
| `--neo-lime` | `#BFFF00` | primary / celebration / "start here" |
| `--neo-pink` | `#FF1493` | multiplayer |
| `--neo-cyan` | `#00FFFF` | single-player / solo |
| `--neo-purple` | `#8B5CF6` | brain training |
| `--neo-orange` | `#FF6B35` | warmth / streak / blast |
| `--neo-white`, `--neo-cream` | — | text on dark |

**Contrast rule:** accent fills (lime/cyan/yellow/orange) take BLACK ink only; white text is invisible on them. Body text on navy uses white/cream ≥4.5:1.

## Typography
- Display/headings: **Fredoka** (`font-neo-display`) — rounded, friendly, bold weights.
- Body/UI: **Rubik** (`font-neo`).
- Pairing is committed identity; keep it. Contrast via weight + size, not new families.

## Components / Tokens
- Borders: `border-neo` (2px black), `border-neo-thick` (3px). `rounded-neo` (8px) → `rounded-neo-xl` (16px).
- Shadows: hard, no blur — `shadow-hard-sm` (1px), `shadow-hard` (2px), `shadow-hard-lg` (3px), colored variants `shadow-hard-[cyan|pink|lime|...]`. RTL auto-flips.
- Texture: `texture-halftone` on body.
- Motion: `framer-motion` (`m`), GSAP available. Keyframes `fadeInUp`, `neo-pop`, `neo-wobble`. Stagger `i * 0.07s`. Ease-out (quart/expo), no bounce on entrances. Every animation has a reduced-motion fallback.

## Layout
- Mobile-first. Grid breakpoints viewport-based (`sm`/`md`/`xl`), no container queries yet.
- Dark navy full-bleed sections; vary spacing for rhythm.
- Mascot is a recurring brand object.

## i18n
All UI text via `t('landing.*')`. 5 locales (en, he-RTL, sv, ja, es). No hardcoded strings.

## Marketing surfaces: "Game board" system (Hallmark, 2026-10)
Applies to the logged-out landing, `/education`, `/teacher` sign-up and `/pricing`. Game screens keep the base system above.

- **Genre:** playful, brand-overridden — the saturated mode colours stay; Hallmark's low-chroma playful default does not apply.
- **Macrostructure family:** Bento Grid. The page is a board: story beats are tiles of mixed span on one grid, never alternating text/art rows (Split Studio is retired here).
- **Poster face:** Unbounded (`font-neo-poster`, token `--font-poster`) for h1/h2 on these surfaces only, weight 700–800, tracking `-0.01em` (hero `-0.015em`). Hebrew falls through to Fredoka/Heebo, Japanese to the system face. Rubik stays the body.
- **Tile voice:** a tile IS the card — `rounded-neo-xl border-3` in its mode colour, `bg-neo-navy-light`, `shadow-hard-xl` black. Art inside a tile is unboxed (no card-in-card). Mascot stickers may overlap a tile edge.
- **Rules, not bars:** no short accent underline under headings. Sections split by space; the grid is the rhythm.
- **CTA voice:** one solid fill per tile, in the tile's mode colour, black ink. Yellow stays reserved for celebration — never a CTA fill.
- **Spacing:** tiles `gap-4 md:gap-5`; section blocks `py-12 md:py-20`; the hero is the only block allowed more.
- **Motion:** transform only; tiles lift 2px on hover; one entrance per tile at most; all behind `motion-safe`.
- **Stamp:** `components/landing/fresh/FreshBoard.module.css`.
