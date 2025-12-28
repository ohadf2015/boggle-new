'use client';

/**
 * ThemeIndicator Component
 *
 * Displays the current game theme (holiday, special event, or day-of-week)
 * with modern, theme-specific colors that match the event's character.
 * Uses gradients, glow effects, and neo-brutalist styling.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import type { BoardTheme } from '@/shared/types/socket';

interface ThemeIndicatorProps {
  theme: BoardTheme | null;
  className?: string;
}

// Theme-specific color configurations
// Each theme gets colors that match its character/mood
interface ThemeColors {
  gradient: string;      // CSS gradient for background
  border: string;        // Border color
  text: string;          // Text color
  glow: string;          // Glow/shadow color
  accent: string;        // Accent for decorative elements
}

const THEME_COLORS: Record<string, ThemeColors> = {
  // === HOLIDAY THEMES ===
  'theme.christmas': {
    gradient: 'linear-gradient(135deg, #dc2626 0%, #16a34a 50%, #dc2626 100%)',
    border: '#14532d',
    text: '#fef2f2',
    glow: 'rgba(22, 163, 74, 0.5)',
    accent: '#fcd34d',
  },
  'theme.halloween': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #7c3aed 100%)',
    border: '#1e1b4b',
    text: '#fef3c7',
    glow: 'rgba(249, 115, 22, 0.5)',
    accent: '#a855f7',
  },
  'theme.valentines': {
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #be185d 100%)',
    border: '#831843',
    text: '#fdf2f8',
    glow: 'rgba(236, 72, 153, 0.5)',
    accent: '#fda4af',
  },
  'theme.easter': {
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #f0abfc 50%, #86efac 100%)',
    border: '#6b21a8',
    text: '#1e1b4b',
    glow: 'rgba(167, 139, 250, 0.4)',
    accent: '#fef08a',
  },
  'theme.stPatricks': {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    border: '#14532d',
    text: '#f0fdf4',
    glow: 'rgba(34, 197, 94, 0.5)',
    accent: '#fcd34d',
  },
  'theme.independence': {
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ffffff 50%, #2563eb 100%)',
    border: '#1e3a8a',
    text: '#1e3a8a',
    glow: 'rgba(37, 99, 235, 0.4)',
    accent: '#fcd34d',
  },
  'theme.thanksgiving': {
    gradient: 'linear-gradient(135deg, #ea580c 0%, #ca8a04 50%, #a16207 100%)',
    border: '#78350f',
    text: '#fef3c7',
    glow: 'rgba(234, 88, 12, 0.4)',
    accent: '#fcd34d',
  },
  'theme.newYear': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #a855f7 50%, #2563eb 100%)',
    border: '#581c87',
    text: '#fef9c3',
    glow: 'rgba(252, 211, 77, 0.5)',
    accent: '#c4b5fd',
  },
  'theme.hanukkah': {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #fcd34d 100%)',
    border: '#1e3a8a',
    text: '#eff6ff',
    glow: 'rgba(59, 130, 246, 0.5)',
    accent: '#fcd34d',
  },
  // Hebrew holidays
  'theme.roshHashana': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #dc2626 50%, #ea580c 100%)',
    border: '#78350f',
    text: '#fef3c7',
    glow: 'rgba(252, 211, 77, 0.5)',
    accent: '#fef08a',
  },
  'theme.yomKippur': {
    gradient: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #a8a29e 100%)',
    border: '#44403c',
    text: '#1c1917',
    glow: 'rgba(168, 162, 158, 0.4)',
    accent: '#fcd34d',
  },
  'theme.sukkot': {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #84cc16 50%, #fcd34d 100%)',
    border: '#365314',
    text: '#052e16',
    glow: 'rgba(132, 204, 22, 0.4)',
    accent: '#a16207',
  },
  'theme.purim': {
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)',
    border: '#86198f',
    text: '#fdf4ff',
    glow: 'rgba(168, 85, 247, 0.5)',
    accent: '#fcd34d',
  },
  'theme.passover': {
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #fcd34d 100%)',
    border: '#450a0a',
    text: '#fef2f2',
    glow: 'rgba(220, 38, 38, 0.4)',
    accent: '#fef08a',
  },
  'theme.shavuot': {
    gradient: 'linear-gradient(135deg, #f5f5f4 0%, #86efac 50%, #22c55e 100%)',
    border: '#166534',
    text: '#052e16',
    glow: 'rgba(134, 239, 172, 0.4)',
    accent: '#fcd34d',
  },
  'theme.yomHaatzmaut': {
    gradient: 'linear-gradient(135deg, #2563eb 0%, #ffffff 50%, #2563eb 100%)',
    border: '#1e3a8a',
    text: '#1e40af',
    glow: 'rgba(37, 99, 235, 0.5)',
    accent: '#fcd34d',
  },
  // Swedish holidays
  'theme.midsummer': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #3b82f6 50%, #22c55e 100%)',
    border: '#1e3a8a',
    text: '#172554',
    glow: 'rgba(252, 211, 77, 0.4)',
    accent: '#fda4af',
  },
  'theme.lucia': {
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #dc2626 100%)',
    border: '#78350f',
    text: '#1c1917',
    glow: 'rgba(252, 211, 77, 0.5)',
    accent: '#fef9c3',
  },
  // Spanish holidays
  'theme.threeKings': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #7c3aed 50%, #dc2626 100%)',
    border: '#581c87',
    text: '#fef9c3',
    glow: 'rgba(252, 211, 77, 0.5)',
    accent: '#c4b5fd',
  },
  'theme.dayOfDead': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #7c3aed 50%, #000000 100%)',
    border: '#1e1b4b',
    text: '#fef3c7',
    glow: 'rgba(249, 115, 22, 0.5)',
    accent: '#fda4af',
  },
  // Japanese holidays
  'theme.setsubun': {
    gradient: 'linear-gradient(135deg, #dc2626 0%, #1e1b4b 100%)',
    border: '#450a0a',
    text: '#fef2f2',
    glow: 'rgba(220, 38, 38, 0.4)',
    accent: '#fcd34d',
  },
  'theme.hinamatsuri': {
    gradient: 'linear-gradient(135deg, #f9a8d4 0%, #dc2626 50%, #fcd34d 100%)',
    border: '#9d174d',
    text: '#1c1917',
    glow: 'rgba(249, 168, 212, 0.4)',
    accent: '#86efac',
  },
  'theme.sakura': {
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 50%, #f472b6 100%)',
    border: '#be185d',
    text: '#831843',
    glow: 'rgba(244, 114, 182, 0.4)',
    accent: '#86efac',
  },
  'theme.goldenWeek': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #22c55e 50%, #dc2626 100%)',
    border: '#78350f',
    text: '#1c1917',
    glow: 'rgba(252, 211, 77, 0.5)',
    accent: '#f5f5f4',
  },
  'theme.tanabata': {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #fcd34d 100%)',
    border: '#312e81',
    text: '#fef9c3',
    glow: 'rgba(124, 58, 237, 0.5)',
    accent: '#f9a8d4',
  },
  'theme.obon': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #fcd34d 50%, #dc2626 100%)',
    border: '#78350f',
    text: '#1c1917',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: '#fef9c3',
  },
  'theme.autumnLeaves': {
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #ca8a04 100%)',
    border: '#78350f',
    text: '#fef3c7',
    glow: 'rgba(220, 38, 38, 0.4)',
    accent: '#fcd34d',
  },

  // === DAY OF WEEK THEMES ===
  'theme.sundayFunday': {
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #f97316 100%)',
    border: '#78350f',
    text: '#1c1917',
    glow: 'rgba(252, 211, 77, 0.4)',
    accent: '#fed7aa',
  },
  'theme.mondayMotivation': {
    gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    border: '#7c2d12',
    text: '#fef2f2',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: '#fcd34d',
  },
  'theme.tuesdayTrivia': {
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    border: '#581c87',
    text: '#fdf4ff',
    glow: 'rgba(124, 58, 237, 0.4)',
    accent: '#c4b5fd',
  },
  'theme.wednesdayWisdom': {
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
    border: '#1e3a8a',
    text: '#eff6ff',
    glow: 'rgba(29, 78, 216, 0.4)',
    accent: '#93c5fd',
  },
  'theme.thursdayThrowback': {
    gradient: 'linear-gradient(135deg, #78716c 0%, #a16207 100%)',
    border: '#44403c',
    text: '#fef3c7',
    glow: 'rgba(161, 98, 7, 0.4)',
    accent: '#fcd34d',
  },
  'theme.funFriday': {
    gradient: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)',
    border: '#86198f',
    text: '#fdf4ff',
    glow: 'rgba(236, 72, 153, 0.5)',
    accent: '#fcd34d',
  },
  'theme.saturdayAdventure': {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #0d9488 100%)',
    border: '#14532d',
    text: '#f0fdf4',
    glow: 'rgba(34, 197, 94, 0.4)',
    accent: '#fcd34d',
  },
};

// Default fallback colors
const DEFAULT_HOLIDAY_COLORS: ThemeColors = {
  gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  border: '#9f1239',
  text: '#fdf2f8',
  glow: 'rgba(236, 72, 153, 0.4)',
  accent: '#fcd34d',
};

const DEFAULT_REGULAR_COLORS: ThemeColors = {
  gradient: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
  border: '#78350f',
  text: '#1c1917',
  glow: 'rgba(252, 211, 77, 0.3)',
  accent: '#fef08a',
};

function getThemeColors(nameKey: string, isHoliday: boolean): ThemeColors {
  return THEME_COLORS[nameKey] || (isHoliday ? DEFAULT_HOLIDAY_COLORS : DEFAULT_REGULAR_COLORS);
}

export function ThemeIndicator({ theme, className = '' }: ThemeIndicatorProps) {
  const { t } = useLanguage();

  if (!theme) return null;

  const isHoliday = theme.isHoliday;
  const colors = getThemeColors(theme.nameKey, isHoliday);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 ${className}`}
      style={{
        background: colors.gradient,
        backgroundSize: isHoliday ? '200% 200%' : '100% 100%',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: colors.border,
        borderRadius: '8px',
        boxShadow: `3px 3px 0px ${colors.border}, 0 0 12px ${colors.glow}`,
        color: colors.text,
        animation: isHoliday ? 'theme-gradient-shift 3s ease infinite' : undefined,
      }}
    >
      {/* Shimmer overlay for holidays */}
      {isHoliday && (
        <motion.div
          className="absolute inset-0 rounded-[5px] pointer-events-none overflow-hidden"
          style={{ opacity: 0.15 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${colors.accent} 50%, transparent 100%)`,
              width: '200%',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Theme Emoji */}
      <motion.span
        className="text-lg leading-none"
        role="img"
        aria-hidden="true"
        animate={isHoliday ? { scale: [1, 1.15, 1] } : undefined}
        transition={isHoliday ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        {theme.emoji}
      </motion.span>

      {/* Theme Name */}
      <span
        className="text-xs font-black uppercase tracking-wide truncate max-w-[100px]"
        style={{ textShadow: isHoliday ? `0 1px 1px ${colors.border}` : undefined }}
      >
        {t(theme.nameKey)}
      </span>

      {/* Holiday sparkle indicator */}
      {isHoliday && (
        <motion.span
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm"
        >
          ✨
        </motion.span>
      )}

      {/* Inline CSS for gradient animation */}
      <style jsx>{`
        @keyframes theme-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </motion.div>
  );
}

export default ThemeIndicator;
