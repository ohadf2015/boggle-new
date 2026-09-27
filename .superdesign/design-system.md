# LexiClash Design System

## Product Context
LexiClash is a multiplayer word game (think Boggle meets Jackbox). Players join rooms, compete in real-time word-finding battles. The host pre-game lobby is where players gather before a match.

## Visual Direction: Neo-Brutalist Dark Gaming
- **Dark-only** — no light mode
- **High contrast** — bold borders, hard shadows, vivid accent colors
- **Playful & bold** — thick borders, uppercase labels, game-like energy
- **NO blur shadows** — only hard offset shadows (2px 2px 0px black)

## Color Tokens
| Token | Value | Usage |
|-------|-------|-------|
| neo-lime | #BFFF00 | Primary CTA, active states |
| neo-pink | #FF1493 | Multiplayer accent |
| neo-cyan | #00FFFF | Secondary accent, links |
| neo-purple | #8B5CF6 | Brain/random mode |
| neo-red | #FF3366 | Error, destructive |
| neo-navy | #1a1a2e | Page background |
| neo-navy-light | #16213e | Card/elevated bg |
| slate-800 | #1e293b | Card surface |
| neo-cream | #FFFEF0 | Primary text |
| neo-black | #000000 | Borders, shadows |
| neo-white | #ffffff | High-emphasis text |

## Typography
| Role | Font | Weight |
|------|------|--------|
| Display/Headings | Fredoka (font-neo-display) | 900 (black) |
| Body | Rubik (font-neo-body) | 400-700 |
| Labels | Rubik | 700 (bold), uppercase, tracking-widest |

## Borders & Corners
- Standard: 2px solid black (`border-2 border-neo-black`)
- Prominent: 3-4px solid black
- Radius: 8px standard (`rounded-neo`), 12px large (`rounded-neo-lg`)

## Shadows (Hard, NO blur)
- sm: `1px 1px 0px black`
- md: `2px 2px 0px black`
- lg: `3px 3px 0px black`
- pressed: `1px 1px 0px black` (for active/pressed state)
- RTL: negative x offset

## Spacing Scale
- Tight: 4-8px (gap-1 to gap-2)
- Standard: 12-16px (gap-3 to gap-4)
- Generous: 20-32px (gap-5 to gap-8)

## Layout Patterns
- Desktop: 12-col grid, typically 7+5 or 8+4 split
- Mobile: single column, sticky CTA bottom
- Max width: 7xl (80rem)
- Container: 94% width on mobile

## Component Patterns
- Cards: `rounded-neo-lg border-3 border-neo-black bg-slate-800 shadow-hard`
- Buttons: `font-neo-display font-black uppercase border-3 border-neo-black shadow-hard`
- CTA: lime background, black text, full width
- Mode selectors: 2x2 grid of selectable cards
- Player avatars: circular with colored backgrounds, optional ring indicator

## Animation
- Spring-based entrance (stiffness: 300-500, damping: 20-26)
- Staggered children (0.06-0.1s delay)
- WhileTap scale 0.95-0.98
- No continuous/infinite animations except subtle pulses

## Key Constraint
- ALL text uses i18n `t('key')` — never hardcoded
- RTL support (Hebrew) — shadows and icons flip
- Must work on mobile (320px+) through desktop (1920px+)
