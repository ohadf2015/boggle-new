# LexiClash Design Theme

## Overview
Neo-Brutalist "Jackbox Party Pack" style - dark-only, bold, playful, high-contrast.

## Core Philosophy
- **Hard Shadows (NO blur)** - Defining characteristic
- **Chunky Borders** - 3-4px thick black borders
- **Minimal Rounding** - 4-8px border radius
- **4-Color Palette** - Lime, Pink, Cyan, Purple
- **Playful Typography** - Fredoka (display), Rubik (body)

---

## Color Palette

### Primary Colors (CSS Variables)
```css
/* LIME Family (Primary) */
--neo-lime: #BFFF00;           /* Electric, energetic */
--neo-lime-light: #D9FF66;     /* Soft highlight */
--neo-lime-muted: #A6D900;     /* Subtle accent */
--neo-lime-dark: #8FB300;      /* Grounded tone */

/* PINK Family (Multiplayer) */
--neo-pink: #FF1493;           /* Vibrant, playful */
--neo-pink-light: #FF6BB8;     /* Friendly accent */
--neo-pink-muted: #D9428F;     /* Muted energy */
--neo-pink-dark: #B30066;      /* Deep emphasis */

/* CYAN Family (Single Player) */
--neo-cyan: #00FFFF;           /* Cool, focused */
--neo-cyan-light: #66FFFF;     /* Calm highlight */
--neo-cyan-muted: #4DD9D9;     /* Subtle presence */
--neo-cyan-dark: #00B3B3;      /* Strong anchor */

/* PURPLE Family (Brain Training) */
--neo-purple: #8B5CF6;         /* Intelligent, premium */
--neo-purple-light: #A78BFA;   /* Gentle guidance */
--neo-purple-muted: #7C4FCC;   /* Understated depth */
--neo-purple-dark: #5B21B6;    /* Authoritative */

/* Structural Colors */
--neo-navy: #1a1a2e;           /* Background */
--neo-navy-light: #16213e;     /* Lighter background */
--neo-cream: #FFFEF0;          /* Card backgrounds */
--neo-black: 0 0 0;            /* Borders/shadows */
--neo-white: 255 255 255;      /* Text */
--neo-red: #FF3366;            /* Error/destructive */
```

### Achievement Tier Colors
```css
--tier-bronze: #CD7F32;
--tier-silver: #C0C0C0;
--tier-gold: #FFD700;
--tier-platinum: #E5E4E2;
--tier-diamond: #B9F2FF;
```

---

## Hard Shadow System

### Shadow Utilities (NO blur - critical)
```css
--shadow-sm: 2px 2px 0px rgb(var(--neo-black));
--shadow-md: 4px 4px 0px rgb(var(--neo-black));
--shadow-lg: 6px 6px 0px rgb(var(--neo-black));
--shadow-xl: 8px 8px 0px rgb(var(--neo-black));
--shadow-pressed: 2px 2px 0px rgb(var(--neo-black));
```

### RTL Support
Shadows auto-flip for Hebrew/RTL:
```css
[dir="rtl"] .shadow-hard { box-shadow: -4px 4px 0px rgb(var(--neo-black)); }
```

---

## Border System

### Border Widths
```css
--border-neo: 3px;        /* Standard */
--border-neo-thick: 4px;  /* Emphasis */
```

### Border Radius
```css
--radius-sm: 2px;   /* neo-sm */
--radius: 4px;      /* neo (default) */
--radius-md: 4px;   /* neo-md */
--radius-lg: 8px;   /* neo-lg */
--radius-xl: 12px;  /* neo-xl */
```

---

## Typography

### Font Families
```css
--font-fredoka: 'Fredoka', sans-serif;  /* Display headings */
--font-rubik: 'Rubik', sans-serif;      /* Body text */
```

### Tailwind Classes
- `font-neo-display` - Fredoka for headings
- `font-neo-body` - Rubik for body text

### Neo-Brutalist Title Style
```css
.neo-title {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  -webkit-text-stroke: 2px rgb(var(--neo-black));
  text-shadow: 4px 4px 0px rgb(var(--neo-black));
}
```

---

## Animation System

### Timing Functions
```css
--ease-snap: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-slam: cubic-bezier(0.55, 1.75, 0.6, 1);
--duration-snap: 100ms;
--duration-quick: 150ms;
```

### Key Animations
- `animate-neo-press` - Button press (0.1s)
- `animate-neo-pop` - Entrance pop (0.4s)
- `animate-neo-wobble` - Playful wobble (0.3s)
- `animate-neo-shake` - Error shake (0.4s)
- `animate-neo-slide-in` - Slide entrance (0.5s)
- `animate-pulse-subtle` - CTA pulse (2s infinite)
- `animate-float` - Floating elements (3s infinite)
- `animate-score-pop` - Score increase (0.3s)
- `animate-shimmer` - Loading skeleton (2s infinite)

---

## Background Patterns

### Halftone Texture
```css
--halftone-pattern: url("data:image/svg+xml,..."); /* Subtle white dots */
```
Usage: `texture-halftone` class

### Retro Grid
```css
--retro-grid-pattern: linear-gradient(...); /* Subtle grid lines */
```

### Body Background
```css
body {
  background-color: var(--neo-navy);
  background-image: var(--halftone-pattern), var(--retro-grid-pattern);
  background-size: 20px 20px, 60px 60px;
}
```

---

## Component Patterns

### Button Base
```css
.btn-neo {
  border: 3px solid rgb(var(--neo-black));
  box-shadow: 4px 4px 0px rgb(var(--neo-black));
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  transition: transform 100ms, box-shadow 100ms;
}
.btn-neo:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0px rgb(var(--neo-black));
}
.btn-neo:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px rgb(var(--neo-black));
}
```

### Card Base
```css
.neo-card {
  background: var(--neo-cream);
  border: 4px solid rgb(var(--neo-black));
  box-shadow: 6px 6px 0px rgb(var(--neo-black));
  border-radius: 8px;
}
```

### Badge Base
```css
.badge-neo {
  padding: 4px 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border: 3px solid rgb(var(--neo-black));
  box-shadow: 2px 2px 0px rgb(var(--neo-black));
  border-radius: 4px;
}
```

---

## Responsive Breakpoints

```javascript
screens: {
  'xs': '480px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
  'tv': '1920px',
  'tv-4k': '3840px',
}
```

### Container Queries
Prefer `cqw`, `cqh`, `cqi` units over viewport units for component-level responsiveness.

---

## Game Board Frame
```css
.game-board-frame {
  background: var(--neo-cream);
  border: 4px solid rgb(var(--neo-black));
  box-shadow: 6px 6px 0px rgb(var(--neo-black));
  border-radius: 8px;
  padding: 12px;
  --board-size: min(80vmin, calc(100vw - 32px), calc(100dvh - 220px));
  width: var(--board-size);
  height: var(--board-size);
  aspect-ratio: 1 / 1;
}
```

---

## Adventure Mode World Theming

### World 1: Meadows
- Lime/green accent
- Vine decorations
- Wood grain textures

### World 2: Springs
- Cyan accent
- Water splash effects
- Bubble textures

### World 3: Caverns
- Purple accent
- Crystal decorations
- Gem textures
