import React from 'react';
import { motion } from 'framer-motion';

/**
 * GameHeader - A reusable Modern Neon styled header component for the Boggle game
 *
 * @param {Object} props
 * @param {boolean} props.darkMode - Whether to use dark mode styling (default: true)
 * @param {React.ReactNode} props.rightContent - Optional content for the right side (e.g., settings, profile)
 * @param {function} props.onLogoClick - Optional callback when logo is clicked
 * @param {string} props.className - Additional CSS classes
 */
const GameHeader = ({
  darkMode = true,
  rightContent = null,
  onLogoClick = null,
  className = ''
}) => {
  // Neon Dice Icon SVG
  const DiceIcon = () => (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-all duration-300"
    >
      {/* Dice body */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        className={darkMode
          ? "stroke-cyan-400 fill-slate-800/50"
          : "stroke-cyan-600 fill-gray-100/50"
        }
        strokeWidth="1.5"
      />
      {/* Dice dots */}
      <circle
        cx="8"
        cy="8"
        r="1.5"
        className={darkMode ? "fill-cyan-400" : "fill-cyan-600"}
      />
      <circle
        cx="16"
        cy="8"
        r="1.5"
        className={darkMode ? "fill-purple-400" : "fill-purple-600"}
      />
      <circle
        cx="8"
        cy="16"
        r="1.5"
        className={darkMode ? "fill-purple-400" : "fill-purple-600"}
      />
      <circle
        cx="16"
        cy="16"
        r="1.5"
        className={darkMode ? "fill-cyan-400" : "fill-cyan-600"}
      />
      <circle
        cx="12"
        cy="12"
        r="1.5"
        className={darkMode ? "fill-teal-400" : "fill-teal-600"}
      />
    </svg>
  );

  // Theme-based styles
  const containerStyles = darkMode
    ? "bg-slate-800/90 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
    : "bg-gray-50/90 border-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.1)]";

  const textStyles = darkMode
    ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400"
    : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-500 to-purple-600";

  const glowStyles = darkMode
    ? "drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
    : "drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-full max-w-6xl mx-auto mb-6 ${className}`}
    >
      <div
        className={`
          flex items-center justify-between
          px-4 sm:px-6 py-3 sm:py-4
          rounded-xl sm:rounded-2xl
          border backdrop-blur-md
          transition-all duration-300
          ${containerStyles}
        `}
      >
        {/* Left side - Logo and Title */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer"
          onClick={onLogoClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Neon Dice Icon */}
          <motion.div
            className={`${glowStyles}`}
            whileHover={{
              filter: darkMode
                ? "drop-shadow(0 0 15px rgba(6,182,212,0.7))"
                : "drop-shadow(0 0 12px rgba(6,182,212,0.5))"
            }}
          >
            <DiceIcon />
          </motion.div>

          {/* Title */}
          <h1
            className={`
              text-2xl sm:text-3xl font-bold tracking-wider
              ${textStyles}
              ${glowStyles}
            `}
            style={{ fontFamily: "'Rubik', 'Inter', sans-serif" }}
          >
            BOGGLE
          </h1>
        </motion.div>

        {/* Right side - Optional actions container */}
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}

        {/* Empty placeholder for future actions if no rightContent */}
        {!rightContent && (
          <div className="w-8 h-8" />
        )}
      </div>
    </motion.header>
  );
};

// CSS variables for theme customization (can be used in global CSS)
export const neonThemeVars = {
  // Colors
  colors: {
    dark: {
      background: '#0f172a', // slate-900
      surface: 'rgba(30, 41, 59, 0.9)', // slate-800/90
      primary: '#22d3ee', // cyan-400
      secondary: '#a78bfa', // purple-400
      tertiary: '#2dd4bf', // teal-400
      text: '#e2e8f0', // slate-200
      textMuted: '#94a3b8', // slate-400
      border: 'rgba(6, 182, 212, 0.3)', // cyan-500/30
    },
    light: {
      background: '#f8fafc', // slate-50
      surface: 'rgba(249, 250, 251, 0.9)', // gray-50/90
      primary: '#0891b2', // cyan-600
      secondary: '#9333ea', // purple-600
      tertiary: '#0d9488', // teal-600
      text: '#1e293b', // slate-800
      textMuted: '#64748b', // slate-500
      border: 'rgba(6, 182, 212, 0.4)', // cyan-400/40
    },
  },
  // Glow effects
  glow: {
    dark: {
      subtle: '0 0 10px rgba(6, 182, 212, 0.3)',
      medium: '0 0 20px rgba(6, 182, 212, 0.5)',
      strong: '0 0 30px rgba(6, 182, 212, 0.7)',
    },
    light: {
      subtle: '0 0 8px rgba(6, 182, 212, 0.2)',
      medium: '0 0 15px rgba(6, 182, 212, 0.3)',
      strong: '0 0 25px rgba(6, 182, 212, 0.5)',
    },
  },
  // Spacing
  spacing: {
    headerPadding: '1rem 1.5rem',
    borderRadius: '1rem', // 16px
    gap: '0.75rem',
  },
};

export default GameHeader;
