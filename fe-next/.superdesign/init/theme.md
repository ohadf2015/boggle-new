# LexiClash Design Theme

## Overview
Neo-Brutalist "Jackbox Party Pack" style - dark-only, bold, playful, high-contrast.
Hard shadows (NO blur), chunky borders, electric colors, playful animations.

---

## Utility Function
**Path:** `lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Tailwind Config
**Path:** `tailwind.config.js` (613 lines)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './contexts/**/*.{js,jsx,ts,tsx,mdx}',
    './utils/**/*.{js,jsx,ts,tsx,mdx}',
    './host/**/*.{js,jsx,ts,tsx,mdx}',
    './player/**/*.{js,jsx,ts,tsx,mdx}',
    './lib/**/*.{js,jsx,ts,tsx,mdx}',
    './*.{js,jsx,ts,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.5rem",
        sm: "0.75rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
      },
      screens: { "2xl": "2400px" },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      'cg-mobile': '800px',
      'cg-min': '821px',
      'cg-tablet': '1080px',
      'tv': '1920px',
      'tv-4k': '3840px',
      'tall': { 'raw': '(min-height: 800px)' },
      'short': { 'raw': '(max-height: 600px)' },
      'desktop-tall': { 'raw': '(min-width: 1024px) and (min-height: 700px)' },
    },
    extend: {
      colors: {
        neo: {
          lime: "var(--neo-lime)",
          "lime-light": "var(--neo-lime-light)",
          "lime-muted": "var(--neo-lime-muted)",
          "lime-dark": "var(--neo-lime-dark)",
          pink: "var(--neo-pink)",
          "pink-light": "var(--neo-pink-light)",
          "pink-muted": "var(--neo-pink-muted)",
          "pink-dark": "var(--neo-pink-dark)",
          cyan: "var(--neo-cyan)",
          "cyan-light": "var(--neo-cyan-light)",
          "cyan-muted": "var(--neo-cyan-muted)",
          "cyan-dark": "var(--neo-cyan-dark)",
          purple: "var(--neo-purple)",
          "purple-light": "var(--neo-purple-light)",
          "purple-muted": "var(--neo-purple-muted)",
          "purple-dark": "var(--neo-purple-dark)",
          red: "var(--neo-red)",
          navy: "var(--neo-navy)",
          "navy-light": "var(--neo-navy-light)",
          cream: "var(--neo-cream)",
          black: "rgb(var(--neo-black) / <alpha-value>)",
          white: "rgb(var(--neo-white) / <alpha-value>)",
          gray: "var(--neo-gray)",
          // DEPRECATED
          yellow: "var(--neo-yellow)",
          "yellow-hover": "var(--neo-yellow-hover)",
          orange: "var(--neo-orange)",
          "orange-hover": "var(--neo-orange-hover)",
        },
        brand: {
          google: "var(--brand-google)",
          "google-hover": "var(--brand-google-hover)",
          "google-dark": "var(--brand-google-dark)",
          discord: "var(--brand-discord)",
          "discord-hover": "var(--brand-discord-hover)",
          "discord-dark": "var(--brand-discord-dark)",
          apple: "var(--brand-apple)",
          "apple-hover": "var(--brand-apple-hover)",
          "apple-light": "var(--brand-apple-light)",
          whatsapp: "var(--brand-whatsapp)",
          "whatsapp-hover": "var(--brand-whatsapp-hover)",
          "whatsapp-dark": "var(--brand-whatsapp-dark)",
          facebook: "var(--brand-facebook)",
          "facebook-hover": "var(--brand-facebook-hover)",
          "facebook-dark": "var(--brand-facebook-dark)",
          twitter: "var(--brand-twitter)",
          "twitter-hover": "var(--brand-twitter-hover)",
          "twitter-dark": "var(--brand-twitter-dark)",
          linkedin: "var(--brand-linkedin)",
          "linkedin-hover": "var(--brand-linkedin-hover)",
          "linkedin-dark": "var(--brand-linkedin-dark)",
        },
        tier: {
          bronze: "#CD7F32", "bronze-border": "#8B4513", "bronze-glow": "rgba(205, 127, 50, 0.5)",
          silver: "#C0C0C0", "silver-border": "#808080", "silver-glow": "rgba(192, 192, 192, 0.5)",
          gold: "#FFD700", "gold-border": "#B8860B", "gold-glow": "rgba(255, 215, 0, 0.5)",
          platinum: "#E5E4E2", "platinum-border": "#9370DB", "platinum-glow": "rgba(229, 228, 226, 0.5)",
          diamond: "#B9F2FF", "diamond-border": "#00CED1", "diamond-glow": "rgba(185, 242, 255, 0.5)",
        },
        overlay: { light: "rgba(0, 0, 0, 0.1)", DEFAULT: "rgba(0, 0, 0, 0.5)", dark: "rgba(0, 0, 0, 0.8)" },
        glow: { white: "rgba(255, 255, 255, 0.5)", "white-strong": "rgba(255, 255, 255, 0.9)", cyan: "rgba(0, 255, 255, 0.5)", pink: "rgba(255, 20, 147, 0.5)" },
        bot: {
          purple: "#9333ea", "purple-light": "#a855f7", "purple-dark": "#7e22ce",
          indigo: "#6366f1", "indigo-dark": "#4f46e5", border: "#581c87",
        },
        avatar: { 1: "#FF6B6B", 2: "#4ECDC4", 3: "#45B7D1", 4: "#FFA07A", 5: "#98D8C8", 6: "#F7DC6F", 7: "#BB8FCE", 8: "#85C1E2", 9: "#F8B739", 10: "#52B788", 11: "#FF8FAB", 12: "#6BCF7F", 13: "#FFB347", 14: "#9D84B7", 15: "#FF6F61" },
        // Semantic colors
        border: "var(--border)", input: "var(--input)", ring: "var(--ring)",
        background: "var(--background)", foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
      },
      borderWidth: { '3': '3px', '4': '4px', '5': '5px', '6': '6px' },
      boxShadow: {
        'hard-sm': '2px 2px 0px rgb(var(--neo-black))',
        'hard': '4px 4px 0px rgb(var(--neo-black))',
        'hard-md': '4px 4px 0px rgb(var(--neo-black))',
        'hard-lg': '6px 6px 0px rgb(var(--neo-black))',
        'hard-xl': '8px 8px 0px rgb(var(--neo-black))',
        'hard-2xl': '10px 10px 0px rgb(var(--neo-black))',
        'hard-pressed': '2px 2px 0px rgb(var(--neo-black))',
        'hard-yellow': '4px 4px 0px var(--neo-yellow)',
        'hard-pink': '4px 4px 0px var(--neo-pink)',
        'hard-cyan': '4px 4px 0px var(--neo-cyan)',
        'hard-purple': '4px 4px 0px #581c87',
        'hard-purple-lg': '6px 6px 0px #581c87',
        'none': 'none',
      },
      borderRadius: {
        'none': '0px', 'neo-sm': '2px', 'neo': '4px', 'neo-md': '4px',
        'neo-lg': '8px', 'neo-xl': '12px', 'neo-pill': '9999px',
        lg: "var(--radius-lg)", md: "var(--radius-md)", sm: "var(--radius-sm)",
      },
      backgroundImage: {
        'gradient-rank-first': 'linear-gradient(135deg, var(--gradient-rank-first-from), var(--gradient-rank-first-via), var(--gradient-rank-first-to))',
        'gradient-rank-second': 'linear-gradient(135deg, var(--gradient-rank-second-from), var(--gradient-rank-second-via), var(--gradient-rank-second-to))',
        'gradient-rank-third': 'linear-gradient(135deg, var(--gradient-rank-third-from), var(--gradient-rank-third-via), var(--gradient-rank-third-to))',
        'gradient-stat-positive': 'linear-gradient(135deg, var(--gradient-stat-positive-from), var(--gradient-stat-positive-to))',
        'gradient-stat-negative': 'linear-gradient(135deg, var(--gradient-stat-negative-from), var(--gradient-stat-negative-to))',
        'gradient-stat-neutral': 'linear-gradient(135deg, var(--gradient-stat-neutral-from), var(--gradient-stat-neutral-to))',
        'gradient-bg-navy': 'linear-gradient(135deg, var(--gradient-bg-navy-from), var(--gradient-bg-navy-to))',
        'gradient-bg-accent': 'linear-gradient(135deg, var(--gradient-bg-accent-from), var(--gradient-bg-accent-via), var(--gradient-bg-accent-to))',
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "gradient-xy": { "0%, 100%": { "background-position": "0% 50%" }, "50%": { "background-position": "100% 50%" } },
        "neo-press": {
          "0%": { transform: "translate(0, 0)", boxShadow: "4px 4px 0px rgb(var(--neo-black))" },
          "100%": { transform: "translate(2px, 2px)", boxShadow: "2px 2px 0px rgb(var(--neo-black))" },
        },
        "neo-press-bounce": {
          "0%": { transform: "translate(0, 0) rotate(0deg)", boxShadow: "4px 4px 0px rgb(var(--neo-black))" },
          "40%": { transform: "translate(3px, 3px) rotate(-1deg)", boxShadow: "1px 1px 0px rgb(var(--neo-black))" },
          "60%": { transform: "translate(1px, 1px) rotate(0.5deg)", boxShadow: "3px 3px 0px rgb(var(--neo-black))" },
          "100%": { transform: "translate(0, 0) rotate(0deg)", boxShadow: "4px 4px 0px rgb(var(--neo-black))" },
        },
        "float": { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        "bob": { "0%, 100%": { transform: "translateY(0px) rotate(-1deg)" }, "50%": { transform: "translateY(-5px) rotate(1deg)" } },
        "score-pop": { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.3)" }, "100%": { transform: "scale(1)" } },
        "shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        "screen-shake": { "0%, 100%": { transform: "translateX(0)" }, "20%": { transform: "translateX(-3px)" }, "40%": { transform: "translateX(3px)" }, "60%": { transform: "translateX(-2px)" }, "80%": { transform: "translateX(2px)" } },
        "burst": { "0%": { transform: "scale(0)", opacity: "1" }, "50%": { transform: "scale(1.2)", opacity: "0.8" }, "100%": { transform: "scale(1.5)", opacity: "0" } },
        "coin-fall": { "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" }, "100%": { transform: "translateY(-60px) rotate(180deg)", opacity: "0" } },
        "neo-wobble": { "0%, 100%": { transform: "rotate(-2deg)" }, "50%": { transform: "rotate(2deg)" } },
        "neo-pop": { "0%": { transform: "scale(0.8) rotate(-5deg)", opacity: "0" }, "60%": { transform: "scale(1.1) rotate(2deg)", opacity: "1" }, "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" } },
        "neo-slide-in": { "0%": { transform: "translateY(-20px) rotate(-3deg)", opacity: "0" }, "60%": { transform: "translateY(5px) rotate(1deg)" }, "100%": { transform: "translateY(0) rotate(0deg)", opacity: "1" } },
        "neo-shake": { "0%, 100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-4px) rotate(-1deg)" }, "75%": { transform: "translateX(4px) rotate(1deg)" } },
        "pulse-subtle": { "0%, 100%": { transform: "scale(1)", boxShadow: "6px 6px 0px rgb(var(--neo-black))" }, "50%": { transform: "scale(1.02)", boxShadow: "8px 8px 0px rgb(var(--neo-black))" } },
        "hint-glow": { "0%, 100%": { boxShadow: "0 0 6px rgba(139, 92, 246, 0.4), 0 0 12px rgba(139, 92, 246, 0.2), 4px 4px 0 #000" }, "50%": { boxShadow: "0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.25), 4px 4px 0 #000" } },
        "fade-in-fast": { "0%": { opacity: "0.6" }, "100%": { opacity: "1" } },
        "fade-in-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-xy": "gradient-xy 3s ease infinite",
        "neo-press": "neo-press 0.1s ease-out forwards",
        "neo-wobble": "neo-wobble 0.3s ease-in-out",
        "neo-pop": "neo-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-slide-in": "neo-slide-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-shake": "neo-shake 0.4s ease-in-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "hint-glow": "hint-glow 2.5s ease-in-out infinite",
        "fade-in-fast": "fade-in-fast 0.15s ease-out forwards",
        "fade-in-up": "fade-in-up 0.3s ease-out 0.2s both",
        "neo-press-bounce": "neo-press-bounce 0.25s ease-out",
        "float": "float 3s ease-in-out infinite",
        "bob": "bob 2.5s ease-in-out infinite",
        "score-pop": "score-pop 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "screen-shake": "screen-shake 0.4s ease-in-out",
        "burst": "burst 0.5s ease-out forwards",
        "coin-fall": "coin-fall 0.6s ease-out forwards",
        "letter-bounce": "letter-bounce 0.6s ease-in-out infinite",
        "drift": "drift 6s ease-in-out infinite",
        "twinkle": "twinkle 2s ease-in-out infinite",
      },
      fontFamily: {
        'neo': ['var(--font-fredoka)', 'var(--font-rubik)', 'Fredoka', 'Rubik', 'sans-serif'],
        'neo-display': ['var(--font-fredoka)', 'Fredoka', 'sans-serif'],
        'neo-body': ['var(--font-rubik)', 'Rubik', 'sans-serif'],
        sans: ['var(--font-rubik)', 'Rubik', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem', '22': '5.5rem', '26': '6.5rem', '88': '22rem',
        '128': '32rem', '144': '36rem', '160': '40rem',
        'gap-tight': '0.5rem', 'gap-normal': '0.75rem', 'gap-relaxed': '1rem',
      },
      zIndex: { '60': '60', '70': '70', '80': '80', '90': '90', '100': '100' },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }) {
      addUtilities({
        '.btn-token-primary': {
          backgroundColor: 'var(--button-primary)',
          color: 'var(--button-primary-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: '4px 4px 0px rgb(var(--neo-black))',
          '&:hover': { backgroundColor: 'var(--button-primary-hover)' },
          '&:active': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px rgb(var(--neo-black))' },
        },
        '.btn-token-secondary': {
          backgroundColor: 'var(--button-secondary)',
          color: 'var(--button-secondary-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: '4px 4px 0px rgb(var(--neo-black))',
          '&:hover': { backgroundColor: 'var(--button-secondary-hover)' },
          '&:active': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px rgb(var(--neo-black))' },
        },
        '.btn-token-destructive': {
          backgroundColor: 'var(--button-destructive)',
          color: 'var(--button-destructive-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: '4px 4px 0px rgb(var(--neo-black))',
          '&:hover': { backgroundColor: 'var(--button-destructive-hover)' },
          '&:active': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px rgb(var(--neo-black))' },
        },
        '.btn-token-success': {
          backgroundColor: 'var(--button-success)',
          color: 'var(--button-success-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: '4px 4px 0px rgb(var(--neo-black))',
          '&:hover': { backgroundColor: 'var(--button-success-hover)' },
          '&:active': { transform: 'translate(2px, 2px)', boxShadow: '2px 2px 0px rgb(var(--neo-black))' },
        },
        '.badge-token-info': { backgroundColor: 'var(--badge-info)', color: 'var(--badge-info-text)', border: '2px solid rgb(var(--neo-black))', padding: '0.25rem 0.75rem', borderRadius: '4px' },
        '.badge-token-warning': { backgroundColor: 'var(--badge-warning)', color: 'var(--badge-warning-text)', border: '2px solid rgb(var(--neo-black))', padding: '0.25rem 0.75rem', borderRadius: '4px' },
        '.badge-token-error': { backgroundColor: 'var(--badge-error)', color: 'var(--badge-error-text)', border: '2px solid rgb(var(--neo-black))', padding: '0.25rem 0.75rem', borderRadius: '4px' },
        '.badge-token-success': { backgroundColor: 'var(--badge-success)', color: 'var(--badge-success-text)', border: '2px solid rgb(var(--neo-black))', padding: '0.25rem 0.75rem', borderRadius: '4px' },
      });
    },
  ],
}
```

---

## CSS Variables (globals.css)
**Path:** `app/globals.css` (~1500 lines)

### Color Palette
```css
:root {
  /* LIME Family (Primary) */
  --neo-lime: #BFFF00;
  --neo-lime-light: #D9FF66;
  --neo-lime-muted: #A6D900;
  --neo-lime-dark: #8FB300;

  /* PINK Family (Multiplayer) */
  --neo-pink: #FF1493;
  --neo-pink-light: #FF6BB8;
  --neo-pink-muted: #D9428F;
  --neo-pink-dark: #B30066;

  /* CYAN Family (Single Player) */
  --neo-cyan: #00FFFF;
  --neo-cyan-light: #66FFFF;
  --neo-cyan-muted: #4DD9D9;
  --neo-cyan-dark: #00B3B3;

  /* PURPLE Family (Brain Training) */
  --neo-purple: #8B5CF6;
  --neo-purple-light: #A78BFA;
  --neo-purple-muted: #7C4FCC;
  --neo-purple-dark: #5B21B6;

  /* Error */
  --neo-red: #FF3366;

  /* Structural */
  --neo-navy: #1a1a2e;
  --neo-navy-light: #16213e;
  --neo-cream: #FFFEF0;
  --neo-black: 0 0 0;
  --neo-white: 255 255 255;
  --neo-gray: #2d2d44;

  /* DEPRECATED */
  --neo-yellow: #FFE135;
  --neo-yellow-hover: #FFD000;
  --neo-orange: #FF6B35;
  --neo-orange-hover: #FF5722;
}
```

### Hard Shadows (NO blur)
```css
:root {
  --shadow-sm: 2px 2px 0px rgb(var(--neo-black));
  --shadow-md: 4px 4px 0px rgb(var(--neo-black));
  --shadow-lg: 6px 6px 0px rgb(var(--neo-black));
  --shadow-xl: 8px 8px 0px rgb(var(--neo-black));
  --shadow-pressed: 2px 2px 0px rgb(var(--neo-black));
}

/* RTL-aware shadows auto-flip */
[dir="rtl"] .shadow-hard { box-shadow: -4px 4px 0px rgb(var(--neo-black)); }
[dir="rtl"] .shadow-hard-lg { box-shadow: -6px 6px 0px rgb(var(--neo-black)); }
```

### Border Widths
```css
:root {
  --border-neo: 3px;
  --border-neo-thick: 4px;
}
```

### Layout Variables
```css
:root {
  --mobile-tab-bar-height: 5rem;
  --mobile-bottom-safe: calc(var(--mobile-tab-bar-height) + env(safe-area-inset-bottom, 0px));
  --header-height-mobile: 60px;
  --header-height-tablet: 70px;
  --header-height-desktop: 80px;
  --footer-height: 60px;
  --bottom-nav-height: 64px;
}
```

### Timing Functions
```css
:root {
  --ease-snap: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-slam: cubic-bezier(0.55, 1.75, 0.6, 1);
  --duration-snap: 100ms;
  --duration-quick: 150ms;
}
```

### Halftone & Grid Patterns
```css
:root {
  --halftone-pattern: url("data:image/svg+xml,..."); /* White dots, 0.015 opacity */
  --retro-grid-pattern: linear-gradient(...); /* White lines, 0.025 opacity */
}

body {
  background-color: var(--neo-navy);
  background-image: var(--halftone-pattern), var(--retro-grid-pattern);
  background-size: 20px 20px, 60px 60px;
}
```

### Semantic Color Mappings
```css
:root {
  --background: var(--neo-navy);
  --foreground: rgb(var(--neo-white));
  --card: var(--neo-gray);
  --primary: var(--neo-yellow);
  --secondary: var(--neo-pink);
  --muted: var(--neo-navy-light);
  --accent: var(--neo-pink);
  --destructive: var(--neo-red);
  --border: rgb(var(--neo-black));
  --ring: var(--neo-cyan);
  --radius: 4px;
}
```

### Component Tokens
```css
:root {
  --button-primary: var(--neo-yellow);
  --button-primary-hover: var(--neo-yellow-hover);
  --button-primary-text: rgb(var(--neo-black));
  --button-secondary: var(--neo-pink);
  --button-destructive: var(--neo-red);
  --button-success: var(--neo-lime);

  --badge-info: var(--neo-cyan);
  --badge-warning: var(--neo-yellow);
  --badge-error: var(--neo-red);
  --badge-success: var(--neo-lime);

  --status-active: var(--neo-lime);
  --status-inactive: var(--neo-gray);
  --status-error: var(--neo-red);
  --status-pending: var(--neo-yellow);
}
```

### Gradient Presets
```css
:root {
  /* Rank gradients */
  --gradient-rank-first-from: var(--neo-yellow);
  --gradient-rank-first-via: #FFD000;
  --gradient-rank-first-to: var(--neo-yellow);

  --gradient-rank-second-from: #cbd5e1;
  --gradient-rank-third-from: #f59e0b;

  /* Stat gradients */
  --gradient-stat-positive-from: var(--neo-lime);
  --gradient-stat-negative-from: var(--neo-red);
  --gradient-stat-neutral-from: #94a3b8;

  /* Background gradients */
  --gradient-bg-navy-from: var(--neo-navy);
  --gradient-bg-accent-from: var(--neo-pink);
  --gradient-bg-accent-to: var(--neo-cyan);
}
```

### Brand Colors
```css
:root {
  --brand-google: #4285F4;
  --brand-discord: #5865F2;
  --brand-apple: #000000;
  --brand-whatsapp: #25D366;
  --brand-facebook: #1877F2;
  --brand-twitter: #1DA1F2;
  --brand-linkedin: #0A66C2;
}
```

### Key Utility Classes
```css
/* Neo-Brutalist Button Base */
.btn-neo {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;
  border: var(--border-neo) solid rgb(var(--neo-black));
  box-shadow: var(--shadow-md);
  transition: transform var(--duration-snap) var(--ease-snap), box-shadow var(--duration-snap) var(--ease-snap);
}
.btn-neo:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0px rgb(var(--neo-black)); }
.btn-neo:active { transform: translate(2px, 2px); box-shadow: var(--shadow-pressed); }

/* Neo-Brutalist Card */
.card-neo { background: var(--neo-cream); border: var(--border-neo-thick) solid rgb(var(--neo-black)); box-shadow: var(--shadow-lg); border-radius: var(--radius-lg); }

/* Neo-Brutalist Typography */
.neo-title { font-weight: 900; text-transform: uppercase; -webkit-text-stroke: 2px rgb(var(--neo-black)); text-shadow: 4px 4px 0px rgb(var(--neo-black)); }

/* Container Query Utilities */
.cq-container { container-type: inline-size; }
.cq-p-responsive { padding: clamp(0.75rem, 4cqw, 2rem); }
.cq-gap-responsive { gap: clamp(0.5rem, 2.5cqw, 1.5rem); }
.cq-text-responsive { font-size: clamp(0.875rem, 4cqw, 1.25rem); }

/* Button Max-Width Utilities */
.max-w-btn { max-width: 320px; margin-inline: auto; }
.max-w-btn-lg { max-width: 400px; margin-inline: auto; }

/* Performance Utilities */
.content-visibility-auto { content-visibility: auto; contain-intrinsic-size: auto 500px; }
.gpu-accelerated { transform: translateZ(0); backface-visibility: hidden; will-change: transform; }

/* Texture Overlays */
.texture-halftone::before { content: ''; position: absolute; inset: 0; background-image: var(--halftone-pattern); pointer-events: none; z-index: 1; }

/* Component Classes (@layer components) */
.neo-card { @apply bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg; }
.neo-card-dark { @apply bg-neo-gray border-4 border-neo-black rounded-neo-lg shadow-hard-lg text-neo-white; }
.btn-neo-primary { @apply bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo shadow-hard font-bold uppercase; }
.btn-neo-secondary { @apply bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo shadow-hard font-bold uppercase; }
.badge-neo { @apply px-3 py-1 text-sm font-black uppercase tracking-wide border-3 border-neo-black rounded-md shadow-hard-sm; }
.input-neo { @apply w-full px-4 py-3 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm; }
```

### Game Board Frame
```css
.game-board-frame {
  background: var(--neo-cream);
  border: 4px solid rgb(var(--neo-black));
  box-shadow: 6px 6px 0px rgb(var(--neo-black));
  border-radius: var(--radius-lg);
  --board-size: min(80vmin, calc(100vw - 32px), calc(100dvh - 220px));
  width: var(--board-size);
  height: var(--board-size);
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}

/* Desktop: grid fills space between sidebars */
@media (min-width: 769px) {
  .game-board-frame {
    --board-size: min(45vmin, calc(100vw - 550px), calc(100dvh - 260px), 500px);
  }
}
```
