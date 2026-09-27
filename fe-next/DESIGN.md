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
