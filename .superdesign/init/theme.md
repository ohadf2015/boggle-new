# Blast Mode Theme

## Tailwind Configuration

Full Tailwind config from `fe-next/tailwind.config.js`:

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
      screens: {
        "2xl": "2400px",
      },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // CrazyGames platform-specific breakpoints
      'cg-mobile': '800px',
      'cg-min': '821px',
      'cg-tablet': '1080px',
      // TV/Large display breakpoints
      'tv': '1920px',
      'tv-4k': '3840px',
      // Height-based breakpoints
      'tall': { 'raw': '(min-height: 800px)' },
      'short': { 'raw': '(max-height: 600px)' },
      'desktop-tall': { 'raw': '(min-width: 1024px) and (min-height: 700px)' },
    },
    extend: {
      colors: {
        // Neo-Brutalist Color Palette - 4 Primary Colors with Tonal Variations
        neo: {
          // LIME Family (Primary)
          lime: "var(--neo-lime)",
          "lime-light": "var(--neo-lime-light)",
          "lime-muted": "var(--neo-lime-muted)",
          "lime-dark": "var(--neo-lime-dark)",
          // PINK Family (Multiplayer)
          pink: "var(--neo-pink)",
          "pink-light": "var(--neo-pink-light)",
          "pink-muted": "var(--neo-pink-muted)",
          "pink-dark": "var(--neo-pink-dark)",
          // CYAN Family (Single Player)
          cyan: "var(--neo-cyan)",
          "cyan-light": "var(--neo-cyan-light)",
          "cyan-muted": "var(--neo-cyan-muted)",
          "cyan-dark": "var(--neo-cyan-dark)",
          // PURPLE Family (Brain Training)
          purple: "var(--neo-purple)",
          "purple-light": "var(--neo-purple-light)",
          "purple-muted": "var(--neo-purple-muted)",
          "purple-dark": "var(--neo-purple-dark)",
          // Error color
          red: "var(--neo-red)",
          // Structural colors
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
          bronze: "#CD7F32",
          "bronze-border": "#8B4513",
          "bronze-glow": "rgba(205, 127, 50, 0.5)",
          silver: "#C0C0C0",
          "silver-border": "#808080",
          "silver-glow": "rgba(192, 192, 192, 0.5)",
          gold: "#FFD700",
          "gold-border": "#B8860B",
          "gold-glow": "rgba(255, 215, 0, 0.5)",
          platinum: "#E5E4E2",
          "platinum-border": "#9370DB",
          "platinum-glow": "rgba(229, 228, 226, 0.5)",
          diamond: "#B9F2FF",
          "diamond-border": "#00CED1",
          "diamond-glow": "rgba(185, 242, 255, 0.5)",
        },
        overlay: {
          light: "rgba(0, 0, 0, 0.1)",
          DEFAULT: "rgba(0, 0, 0, 0.5)",
          dark: "rgba(0, 0, 0, 0.8)",
        },
        glow: {
          white: "rgba(255, 255, 255, 0.5)",
          "white-strong": "rgba(255, 255, 255, 0.9)",
          cyan: "rgba(0, 255, 255, 0.5)",
          pink: "rgba(255, 20, 147, 0.5)",
        },
        bot: {
          purple: "#9333ea",
          "purple-light": "#a855f7",
          "purple-dark": "#7e22ce",
          indigo: "#6366f1",
          "indigo-dark": "#4f46e5",
          border: "#581c87",
        },
        avatar: {
          1: "#FF6B6B", 2: "#4ECDC4", 3: "#45B7D1", 4: "#FFA07A", 5: "#98D8C8",
          6: "#F7DC6F", 7: "#BB8FCE", 8: "#85C1E2", 9: "#F8B739", 10: "#52B788",
          11: "#FF8FAB", 12: "#6BCF7F", 13: "#FFB347", 14: "#9D84B7", 15: "#FF6F61",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
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
        'none': '0px',
        'neo-sm': '2px',
        'neo': '4px',
        'neo-md': '4px',
        'neo-lg': '8px',
        'neo-xl': '12px',
        'neo-pill': '9999px',
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
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
        "gradient-x": { "0%, 100%": { "background-position": "0% 50%" }, "50%": { "background-position": "100% 50%" } },
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
        "screen-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-3px)" },
          "40%": { transform: "translateX(3px)" },
          "60%": { transform: "translateX(-2px)" },
          "80%": { transform: "translateX(2px)" },
        },
        "burst": { "0%": { transform: "scale(0)", opacity: "1" }, "50%": { transform: "scale(1.2)", opacity: "0.8" }, "100%": { transform: "scale(1.5)", opacity: "0" } },
        "coin-fall": { "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" }, "100%": { transform: "translateY(-60px) rotate(180deg)", opacity: "0" } },
        "tier-flash": { "0%": { transform: "scale(0.8)", opacity: "0" }, "50%": { transform: "scale(1.3)", opacity: "1" }, "100%": { transform: "scale(1)", opacity: "0" } },
        "shake-rotate": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "20%": { transform: "translateX(-8px) rotate(-2deg)" },
          "40%": { transform: "translateX(8px) rotate(2deg)" },
          "60%": { transform: "translateX(-5px) rotate(-1deg)" },
          "80%": { transform: "translateX(5px) rotate(1deg)" },
        },
        "letter-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "30%": { transform: "translateY(-15px) rotate(-5deg)" },
          "50%": { transform: "translateY(-15px) rotate(5deg)" },
          "70%": { transform: "translateY(0) rotate(-2deg)" },
        },
        "drift": {
          "0%, 100%": { transform: "translateX(0) translateY(0)" },
          "25%": { transform: "translateX(5px) translateY(-3px)" },
          "50%": { transform: "translateX(0) translateY(-5px)" },
          "75%": { transform: "translateX(-5px) translateY(-3px)" },
        },
        "twinkle": { "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" }, "50%": { opacity: "1", transform: "scale(1.2)" } },
        "neo-wobble": { "0%, 100%": { transform: "rotate(-2deg)" }, "50%": { transform: "rotate(2deg)" } },
        "neo-pop": {
          "0%": { transform: "scale(0.8) rotate(-5deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "neo-slide-in": {
          "0%": { transform: "translateY(-20px) rotate(-3deg)", opacity: "0" },
          "60%": { transform: "translateY(5px) rotate(1deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
        },
        "neo-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px) rotate(-1deg)" },
          "75%": { transform: "translateX(4px) rotate(1deg)" },
        },
        "pulse-subtle": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "6px 6px 0px rgb(var(--neo-black))" },
          "50%": { transform: "scale(1.02)", boxShadow: "8px 8px 0px rgb(var(--neo-black))" },
        },
        "keyboard-focus": {
          "0%, 100%": { boxShadow: "0 0 0 4px rgb(var(--neo-cyan)), 0 0 16px rgba(0, 255, 255, 0.5)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 0 4px rgb(var(--neo-cyan)), 0 0 24px rgba(0, 255, 255, 0.7)", transform: "scale(1.02)" },
        },
        "hint-glow": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(139, 92, 246, 0.4), 0 0 12px rgba(139, 92, 246, 0.2), 4px 4px 0 #000" },
          "50%": { boxShadow: "0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.25), 4px 4px 0 #000" },
        },
        "hint-blink": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "25%": { opacity: "0.4", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" },
          "75%": { opacity: "0.5", transform: "scale(0.99)" },
        },
        "hint-fadeout": { "0%": { opacity: "1", transform: "scale(1)" }, "100%": { opacity: "0", transform: "scale(0.95)" } },
        "fade-in-fast": { "0%": { opacity: "0.6" }, "100%": { opacity: "1" } },
        "fade-in-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-xy": "gradient-xy 3s ease infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "neo-press": "neo-press 0.1s ease-out forwards",
        "neo-wobble": "neo-wobble 0.3s ease-in-out",
        "neo-pop": "neo-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-slide-in": "neo-slide-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-shake": "neo-shake 0.4s ease-in-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "hint-glow": "hint-glow 2.5s ease-in-out infinite",
        "hint-blink": "hint-blink 1.5s ease-in-out 2",
        "hint-fadeout": "hint-fadeout 1s ease-out forwards",
        "keyboard-focus": "keyboard-focus 1.5s ease-in-out infinite",
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
        "tier-flash": "tier-flash 0.4s ease-out forwards",
        "shake-rotate": "shake-rotate 0.5s ease-in-out",
        "letter-bounce": "letter-bounce 0.6s ease-in-out infinite",
        "drift": "drift 6s ease-in-out infinite",
        "twinkle": "twinkle 2s ease-in-out infinite",
      },
      rotate: { '1': '1deg', '2': '2deg', '-1': '-1deg', '-2': '-2deg' },
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
    // Custom plugin for semantic design token utilities (btn-token-*, badge-token-*)
    function({ addUtilities }) { /* ... semantic utility plugin ... */ },
  ],
}
```

---

## Blast-Specific CSS (from globals.css)

These are the blast tile animation keyframes and utility classes defined in `fe-next/app/globals.css`:

```css
/* Blast mode: grid must respect parent container, not viewport */
.blast-game .game-board-frame {
  --board-size: 100%;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  padding: 6px;
}

/* Blast special tile animations */
.blast-tile-gold {
  animation: blast-shimmer 2.5s ease-in-out infinite;
  background-size: 200% 200% !important;
}

.blast-tile-bomb {
  animation: blast-pulse 1.8s ease-in-out infinite;
}

.blast-tile-rainbow {
  animation: blast-rainbow 4s linear infinite;
  background-size: 300% 300% !important;
}

@keyframes blast-shimmer {
  0% { background-position: 0% 0%; opacity: 0.85; }
  50% { background-position: 100% 100%; opacity: 1; }
  100% { background-position: 0% 0%; opacity: 0.85; }
}

@keyframes blast-pulse {
  0%, 100% {
    box-shadow: inset 0 0 14px rgba(255,30,0,0.25), 0 0 8px rgba(255,50,20,0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: inset 0 0 20px rgba(255,30,0,0.4), 0 0 14px rgba(255,50,20,0.3);
    transform: scale(1.03);
  }
}

@keyframes blast-rainbow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.blast-tile-ice {
  animation: blast-ice-shimmer 3s ease-in-out infinite;
}

.blast-tile-wildcard {
  animation: blast-wildcard-pulse 2.5s ease-in-out infinite;
}

.blast-tile-lightning {
  animation: blast-lightning-flicker 1.5s steps(3) infinite;
}

.blast-tile-magnet {
  animation: blast-magnet-rotate 4s linear infinite;
  background-size: 200% 200% !important;
}

@keyframes blast-ice-shimmer {
  0%, 100% { filter: brightness(1); box-shadow: inset 0 0 16px rgba(150,220,255,0.3), 0 0 8px rgba(180,230,255,0.25); }
  50% { filter: brightness(1.15); box-shadow: inset 0 0 22px rgba(150,220,255,0.5), 0 0 14px rgba(180,230,255,0.4); }
}

@keyframes blast-wildcard-pulse {
  0%, 100% { opacity: 0.85; filter: hue-rotate(0deg); }
  50% { opacity: 1; filter: hue-rotate(30deg); }
}

@keyframes blast-lightning-flicker {
  0% { filter: brightness(1); }
  33% { filter: brightness(1.4); }
  66% { filter: brightness(0.9); }
  100% { filter: brightness(1.2); }
}

@keyframes blast-magnet-rotate {
  0% { background-position: 0% 0%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 100%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 0%; }
}

.blast-tile-prism {
  animation: blast-prism-spectrum 3s linear infinite;
}

.blast-tile-gem {
  animation: blast-gem-sparkle 2.5s ease-in-out infinite;
}

.blast-tile-frozen {
  animation: blast-frozen-glow 4s ease-in-out infinite;
}

@keyframes blast-prism-spectrum {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

@keyframes blast-gem-sparkle {
  0%, 100% { box-shadow: inset 0 0 14px rgba(80,200,120,0.3), 0 0 8px rgba(0,200,100,0.2); }
  50% { box-shadow: inset 0 0 20px rgba(80,200,120,0.5), 0 0 16px rgba(0,255,120,0.35); }
}

@keyframes blast-frozen-glow {
  0%, 100% { box-shadow: inset 0 0 18px rgba(180,220,255,0.3), 0 0 10px rgba(200,230,255,0.2); }
  50% { box-shadow: inset 0 0 24px rgba(180,220,255,0.45), 0 0 16px rgba(200,230,255,0.35); }
}
```

### Tile Animation Summary

| Tile Type | Animation | Duration | Easing | Visual Effect |
|-----------|-----------|----------|--------|---------------|
| Gold | `blast-shimmer` | 2.5s | ease-in-out | Background position shift + opacity pulse |
| Bomb | `blast-pulse` | 1.8s | ease-in-out | Inner glow intensity + scale(1.03) |
| Rainbow | `blast-rainbow` | 4s | linear | Background position cycling (300% size) |
| Ice | `blast-ice-shimmer` | 3s | ease-in-out | Brightness + glow intensity |
| Wildcard | `blast-wildcard-pulse` | 2.5s | ease-in-out | Opacity + hue-rotate(30deg) |
| Lightning | `blast-lightning-flicker` | 1.5s | steps(3) | Stepped brightness flicker |
| Magnet | `blast-magnet-rotate` | 4s | linear | Background position rotation |
| Prism | `blast-prism-spectrum` | 3s | linear | Full 360deg hue-rotate |
| Gem | `blast-gem-sparkle` | 2.5s | ease-in-out | Glow intensity pulse |
| Frozen | `blast-frozen-glow` | 4s | ease-in-out | Cold glow intensity pulse |
