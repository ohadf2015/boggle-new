import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

/**
 * GameHeader - A reusable Modern Neon styled header component for the LexiClash game
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
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = darkMode ?? (theme === 'dark');



  // NEO-BRUTALIST: No theme switching needed - dark only
  return (
    <motion.header
      initial={{ y: -20, opacity: 0, rotate: -2 }}
      animate={{ y: 0, opacity: 1, rotate: -1 }}
      transition={{ duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] }}
      className={`w-full max-w-6xl mx-auto mb-3 sm:mb-4 ${className}`}
    >
      {/* NEO-BRUTALIST Header Container */}
      <div
        className="
          flex items-center justify-between
          px-4 sm:px-6 py-3 sm:py-4
          bg-neo-cyan
          border-4 border-neo-black
          shadow-hard-lg
          rounded-neo-lg
          transition-all duration-100
        "
      >
        {/* Left side - NEO-BRUTALIST Title */}
        <motion.div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
          onClick={onLogoClick}
          whileHover={{ x: -2, y: -2 }}
          whileTap={{ x: 2, y: 2 }}
        >
          {/* NEO-BRUTALIST Title with text-stroke */}
          <h1
            className="text-2xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-1"
            style={{ fontFamily: "'Fredoka', 'Rubik', sans-serif" }}
          >
            {/* LEXI - with text shadow */}
            <span
              className="text-neo-black"
              style={{
                textShadow: '3px 3px 0px var(--neo-pink)',
              }}
            >
              {t('logo.lexi')}
            </span>
            {/* Lightning bolt */}
            <motion.span
              animate={{
                rotate: [0, -15, 15, -15, 15, 0],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 0.4, delay: 1, repeat: 3, repeatDelay: 5 }}
              className="text-xl sm:text-3xl"
            >
              ⚡
            </motion.span>
            {/* CLASH - italic skewed */}
            <span
              className="text-neo-pink italic"
              style={{
                transform: 'skewX(-8deg)',
                textShadow: '3px 3px 0px var(--neo-black)',
              }}
            >
              {t('logo.clash')}
            </span>
          </h1>
        </motion.div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
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
