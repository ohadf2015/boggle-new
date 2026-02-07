# LexiClash Design System

## Theme Philosophy
Neo-Brutalist "Jackbox Party Pack" style - dark-only, bold, playful, high-contrast.

## Core Design Principles
1. **Hard Shadows (NO blur)** - Defining characteristic
2. **Chunky Borders** - 3-4px thick black borders
3. **Minimal Rounding** - 4-8px border radius
4. **4-Color Palette** - Lime, Pink, Cyan, Purple
5. **Playful Typography** - Fredoka (display), Rubik (body)

## Color Palette

### Primary Colors
- **Neo-Lime (Primary)**: `#BFFF00` - Electric, energetic
- **Neo-Pink (Multiplayer)**: `#FF1493` - Vibrant, playful
- **Neo-Cyan (Single Player)**: `#00FFFF` - Cool, focused - PRIMARY COLOR FOR SINGLE PLAYER MODE
- **Neo-Purple (Brain Training)**: `#8B5CF6` - Intelligent, premium

### Structural Colors
- **Neo-Navy (Background)**: `#1a1a2e`
- **Neo-Navy-Light**: `#16213e`
- **Neo-Cream (Card backgrounds)**: `#FFFEF0`
- **Neo-Black**: `rgb(0, 0, 0)` - Borders/shadows
- **Neo-White**: `rgb(255, 255, 255)` - Text
- **Neo-Red**: `#FF3366` - Error/destructive

### Gradient for Score Display
```css
background: linear-gradient(135deg, #FFE135 0%, #BFFF00 100%);
```

## Typography

### Fonts
- **Display/Headings**: `'Fredoka', sans-serif`
- **Body Text**: `'Rubik', sans-serif`

### Title Styling
```css
.neo-title {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  -webkit-text-stroke: 2px rgb(var(--neo-black));
  text-shadow: 4px 4px 0px rgb(var(--neo-black));
}
```

## Shadow System (NO BLUR - CRITICAL)
```css
--shadow-sm: 2px 2px 0px rgb(0, 0, 0);
--shadow-md: 4px 4px 0px rgb(0, 0, 0);
--shadow-lg: 6px 6px 0px rgb(0, 0, 0);
--shadow-xl: 8px 8px 0px rgb(0, 0, 0);
--shadow-pressed: 2px 2px 0px rgb(0, 0, 0);
```

## Border System
- **Standard**: 3px solid black (`border-neo`)
- **Thick**: 4px solid black (`border-neo-thick`)
- **Border Radius**: `4px` (neo), `8px` (neo-lg), `12px` (neo-xl)

## Button Styling
```css
.btn-neo {
  border: 3px solid rgb(0, 0, 0);
  box-shadow: 4px 4px 0px rgb(0, 0, 0);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  min-height: 48px; /* Touch target */
  min-width: 48px;
}

/* Hover: Lift up */
.btn-neo:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0px rgb(0, 0, 0);
}

/* Active: Press down */
.btn-neo:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px rgb(0, 0, 0);
}
```

## Card Styling
```css
.neo-card {
  background: #FFFEF0; /* Neo-cream */
  border: 4px solid rgb(0, 0, 0);
  box-shadow: 6px 6px 0px rgb(0, 0, 0);
  border-radius: 8px;
}
```

## Animation Timing
```css
--ease-snap: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-slam: cubic-bezier(0.55, 1.75, 0.6, 1);
--duration-snap: 100ms;
--duration-quick: 150ms;
```

## Key Animations Available
- `animate-neo-press` - Button press (0.1s)
- `animate-neo-pop` - Entrance pop (0.4s)
- `animate-neo-wobble` - Playful wobble (0.3s)
- `animate-neo-shake` - Error shake (0.4s)
- `animate-neo-slide-in` - Slide entrance (0.5s)
- `animate-pulse-subtle` - CTA pulse (2s infinite)
- `animate-float` - Floating elements (3s infinite)
- `animate-score-pop` - Score increase (0.3s)

## Background Pattern
Halftone texture + Retro grid overlay on dark navy background

## Game Board Frame
```css
.game-board-frame {
  background: #FFFEF0; /* Neo-cream */
  border: 4px solid rgb(0, 0, 0);
  box-shadow: 6px 6px 0px rgb(0, 0, 0);
  border-radius: 8px;
  padding: 12px;
  aspect-ratio: 1 / 1;
}
```

## Mobile Layout Variables
```css
--mobile-tab-bar-height: 5rem; /* 80px */
--mobile-bottom-safe: calc(var(--mobile-tab-bar-height) + env(safe-area-inset-bottom));
--header-height-mobile: 60px;
```

## RTL Support
- Shadows auto-flip for Hebrew: `[dir="rtl"] .shadow-hard { box-shadow: -4px 4px 0px rgb(0, 0, 0); }`

## Single Player Mode Specific
- Primary accent: **Neo-Cyan** (#00FFFF)
- Game view is optimized for focus and fast gameplay
- Vertical stack layout on mobile (Portrait)
- 3-column layout on desktop (Left sidebar, Game board, Right sidebar)
