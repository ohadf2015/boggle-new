# LexiClash Blast Mode - Design System

## Product Context

LexiClash is a multiplayer word game with a neo-brutalist "Jackbox Party Pack" visual style. Blast Mode is a tile-clearing puzzle mode featuring waves, special tiles, cascades, and combo chains. The UI is dark-only, bold, playful, and high-contrast. There are 11 special tile types (standard + 10 special), each with unique visual treatments. Wave-based progression introduces harder tile combinations over time.

---

## Color Palette

### Core Neo-Brutalist Colors

| Token | Hex | Usage |
|---|---|---|
| `neo-lime` | `#BFFF00` | Primary accent (replaces legacy yellow) |
| `neo-lime-light` | `#D9FF66` | Soft highlight |
| `neo-lime-muted` | `#A6D900` | Subtle accent |
| `neo-lime-dark` | `#8FB300` | Grounded tone |
| `neo-pink` | `#FF1493` | Multiplayer / secondary accent |
| `neo-pink-light` | `#FF6BB8` | Friendly accent |
| `neo-pink-muted` | `#D9428F` | Muted energy |
| `neo-pink-dark` | `#B30066` | Deep emphasis |
| `neo-cyan` | `#00FFFF` | Single player / tertiary accent |
| `neo-cyan-light` | `#66FFFF` | Calm highlight |
| `neo-cyan-muted` | `#4DD9D9` | Subtle presence |
| `neo-cyan-dark` | `#00B3B3` | Strong anchor |
| `neo-purple` | `#8B5CF6` | Brain training / quaternary accent |
| `neo-purple-light` | `#A78BFA` | Gentle guidance |
| `neo-purple-muted` | `#7C4FCC` | Understated depth |
| `neo-purple-dark` | `#5B21B6` | Authoritative |
| `neo-red` | `#FF3366` | Error / destructive |
| `neo-navy` | `#1a1a2e` | Primary background |
| `neo-navy-light` | `#16213e` | Elevated background |
| `neo-cream` | `#FFFEF0` | Card/panel background |
| `neo-black` | `rgb(0 0 0)` | Borders, shadows, text on light |
| `neo-white` | `rgb(255 255 255)` | Text on dark |
| `neo-gray` | `#2d2d44` | Muted background / card dark |

### Legacy (Deprecated, backward-compatible)

| Token | Hex | Replace With |
|---|---|---|
| `neo-yellow` | `#FFE135` | `neo-lime` |
| `neo-yellow-hover` | `#FFD000` | `neo-lime-light` |
| `neo-orange` | `#FF6B35` | `neo-lime-dark` |
| `neo-orange-hover` | `#FF5722` | `neo-lime-dark` |

### Explosion Colors (Blast-specific)

| Explosion Type | Hex | Description |
|---|---|---|
| `bomb` | `#FF4444` | Red |
| `clear` | `#FFD700` | Gold |
| `word` | `#00FFFF` | Cyan |
| `cascade` | `#FF00FF` | Magenta |
| `lightning` | `#FFFF00` | Electric yellow |
| `magnet` | `#8B00FF` | Purple |
| `prism` | `#FF69B4` | Hot pink |
| `gem` | `#50C878` | Emerald green |

### Progress Bar Color Stops

| Percentage | Color | Hex |
|---|---|---|
| 0-49% | White | `#FFFFFF` |
| 50-74% | Cyan | `#00FFFF` |
| 75-99% | Lime | `#BFFF00` |
| 100% | Gold | `#FFD700` |

---

## Typography

### Font Families

| Token | Font Stack | Usage |
|---|---|---|
| `font-neo` | Fredoka, Rubik, sans-serif | General neo-brutalist |
| `font-neo-display` | Fredoka, sans-serif | Headings, titles, announcements |
| `font-neo-body` | Rubik, sans-serif | Body text, labels, stats |
| `font-sans` | Rubik, sans-serif | Default body |

### Font Weights

- `font-bold` (700) -- buttons, labels, stats
- `font-black` (900) -- headings, announcements, badges, score displays

### Text Sizes (Blast UI)

| Size | Usage |
|---|---|
| `text-[10px]` | Micro labels ("Cleared", "Score", "Need X more pts") |
| `text-xs` | Small labels, button text, badge text, tracking-wider |
| `text-sm` | Body text, notification text |
| `text-lg` | Combo milestone announcements |
| `text-xl` | Score display (mobile), cascade announcements |
| `text-2xl` | Score display (sm+), board-cleared title |

### Text Styles

- `.neo-title`: font-weight 900, uppercase, letter-spacing 0.02em, -webkit-text-stroke 2px black, text-shadow 4px 4px 0px black
- `.neo-title-sm`: font-weight 900, uppercase, letter-spacing 0.02em, -webkit-text-stroke 1px black, text-shadow 2px 2px 0px black
- Announcements: `font-black uppercase tracking-wider`
- Labels: `font-bold uppercase tracking-wider` or `tracking-widest`

---

## Shadows (Critical - NO blur)

All shadows use zero blur radius. This is the defining visual trait of neo-brutalism.

| Token | Value | Usage |
|---|---|---|
| `shadow-hard-sm` | `2px 2px 0px rgb(0 0 0)` | Small elements, badges, pressed state |
| `shadow-hard` / `shadow-hard-md` | `4px 4px 0px rgb(0 0 0)` | Buttons, cards, announcements |
| `shadow-hard-lg` | `6px 6px 0px rgb(0 0 0)` | Panels, game board frame |
| `shadow-hard-xl` | `8px 8px 0px rgb(0 0 0)` | Hover states, featured elements |
| `shadow-hard-2xl` | `10px 10px 0px rgb(0 0 0)` | Maximum emphasis |
| `shadow-hard-pressed` | `2px 2px 0px rgb(0 0 0)` | Active/pressed buttons |

### Colored Hard Shadows

| Token | Value |
|---|---|
| `shadow-hard-yellow` | `4px 4px 0px #FFE135` |
| `shadow-hard-pink` | `4px 4px 0px #FF1493` |
| `shadow-hard-cyan` | `4px 4px 0px #00FFFF` |
| `shadow-hard-purple` | `4px 4px 0px #581c87` |
| `shadow-hard-purple-lg` | `6px 6px 0px #581c87` |

### RTL Shadow Flipping

In RTL (Hebrew), all hard shadows auto-flip horizontally:
- `shadow-hard-sm` becomes `-2px 2px 0px`
- `shadow-hard` becomes `-4px 4px 0px`
- `shadow-hard-lg` becomes `-6px 6px 0px`
- etc.

### Button Press Mechanics

```
Default:   transform: translate(0, 0)      shadow: 4px 4px 0px black
Hover:     transform: translate(-1px, -1px) shadow: 5px 5px 0px black
Active:    transform: translate(2px, 2px)   shadow: 2px 2px 0px black (pressed)
```

---

## Borders

### Border Widths

| Token | Value | Usage |
|---|---|---|
| `border-2` | 2px | Standard inner borders |
| `border-3` | 3px | Neo-brutalist chunky (primary) |
| `border-4` | 4px | Thick neo-brutalist (cards, panels) |
| `border-5` | 5px | Extra thick |
| `border-6` | 6px | Maximum thickness |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-none` | 0px | Sharp edges |
| `rounded-neo-sm` | 2px | Minimal rounding |
| `rounded-neo` / `rounded-neo-md` | 4px | Standard neo-brutalist |
| `rounded-neo-lg` | 8px | Cards, panels |
| `rounded-neo-xl` | 12px | Large containers |
| `rounded-neo-pill` | 9999px | Pill shapes, progress bars |

---

## Animations

### Neo-Brutalist Core Animations

| Animation | Duration | Easing | Description |
|---|---|---|---|
| `animate-neo-press` | 0.1s | ease-out | Button press (translate + shadow shift) |
| `animate-neo-press-bounce` | 0.25s | ease-out | Enhanced press with rotation bounce |
| `animate-neo-wobble` | 0.3s | ease-in-out | Playful wobble (rotate -2deg to 2deg) |
| `animate-neo-pop` | 0.4s | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Entrance with scale + rotation |
| `animate-neo-slide-in` | 0.5s | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Slide down with bounce |
| `animate-neo-shake` | 0.4s | ease-in-out | Error shake (translateX + rotate) |

### Playful UI Animations

| Animation | Duration | Easing | Description |
|---|---|---|---|
| `animate-float` | 3s infinite | ease-in-out | Gentle vertical float (10px) |
| `animate-bob` | 2.5s infinite | ease-in-out | Bobbing with rotation |
| `animate-score-pop` | 0.3s | ease-out | Score change scale pulse (1 -> 1.3 -> 1) |
| `animate-screen-shake` | 0.4s | ease-in-out | Screen shake for bomb explosions |
| `animate-shake-rotate` | 0.5s | ease-in-out | Enhanced shake with rotation (8px + 2deg) |
| `animate-burst` | 0.5s forwards | ease-out | Celebration scale burst (0 -> 1.5, fade out) |
| `animate-coin-fall` | 0.6s forwards | ease-out | Coin upward float + rotate + fade |
| `animate-tier-flash` | 0.4s forwards | ease-out | Tier flash scale pulse |
| `animate-letter-bounce` | 0.6s infinite | ease-in-out | Letter bounce for loaders |
| `animate-drift` | 6s infinite | ease-in-out | Parallax drift (5px) |
| `animate-twinkle` | 2s infinite | ease-in-out | Sparkle opacity/scale pulse |
| `animate-shimmer` | 2s infinite | linear | Skeleton loading shimmer |
| `animate-pulse-subtle` | 2s infinite | ease-in-out | CTA button gentle pulse |

### Fast/Fade Animations

| Animation | Duration | Description |
|---|---|---|
| `animate-fade-in-fast` | 0.15s forwards | Quick opacity fade (0.6 -> 1) |
| `animate-fade-in-up` | 0.3s both, 0.2s delay | Fade in + translateY(8px -> 0) |

### Gradient Animations

| Animation | Duration | Description |
|---|---|---|
| `animate-gradient-xy` | 3s infinite | Background position shift (0% -> 100%) |
| `animate-gradient-x` | 3s infinite | Horizontal background shift |

### Hint Animations

| Animation | Duration | Description |
|---|---|---|
| `animate-hint-glow` | 2.5s infinite | Purple glow pulse for revealed words |
| `animate-hint-blink` | 1.5s, 2 iterations | Quick flash blink for hint trail |
| `animate-hint-fadeout` | 1s forwards | Fade out + scale down for hint end |

### Timing Functions (CSS Custom Properties)

| Variable | Value | Usage |
|---|---|---|
| `--ease-snap` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Snappy interactions |
| `--ease-bounce` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Bouncy entrances |
| `--ease-slam` | `cubic-bezier(0.55, 1.75, 0.6, 1)` | Impactful hits |
| `--duration-snap` | `100ms` | Quick interactions |
| `--duration-quick` | `150ms` | Fast transitions |

### Blast-Specific Tile Animations (CSS keyframes in globals.css)

| Class | Keyframe | Duration | Description |
|---|---|---|---|
| `.blast-tile-gold` | `blast-shimmer` | 2.5s infinite ease-in-out | Background position shift + opacity pulse (0.85 -> 1) |
| `.blast-tile-bomb` | `blast-pulse` | 1.8s infinite ease-in-out | Inner glow intensify + scale(1 -> 1.03) |
| `.blast-tile-rainbow` | `blast-rainbow` | 4s infinite linear | Background position shift (300% size) |
| `.blast-tile-ice` | `blast-ice-shimmer` | 3s infinite ease-in-out | Brightness pulse + blue inner glow intensify |
| `.blast-tile-wildcard` | `blast-wildcard-pulse` | 2.5s infinite ease-in-out | Opacity + hue-rotate(0 -> 30deg) |
| `.blast-tile-lightning` | `blast-lightning-flicker` | 1.5s infinite steps(3) | Stepped brightness flicker (1 -> 1.4 -> 0.9 -> 1.2) |
| `.blast-tile-magnet` | `blast-magnet-rotate` | 4s infinite linear | Background position rotation (200% size) |
| `.blast-tile-prism` | `blast-prism-spectrum` | 3s infinite linear | hue-rotate(0 -> 360deg) |
| `.blast-tile-gem` | `blast-gem-sparkle` | 2.5s infinite ease-in-out | Green inner glow + outer glow intensify |
| `.blast-tile-frozen` | `blast-frozen-glow` | 4s infinite ease-in-out | Frost blue inner glow + outer glow intensify |

---

## Tile Visual System

### Special Tile Background Configs (11 types)

All tile overlays render at z-index 5, behind the letter content. Each config defines background gradient, border, inner/outer shadow, and animation class.

#### gold
- **Background**: `linear-gradient(135deg, rgba(255,215,0,0.45) 0%, rgba(255,180,0,0.3) 40%, rgba(255,230,80,0.45) 100%)`
- **Border**: `2px solid rgba(255,215,0,0.6)`
- **Shadow**: `inset 0 0 16px rgba(255,215,0,0.35), 0 0 10px rgba(255,200,0,0.25)`
- **Animation**: `.blast-tile-gold` (shimmer)

#### bomb
- **Background**: `radial-gradient(circle at 35% 35%, rgba(255,100,60,0.45) 0%, rgba(180,20,0,0.35) 60%, rgba(80,0,0,0.25) 100%)`
- **Border**: `2px solid rgba(255,70,40,0.55)`
- **Shadow**: `inset 0 0 14px rgba(255,30,0,0.3), 0 0 8px rgba(255,50,20,0.2)`
- **Animation**: `.blast-tile-bomb` (pulse + scale)

#### rainbow
- **Background**: `linear-gradient(135deg, rgba(255,100,200,0.4) 0%, rgba(160,80,255,0.4) 33%, rgba(80,200,255,0.4) 66%, rgba(100,255,160,0.4) 100%)`
- **Border**: `2px solid rgba(168,85,247,0.55)`
- **Shadow**: `inset 0 0 14px rgba(168,85,247,0.25), 0 0 10px rgba(168,85,247,0.2)`
- **Animation**: `.blast-tile-rainbow` (position shift, 300% background-size)

#### ice
- **Background**: `linear-gradient(135deg, rgba(180,230,255,0.45) 0%, rgba(130,200,255,0.35) 50%, rgba(200,240,255,0.4) 100%)`
- **Border**: `2px solid rgba(150,220,255,0.6)`
- **Shadow**: `inset 0 0 16px rgba(150,220,255,0.3), 0 0 8px rgba(180,230,255,0.25)`
- **Animation**: `.blast-tile-ice` (brightness shimmer + blue glow)

#### wildcard
- **Background**: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(200,200,255,0.25) 60%, rgba(150,150,200,0.2) 100%)`
- **Border**: `2px dashed rgba(255,255,255,0.5)` (dashed, unique among all tiles)
- **Shadow**: `inset 0 0 12px rgba(255,255,255,0.2), 0 0 8px rgba(200,200,255,0.15)`
- **Animation**: `.blast-tile-wildcard` (opacity + hue-rotate)

#### lightning
- **Background**: `linear-gradient(135deg, rgba(255,225,0,0.45) 0%, rgba(0,191,255,0.35) 50%, rgba(255,255,0,0.4) 100%)`
- **Border**: `2px solid rgba(255,225,0,0.6)`
- **Shadow**: `inset 0 0 16px rgba(255,255,0,0.3), 0 0 10px rgba(0,191,255,0.25)`
- **Animation**: `.blast-tile-lightning` (stepped brightness flicker)

#### magnet
- **Background**: `radial-gradient(circle at 40% 40%, rgba(139,0,255,0.45) 0%, rgba(255,0,64,0.35) 60%, rgba(139,0,255,0.25) 100%)`
- **Border**: `2px solid rgba(139,0,255,0.6)`
- **Shadow**: `inset 0 0 14px rgba(139,0,255,0.3), 0 0 10px rgba(255,0,64,0.2)`
- **Animation**: `.blast-tile-magnet` (background position rotation)

#### prism
- **Background**: `conic-gradient(from 0deg, rgba(255,0,0,0.35), rgba(255,165,0,0.35), rgba(255,255,0,0.35), rgba(0,255,0,0.35), rgba(0,100,255,0.35), rgba(148,0,211,0.35), rgba(255,0,0,0.35))`
- **Border**: `2px solid rgba(255,255,255,0.6)`
- **Shadow**: `inset 0 0 16px rgba(255,255,255,0.3), 0 0 10px rgba(168,85,247,0.25)`
- **Animation**: `.blast-tile-prism` (full hue-rotate 360deg)

#### gem
- **Background**: `radial-gradient(circle at 40% 35%, rgba(80,200,120,0.5) 0%, rgba(0,128,80,0.35) 60%, rgba(0,80,40,0.25) 100%)`
- **Border**: `2px solid rgba(80,200,120,0.6)`
- **Shadow**: `inset 0 0 14px rgba(80,200,120,0.3), 0 0 10px rgba(0,200,100,0.25)`
- **Animation**: `.blast-tile-gem` (green glow sparkle)

#### frozen
- **Background**: `linear-gradient(135deg, rgba(200,220,255,0.5) 0%, rgba(160,200,240,0.4) 50%, rgba(220,240,255,0.45) 100%)`
- **Border**: `3px solid rgba(180,220,255,0.7)` (thicker border, unique among tiles)
- **Shadow**: `inset 0 0 18px rgba(180,220,255,0.35), 0 0 12px rgba(200,230,255,0.3)`
- **Animation**: `.blast-tile-frozen` (frost glow pulse)

---

## Multi-Hit Visual States

Some tiles require multiple hits before clearing. Their visual treatment degrades as hitsRemaining decreases, communicating state to the player.

### Ice (2 hits)
- **Default** (hitsRemaining=2): Full ice styling as defined above
- **Cracked** (hitsRemaining=1): Reduced opacity gradient `rgba(180,230,255,0.3)`, border changes to `2px solid rgba(255,255,255,0.4)`, opacity pulses [1, 0.85, 1] infinitely

### Prism (2 hits)
- **Default** (hitsRemaining=2): Full conic-gradient spectrum
- **Cracked** (hitsRemaining=1): Reduced opacity to 0.25 on all gradient stops, border brightens to `2px solid rgba(255,255,255,0.7)`, opacity pulses [1, 0.85, 1] infinitely

### Gem (3 hits)
- Glow intensifies as hitsRemaining decreases (3 -> 2 -> 1)
- Shadow formula: `inset 0 0 ${14 + intensity * 4}px rgba(80,200,120,${0.2 + intensity * 0.1}), 0 0 ${8 + intensity * 4}px rgba(0,200,100,${0.15 + intensity * 0.1})`
- Where intensity = `(3 - hitsRemaining + 1)`: values 1, 2, 3

### Frozen (3 hits)
- **Default** (hitsRemaining=3): Full frozen styling as defined above
- **Cracked** (hitsRemaining=2): Gradient opacity reduced (0.4/0.3/0.35), border thins to `3px solid rgba(180,220,255,0.5)`, opacity pulses
- **Nearly broken** (hitsRemaining=1): Gradient opacity further reduced (0.3/0.2/0.3), border thins to `2px solid rgba(255,255,255,0.5)`, opacity pulses

### Weakened State Animation
All cracked/weakened tiles share: `opacity: [1, 0.85, 1]` with `duration: 1s, repeat: Infinity, ease: easeInOut`

---

## Component Patterns

### Neo-Brutalist Buttons
```
border-3 border-neo-black rounded-neo shadow-hard
font-bold uppercase tracking-wide
hover: translate(-1px, -1px) shadow-hard-lg
active: translate(2px, 2px) shadow-hard-pressed
transition-all duration-100
```

Variants:
- **Primary**: `bg-neo-yellow text-neo-black`
- **Secondary**: `bg-neo-pink text-neo-white`
- **Ghost**: `bg-transparent text-neo-white`, hover: `bg-neo-navy-light`
- **Destructive**: `bg-neo-red text-neo-white`
- **Success**: `bg-neo-lime text-neo-black`

### Cards
- Dark game card: `bg-white/5 border border-white/10 rounded-neo` (word forming area when active)
- Neo card (light): `bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg`
- Neo card dark: `bg-neo-gray border-4 border-neo-black rounded-neo-lg shadow-hard-lg text-neo-white`

### Announcements (Combo Milestones, Cascade Banners)
- Container: `px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black uppercase tracking-wider`
- Gradient backgrounds based on intensity:
  - Combo 3: `bg-neo-cyan text-neo-black`
  - Combo 5: `bg-gradient-to-r from-neo-yellow to-neo-orange text-neo-black`
  - Combo 7: `bg-gradient-to-r from-pink-500 via-cyan-500 to-yellow-500 text-white`
  - Combo 10+: `bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black`
  - Cascade 1: `bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white`
  - Cascade 2+: `bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white`
  - Cascade 4+: `bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-500 text-white`
- Entrance: spring animation (stiffness: 400, damping: 20), scale 0.5 -> 1
- Exit: scale 1.5, fade out, y: -10

### Overlays
- Backdrop: `backdrop-blur-sm bg-neo-black/40` (board-complete overlay)
- Screen flash: `bg-white` with opacity 0.1 -> 0, duration 0.2s
- Pointer: `pointer-events-none` on all decorative overlays

### Badges
- Base: `px-3 py-1 text-sm font-black uppercase tracking-wide border-3 border-neo-black rounded-md shadow-hard-sm`
- Wave badge: `px-2 py-0.5 rounded-neo border-2 border-fuchsia-400/60 bg-fuchsia-500/20 font-black text-xs text-fuchsia-300 uppercase tracking-wider`

### Score Card (Tilted)
```
border-3 border-neo-black rounded-neo shadow-hard
px-3 py-1.5 min-w-[80px]
background: linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)
rotate: -1.5deg
```
- Score number: `font-black text-neo-black text-xl sm:text-2xl leading-tight tabular-nums`
- Score label: `font-bold uppercase tracking-wider text-neo-black/60 text-[10px] sm:text-xs`

### Progress Bar
- Track: `h-3 bg-white/10 rounded-full border border-white/20`
- Fill: spring-animated width, color transitions through white -> cyan -> lime -> gold
- Milestone markers: vertical `w-px` lines at 25%, 50%, 75%, 100%
- Shine overlay: `bg-gradient-to-b from-white/20 to-transparent`

### Dead-End Notification
```
border-3 border-neo-black rounded-neo shadow-hard-sm p-3
bg-gradient-to-r from-neo-orange/90 to-neo-pink/90
flex items-center justify-between gap-2
```

---

## Layout Pattern

### Full-Screen Portrait Layout

```
div.relative.flex-1.flex.flex-col.overflow-hidden.h-full.bg-neo-navy
  |
  +-- DynamicEnergyBackground (absolute, behind everything)
  +-- Screen flash overlay (z-40, pointer-events-none)
  |
  +-- Header (z-30, shrink-0, pt-4 pb-2, px-4)
  |     [Quit button] [Wave badge] [Help button] [End Game button]
  |
  +-- Combo Display (z-30, h-8, centered)
  |
  +-- Combo milestone announcement (z-50, absolute, pointer-events-none)
  +-- Cascade word banner (z-50, absolute, pointer-events-none)
  +-- Cascade chain announcement (z-50, absolute, pointer-events-none)
  |
  +-- Stats Row (z-30, shrink-0, px-4, max-w-md, mx-auto)
  |     [Score card (tilted)] [Words count (clickable)] [Progress bar]
  |
  +-- Score threshold hint (z-30, conditional)
  +-- Cumulative score indicator (z-30, conditional)
  |
  +-- Word Forming Area (z-30, shrink-0, px-4, max-w-[360px], mx-auto)
  |     min-h-[48px], rounded-neo
  |     When active: bg-white/5 border border-white/10
  |
  +-- Found Words list (z-30, expandable, AnimatePresence)
  +-- Dead-end notification (z-30, conditional, AnimatePresence)
  |
  +-- Game Grid Container (z-30, flex-1, min-h-0)
  |     +-- Board complete overlay (z-50, backdrop-blur-sm, bg-neo-black/40)
  |     +-- BlastGrid
  |           +-- game-board-frame (blast override: 100% width/height, 6px padding)
  |           +-- Grid cells
  |
  +-- Quit Confirmation Dialog
  +-- End Game Confirmation Dialog
  +-- Help Modal
```

### Z-Index Layering (within grid area)

| Layer | Z-Index | Content |
|---|---|---|
| Tile overlays | z-[5] | Special tile background gradients |
| Grid cells | z-10 | Letter tiles (default game-board-frame > *) |
| Cascade highlights | z-[15] | Cascade word path highlighting |
| Cascade animations | z-[20] | Falling/clearing tile animations |
| Explosions + Score popups | z-30 | Particle explosions, floating score numbers |
| Screen flash | z-40 | White flash on word clear |
| Announcements + Overlays | z-50 | Combo milestones, cascade banners, board-complete overlay |

### Grid Sizing (Blast Mode Override)

In blast mode, the game board frame fills its parent container:
```css
.blast-game .game-board-frame {
  --board-size: 100%;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  padding: 6px;
}
```

The grid is always 6x6 square, with `max-w-[360px]` on the word forming area. The grid container uses `flex-1 min-h-0` to fill remaining vertical space.

### Combo-Based Grid Glow

| Combo Level | Glow Effect |
|---|---|
| 3-4 | `0 0 10px rgba(0,255,255,0.3)` (cyan) |
| 5-6 | `0 0 15px rgba(255,225,53,0.4)` (yellow) |
| 7+ | `0 0 20px rgba(255,0,255,0.4)` (magenta) |

---

## Constraint: Design system is HARD constraint

- Use ONLY the fonts, colors, spacing, and component styles defined above
- Do not introduce any fonts, colors, or visual styles not in this system
- All text must be in UI font style (Fredoka display, Rubik body)
- All interactive elements MUST have neo-brutalist hard shadows (zero blur)
- All borders must use the defined border widths (2px, 3px, 4px) with black or specified colors
- All border radius must use the defined neo tokens (2px, 4px, 8px, 12px, 9999px)
- All animations must use the defined keyframes and timing functions
- All announcements/overlays must use the defined gradient + border + shadow patterns
- RTL support is required: shadows flip, layout respects dir attribute
- `prefers-reduced-motion` must be respected: disable all animations
- Low-end device class `.low-end-device` disables texture overlays and complex shadows
