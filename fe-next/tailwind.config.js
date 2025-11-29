/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}',
    './host/**/*.{js,jsx,ts,tsx}',
    './player/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
    './*.{js,jsx,ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Neo-Brutalist Color Palette
        neo: {
          yellow: "var(--neo-yellow)",
          "yellow-hover": "var(--neo-yellow-hover)",
          orange: "var(--neo-orange)",
          "orange-hover": "var(--neo-orange-hover)",
          pink: "var(--neo-pink)",
          "pink-light": "var(--neo-pink-light)",
          purple: "var(--neo-purple)",
          "purple-light": "var(--neo-purple-light)",
          navy: "var(--neo-navy)",
          "navy-light": "var(--neo-navy-light)",
          cyan: "var(--neo-cyan)",
          "cyan-muted": "var(--neo-cyan-muted)",
          lime: "var(--neo-lime)",
          red: "var(--neo-red)",
          cream: "var(--neo-cream)",
          black: "var(--neo-black)",
          white: "var(--neo-white)",
          gray: "var(--neo-gray)",
        },
        // Brand colors for social auth
        brand: {
          google: "#4285F4",
          "google-hover": "#3367D6",
          discord: "#5865F2",
          "discord-hover": "#4752C4",
          apple: "#000000",
          "apple-hover": "#333333",
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
      // Hard Shadow Utilities (NO blur - Neo-Brutalist style)
      boxShadow: {
        'hard-sm': '2px 2px 0px var(--neo-black)',
        'hard': '4px 4px 0px var(--neo-black)',
        'hard-md': '4px 4px 0px var(--neo-black)',
        'hard-lg': '6px 6px 0px var(--neo-black)',
        'hard-xl': '8px 8px 0px var(--neo-black)',
        'hard-2xl': '10px 10px 0px var(--neo-black)',
        'hard-pressed': '2px 2px 0px var(--neo-black)',
        // Colored hard shadows
        'hard-yellow': '4px 4px 0px var(--neo-yellow)',
        'hard-pink': '4px 4px 0px var(--neo-pink)',
        'hard-cyan': '4px 4px 0px var(--neo-cyan)',
        // Remove default shadows
        'none': 'none',
      },
      // Border Radius - Chunky Neo-Brutalist options
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
          "0%": { transform: "translate(0, 0)", boxShadow: "4px 4px 0px var(--neo-black)" },
          "100%": { transform: "translate(2px, 2px)", boxShadow: "2px 2px 0px var(--neo-black)" },
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
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px) rotate(-1deg)" },
          "75%": { transform: "translateX(4px) rotate(1deg)" },
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
        "neo-shake": "neo-shake 0.4s ease-in-out",
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
        'neo': ['var(--font-fredoka)', 'var(--font-rubik)', 'Fredoka', 'Rubik', 'sans-serif'],
        'neo-display': ['var(--font-fredoka)', 'Fredoka', 'sans-serif'],
        'neo-body': ['var(--font-rubik)', 'Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
