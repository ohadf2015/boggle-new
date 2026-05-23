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
      'cg-mobile': '800px',    // CrazyGames mobile landscape minimum
      'cg-min': '821px',       // CrazyGames desktop minimum (non-fullscreen)
      'cg-tablet': '1080px',   // CrazyGames tablet landscape
      // TV/Large display breakpoints
      'tv': '1920px',          // Standard 1080p TV/monitor
      'tv-4k': '3840px',       // 4K displays
      // Height-based breakpoints moved to globals.css @custom-variant for Tailwind v4 compat
    },
    extend: {
      colors: {
        // Neo-Brutalist Color Palette - 4 Primary Colors with Tonal Variations
        // Primary: lime, Secondary: pink, Tertiary: cyan, Quaternary: purple
        neo: {
          // LIME Family (Primary - Replaces Yellow)
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

          // Deep space variants
          abyss: "var(--neo-abyss)",
          "abyss-deep": "var(--neo-abyss-deep)",
          "abyss-mid": "var(--neo-abyss-mid)",
          "abyss-light": "var(--neo-abyss-light)",

          // Navy elevated variants
          "navy-elevated": "var(--neo-navy-elevated)",
          "navy-radial": "var(--neo-navy-radial)",

          // Structural colors
          navy: "var(--neo-navy)",
          "navy-light": "var(--neo-navy-light)",
          cream: "var(--neo-cream)",
          black: "rgb(var(--neo-black) / <alpha-value>)",
          white: "rgb(var(--neo-white) / <alpha-value>)",
          gray: "var(--neo-gray)",

          // DEPRECATED - Keep for backward compatibility during migration
          yellow: "var(--neo-yellow)",
          "yellow-hover": "var(--neo-yellow-hover)",
          orange: "var(--neo-orange)",
          "orange-hover": "var(--neo-orange-hover)",
        },
        // Brand colors for social auth - referencing new CSS variables
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
          telegram: "var(--brand-telegram)",
          "telegram-hover": "var(--brand-telegram-hover)",
          "telegram-dark": "var(--brand-telegram-dark)",
        },
        // Achievement tier colors
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
        // Overlay utilities
        overlay: {
          light: "rgba(0, 0, 0, 0.1)",
          DEFAULT: "rgba(0, 0, 0, 0.5)",
          dark: "rgba(0, 0, 0, 0.8)",
        },
        // Glow utilities
        glow: {
          white: "rgba(255, 255, 255, 0.5)",
          "white-strong": "rgba(255, 255, 255, 0.9)",
          cyan: "rgba(0, 255, 255, 0.5)",
          pink: "rgba(255, 20, 147, 0.5)",
        },
        // Bot-specific colors (purple/indigo theme for AI opponents)
        bot: {
          purple: "#9333ea",        // Purple-600 - Primary bot color
          "purple-light": "#a855f7", // Purple-500 - Light accent
          "purple-dark": "#7e22ce",  // Purple-700 - Dark accent
          indigo: "#6366f1",         // Indigo-500 - Secondary bot color
          "indigo-dark": "#4f46e5",  // Indigo-600 - Dark secondary
          border: "#581c87",         // Purple-900 - Border color
        },
        // Avatar colors
        avatar: {
          1: "#FF6B6B",
          2: "#4ECDC4",
          3: "#45B7D1",
          4: "#FFA07A",
          5: "#98D8C8",
          6: "#F7DC6F",
          7: "#BB8FCE",
          8: "#85C1E2",
          9: "#F8B739",
          10: "#52B788",
          11: "#FF8FAB",
          12: "#6BCF7F",
          13: "#FFB347",
          14: "#9D84B7",
          15: "#FF6F61",
        },
        // Semantic colors using CSS variables
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      // Neo-Brutalist Border Widths
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
        '6': '6px',
      },
      // Hard Shadow Utilities (NO blur - Neo-Brutalist style, cleaned-up: lighter offsets)
      boxShadow: {
        'hard-sm': '1px 1px 0px rgb(var(--neo-black))',
        'hard': '2px 2px 0px rgb(var(--neo-black))',
        'hard-md': '2px 2px 0px rgb(var(--neo-black))',
        'hard-lg': '3px 3px 0px rgb(var(--neo-black))',
        'hard-xl': '5px 5px 0px rgb(var(--neo-black))',
        'hard-2xl': '7px 7px 0px rgb(var(--neo-black))',
        'hard-pressed': '1px 1px 0px rgb(var(--neo-black))',
        // Colored hard shadows
        'hard-yellow': '2px 2px 0px var(--neo-yellow)',
        'hard-pink': '2px 2px 0px var(--neo-pink)',
        'hard-cyan': '2px 2px 0px var(--neo-cyan)',
        'hard-lime': '2px 2px 0px var(--neo-lime)',
        'hard-purple': '2px 2px 0px #581c87',
        'hard-purple-lg': '3px 3px 0px #581c87',
        // Remove default shadows
        'none': 'none',
      },
      // Border Radius — cleaned-up: softer corners for modern feel
      borderRadius: {
        'none': '0px',
        'neo-sm': '4px',
        'neo': '8px',
        'neo-md': '8px',
        'neo-lg': '12px',
        'neo-xl': '16px',
        'neo-pill': '9999px',
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      // Gradient Presets - Standard gradient recipes for consistent usage
      backgroundImage: {
        // Rank gradients for 1st/2nd/3rd place displays
        'gradient-rank-first': 'linear-gradient(135deg, var(--gradient-rank-first-from), var(--gradient-rank-first-via), var(--gradient-rank-first-to))',
        'gradient-rank-second': 'linear-gradient(135deg, var(--gradient-rank-second-from), var(--gradient-rank-second-via), var(--gradient-rank-second-to))',
        'gradient-rank-third': 'linear-gradient(135deg, var(--gradient-rank-third-from), var(--gradient-rank-third-via), var(--gradient-rank-third-to))',
        // Performance stat gradients (positive/negative/neutral indicators)
        'gradient-stat-positive': 'linear-gradient(135deg, var(--gradient-stat-positive-from), var(--gradient-stat-positive-to))',
        'gradient-stat-negative': 'linear-gradient(135deg, var(--gradient-stat-negative-from), var(--gradient-stat-negative-to))',
        'gradient-stat-neutral': 'linear-gradient(135deg, var(--gradient-stat-neutral-from), var(--gradient-stat-neutral-to))',
        // Background gradients (navy base with accent overlays)
        'gradient-bg-navy': 'linear-gradient(135deg, var(--gradient-bg-navy-from), var(--gradient-bg-navy-to))',
        'gradient-bg-accent': 'linear-gradient(135deg, var(--gradient-bg-accent-from), var(--gradient-bg-accent-via), var(--gradient-bg-accent-to))',
      },
      // Neo-Brutalist Keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-xy": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        // Neo-Brutalist animations
        "neo-press": {
          "0%": { transform: "translate(0, 0)", boxShadow: "var(--shadow-md)" },
          "100%": { transform: "translate(1px, 1px)", boxShadow: "var(--shadow-pressed)" },
        },
        // Enhanced button press with bounce
        "neo-press-bounce": {
          "0%": { transform: "translate(0, 0) rotate(0deg)", boxShadow: "var(--shadow-md)" },
          "40%": { transform: "translate(2px, 2px) rotate(-0.5deg)", boxShadow: "var(--shadow-pressed)" },
          "60%": { transform: "translate(1px, 1px) rotate(0.25deg)", boxShadow: "2px 2px 0px rgb(var(--neo-black))" },
          "100%": { transform: "translate(0, 0) rotate(0deg)", boxShadow: "var(--shadow-md)" },
        },
        // Floating animation for decorative elements
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // Gentle bobbing with rotation
        "bob": {
          "0%, 100%": { transform: "translateY(0px) rotate(-1deg)" },
          "50%": { transform: "translateY(-5px) rotate(1deg)" },
        },
        // Score pop animation
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        // Shimmer effect for skeletons
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        // Screen shake for emphasis
        "screen-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-3px)" },
          "40%": { transform: "translateX(3px)" },
          "60%": { transform: "translateX(-2px)" },
          "80%": { transform: "translateX(2px)" },
        },
        // Celebration burst
        "burst": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        // Coin cascade for rewards
        "coin-fall": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(-60px) rotate(180deg)", opacity: "0" },
        },
        // Tier flash effect
        "tier-flash": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.3)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        // Enhanced shake with rotation
        "shake-rotate": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "20%": { transform: "translateX(-8px) rotate(-2deg)" },
          "40%": { transform: "translateX(8px) rotate(2deg)" },
          "60%": { transform: "translateX(-5px) rotate(-1deg)" },
          "80%": { transform: "translateX(5px) rotate(1deg)" },
        },
        // Letter bounce for loader
        "letter-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "30%": { transform: "translateY(-15px) rotate(-5deg)" },
          "50%": { transform: "translateY(-15px) rotate(5deg)" },
          "70%": { transform: "translateY(0) rotate(-2deg)" },
        },
        // Parallax drift
        "drift": {
          "0%, 100%": { transform: "translateX(0) translateY(0)" },
          "25%": { transform: "translateX(5px) translateY(-3px)" },
          "50%": { transform: "translateX(0) translateY(-5px)" },
          "75%": { transform: "translateX(-5px) translateY(-3px)" },
        },
        // Sparkle twinkle
        "twinkle": {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        "golden-pulse": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(255,215,0,0.4), 0 0 2px rgba(255,215,0,0.2)" },
          "50%": { boxShadow: "0 0 14px rgba(255,215,0,0.8), 0 0 6px rgba(255,215,0,0.5)" },
        },
        // Simple fade-in for deferred content (prevents pop-in flicker)
        "fadeIn": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Hero entrance animations (CSS-only, no Framer Motion needed)
        "fadeInUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Word Tower reward popup: rise + fade IN, hold, then fade OUT + drift
        // up — so the "+m ×combo" celebration never lingers between words.
        "wt-reward-pop": {
          "0%": { opacity: "0", transform: "translate(-50%, 18px) scale(0.9)" },
          "16%": { opacity: "1", transform: "translate(-50%, 0) scale(1.04)" },
          "26%": { transform: "translate(-50%, 0) scale(1)" },
          "68%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
          "100%": { opacity: "0", transform: "translate(-50%, -14px) scale(0.96)" },
        },
        "fadeInLeft": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fadeInRight": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "neo-wobble": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
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
          "0%":   { transform: "translateX(0) rotate(0deg)" },
          "8%":   { transform: "translateX(-8px) rotate(1.5deg)" },
          "18%":  { transform: "translateX(7px) rotate(-1.2deg)" },
          "30%":  { transform: "translateX(-5px) rotate(0.8deg)" },
          "42%":  { transform: "translateX(4px) rotate(-0.5deg)" },
          "55%":  { transform: "translateX(-2px) rotate(0.3deg)" },
          "70%":  { transform: "translateX(1px) rotate(-0.1deg)" },
          "100%": { transform: "translateX(0) rotate(0deg)" },
        },
        "neo-damage-drip": {
          "0%":   { boxShadow: "inset 0 0 0 0 rgba(239,68,68,0)", borderColor: "currentColor" },
          "15%":  { boxShadow: "inset 0 -4px 8px 0 rgba(239,68,68,0.5)", borderColor: "#ef4444" },
          "40%":  { boxShadow: "inset 0 -2px 4px 0 rgba(239,68,68,0.3)", borderColor: "#ef4444" },
          "100%": { boxShadow: "inset 0 0 0 0 rgba(239,68,68,0)", borderColor: "currentColor" },
        },
        "neo-reject-flash": {
          "0%":   { borderColor: "currentColor", backgroundColor: "transparent" },
          "15%":  { borderColor: "#FF3366", backgroundColor: "rgba(255,51,102,0.15)" },
          "50%":  { borderColor: "#FF3366", backgroundColor: "rgba(255,51,102,0.08)" },
          "100%": { borderColor: "currentColor", backgroundColor: "transparent" },
        },
        // Subtle pulse for CTA buttons
        "pulse-subtle": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "var(--shadow-lg)" },
          "50%": { transform: "scale(1.02)", boxShadow: "var(--shadow-xl)" },
        },
        // Keyboard focus indicator glow
        "keyboard-focus": {
          "0%, 100%": {
            boxShadow: "0 0 0 4px rgb(var(--neo-cyan)), 0 0 16px rgba(0, 255, 255, 0.5)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 0 4px rgb(var(--neo-cyan)), 0 0 24px rgba(0, 255, 255, 0.7)",
            transform: "scale(1.02)",
          },
        },
        // Subtle hint glow animation for revealed word paths (softer purple)
        "hint-glow": {
          "0%, 100%": {
            boxShadow: "0 0 6px rgba(139, 92, 246, 0.4), 0 0 12px rgba(139, 92, 246, 0.2), 4px 4px 0 #000",
          },
          "50%": {
            boxShadow: "0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.25), 4px 4px 0 #000",
          },
        },
        // Blink animation for hint trail (quick flash effect)
        "hint-blink": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "25%": {
            opacity: "0.4",
            transform: "scale(0.98)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "75%": {
            opacity: "0.5",
            transform: "scale(0.99)",
          },
        },
        // Anchor tile pulse for click-select mode
        "anchor-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 0 3px rgb(var(--neo-cyan)), 0 0 8px rgba(0, 255, 255, 0.4)",
          },
          "50%": {
            boxShadow: "0 0 0 5px rgb(var(--neo-cyan)), 0 0 16px rgba(0, 255, 255, 0.6)",
          },
        },
        // Keyboard stagger light-up for typed path
        "keyboard-light-up": {
          "0%": { opacity: "0.3", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Fade out animation for hint trail
        "hint-fadeout": {
          "0%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "100%": {
            opacity: "0",
            transform: "scale(0.95)",
          },
        },
        // Fast fade-in for instant paint optimization
        "fade-in-fast": {
          "0%": { opacity: "0.6" },
          "100%": { opacity: "1" },
        },
        // Fade in with upward motion
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Forge shop FAB — ember glow pulse
        "ember-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.06)" },
        },
        // Forge shop FAB — tiny spark flicker
        "spark": {
          "0%, 100%": { opacity: "0", transform: "scale(0.5)" },
          "30%": { opacity: "1", transform: "scale(1.2)" },
          "60%": { opacity: "0.6", transform: "scale(0.8)" },
        },
        // Game mode card animations
        "mode-glow-breathe": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.75" },
        },
        "mode-icon-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "mode-bomb-wobble": {
          "0%, 100%": { transform: "rotate(0deg) scale(1)" },
          "15%": { transform: "rotate(-8deg) scale(1.05)" },
          "30%": { transform: "rotate(6deg) scale(1.02)" },
          "45%": { transform: "rotate(-4deg) scale(1.05)" },
          "60%": { transform: "rotate(2deg) scale(1.02)" },
          "75%": { transform: "rotate(-1deg) scale(1)" },
        },
        "mode-spark": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        // Quest completion toast animations
        "celebrationPop": {
          "0%": { transform: "scale(0.5) translateY(20px)", opacity: "0" },
          "60%": { transform: "scale(1.05) translateY(-5px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "iconBounce": {
          "0%": { transform: "scale(0) rotate(-15deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(5deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "rewardSlide": {
          "0%": { transform: "translateY(10px) scale(0.8)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        // CompactLeaderboard — cheap CSS replacements for framer-motion repeat:Infinity loops
        "zap-wiggle": {
          "0%, 80%, 100%": { transform: "rotate(0deg)" },
          "85%": { transform: "rotate(15deg)" },
          "92%": { transform: "rotate(-15deg)" },
        },
        "overtake-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,20,147,0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(255,20,147,0.3)" },
        },
        "streak-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-xy": "gradient-xy 3s ease infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        // Neo-Brutalist animations
        "neo-press": "neo-press 0.1s ease-out forwards",
        "neo-wobble": "neo-wobble 0.3s ease-in-out",
        "neo-pop": "neo-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-slide-in": "neo-slide-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "neo-shake": "neo-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "neo-damage-drip": "neo-damage-drip 0.8s ease-out",
        "neo-reject-flash": "neo-reject-flash 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "hint-glow": "hint-glow 2.5s ease-in-out infinite",
        "hint-blink": "hint-blink 1.5s ease-in-out 2",
        "hint-fadeout": "hint-fadeout 1s ease-out forwards",
        "anchor-pulse": "anchor-pulse 1.5s ease-in-out infinite",
        "keyboard-light-up": "keyboard-light-up 0.15s ease-out forwards",
        "keyboard-focus": "keyboard-focus 1.5s ease-in-out infinite",
        // Fast animations for landing page optimization
        "fade-in-fast": "fade-in-fast 0.15s ease-out forwards",
        "fade-in-up": "fade-in-up 0.3s ease-out 0.2s both",
        // Playful UI animations
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
        "golden-pulse": "golden-pulse 1.8s ease-in-out infinite",
        // Game mode card animations
        "mode-glow-breathe": "mode-glow-breathe 2s ease-in-out infinite",
        "mode-icon-bounce": "mode-icon-bounce 2s ease-in-out infinite",
        "mode-bomb-wobble": "mode-bomb-wobble 1.2s ease-in-out infinite",
        "mode-spark": "mode-spark 0.5s ease-out forwards",
        // CompactLeaderboard (CSS replacements for old framer-motion repeat:Infinity loops)
        "zap-wiggle": "zap-wiggle 2.5s ease-in-out infinite",
        "overtake-pulse": "overtake-pulse 1.5s ease-in-out infinite",
        "streak-pulse": "streak-pulse 0.6s ease-in-out infinite",
      },
      // Custom rotation values for tilts
      rotate: {
        '1': '1deg',
        '2': '2deg',
        '-1': '-1deg',
        '-2': '-2deg',
      },
      // Font families - using CSS variables from next/font
      fontFamily: {
        'neo': ['var(--font-fredoka)', 'var(--font-heebo-hebrew)', 'var(--font-rubik)', 'Fredoka', 'Rubik', 'sans-serif'],
        'neo-display': ['var(--font-fredoka)', 'var(--font-heebo-hebrew)', 'var(--font-rubik)', 'Fredoka', 'Rubik', 'sans-serif'],
        'neo-display-he': ['var(--font-heebo-hebrew)', 'var(--font-rubik)', 'Rubik', 'sans-serif'],
        'neo-body': ['var(--font-rubik)', 'var(--font-heebo-hebrew)', 'Rubik', 'sans-serif'],
        'neo-body-he': ['var(--font-heebo-hebrew)', 'var(--font-rubik)', 'Rubik', 'sans-serif'],
        sans: ['var(--font-rubik)', 'var(--font-heebo-hebrew)', 'Rubik', 'sans-serif'],
      },
      // Additional spacing for better component composition
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        // Semantic gap aliases (based on usage analysis: 771 gap-2, 314 gap-3, 121 gap-4)
        'gap-tight': '0.5rem',    // Replaces gap-2 - Compact layouts, tight spacing
        'gap-normal': '0.75rem',  // Replaces gap-3 - Standard spacing
        'gap-relaxed': '1rem',    // Replaces gap-4 - Generous spacing
      },
      // Z-index scale for better layering
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for semantic design token utilities
    function({ addUtilities }) {
      addUtilities({
        // Semantic button utilities with Neo-Brutalist styling
        '.btn-token-primary': {
          backgroundColor: 'var(--button-primary)',
          color: 'var(--button-primary-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: 'var(--shadow-md)',
          '&:hover': {
            backgroundColor: 'var(--button-primary-hover)',
          },
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: 'var(--shadow-pressed)',
          },
        },
        '.btn-token-secondary': {
          backgroundColor: 'var(--button-secondary)',
          color: 'var(--button-secondary-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: 'var(--shadow-md)',
          '&:hover': {
            backgroundColor: 'var(--button-secondary-hover)',
          },
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: 'var(--shadow-pressed)',
          },
        },
        '.btn-token-destructive': {
          backgroundColor: 'var(--button-destructive)',
          color: 'var(--button-destructive-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: 'var(--shadow-md)',
          '&:hover': {
            backgroundColor: 'var(--button-destructive-hover)',
          },
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: 'var(--shadow-pressed)',
          },
        },
        '.btn-token-success': {
          backgroundColor: 'var(--button-success)',
          color: 'var(--button-success-text)',
          border: '3px solid rgb(var(--neo-black))',
          boxShadow: 'var(--shadow-md)',
          '&:hover': {
            backgroundColor: 'var(--button-success-hover)',
          },
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: 'var(--shadow-pressed)',
          },
        },
        // Semantic badge utilities with Neo-Brutalist styling
        // RTL-aware hard shadows (auto-flip in RTL context)
        '[dir="rtl"] .shadow-hard-sm': {
          boxShadow: '-2px 2px 0px rgb(var(--neo-black))',
        },
        '[dir="rtl"] .shadow-hard, [dir="rtl"] .shadow-hard-md': {
          boxShadow: '-4px 4px 0px rgb(var(--neo-black))',
        },
        '[dir="rtl"] .shadow-hard-lg': {
          boxShadow: '-6px 6px 0px rgb(var(--neo-black))',
        },
        '[dir="rtl"] .shadow-hard-xl': {
          boxShadow: '-8px 8px 0px rgb(var(--neo-black))',
        },
        '[dir="rtl"] .shadow-hard-pressed': {
          boxShadow: '-2px 2px 0px rgb(var(--neo-black))',
        },
        // RTL colored shadows
        '[dir="rtl"] .shadow-hard-lime': {
          boxShadow: '-4px 4px 0px var(--neo-lime)',
        },
        '[dir="rtl"] .shadow-hard-pink': {
          boxShadow: '-4px 4px 0px var(--neo-pink)',
        },
        '[dir="rtl"] .shadow-hard-cyan': {
          boxShadow: '-4px 4px 0px var(--neo-cyan)',
        },
        '.badge-token-info': {
          backgroundColor: 'var(--badge-info)',
          color: 'var(--badge-info-text)',
          border: '2px solid rgb(var(--neo-black))',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
        },
        '.badge-token-warning': {
          backgroundColor: 'var(--badge-warning)',
          color: 'var(--badge-warning-text)',
          border: '2px solid rgb(var(--neo-black))',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
        },
        '.badge-token-error': {
          backgroundColor: 'var(--badge-error)',
          color: 'var(--badge-error-text)',
          border: '2px solid rgb(var(--neo-black))',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
        },
        '.badge-token-success': {
          backgroundColor: 'var(--badge-success)',
          color: 'var(--badge-success-text)',
          border: '2px solid rgb(var(--neo-black))',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
        },
      });
    },
  ],
}
