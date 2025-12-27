'use client';

/**
 * ThemeIndicator Component
 *
 * Displays the current game theme (holiday, special event, or day-of-week)
 * in a neo-brutalist style that's noticeable but doesn't distract from gameplay.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import type { BoardTheme } from '@/shared/types/socket';

interface ThemeIndicatorProps {
  theme: BoardTheme | null;
  className?: string;
}

export function ThemeIndicator({ theme, className = '' }: ThemeIndicatorProps) {
  const { t } = useLanguage();

  if (!theme) return null;

  // Holiday themes get pink background, regular themes get yellow
  const isHoliday = theme.isHoliday;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5
        ${isHoliday
          ? 'bg-neo-pink border-neo-black'
          : 'bg-neo-yellow border-neo-black'
        }
        border-2
        rounded-neo-lg
        shadow-hard-sm
        ${className}
      `}
    >
      {/* Theme Label */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-neo-black/60">
        {t('game.boardTheme')}
      </span>

      {/* Separator */}
      <span className="w-px h-4 bg-neo-black/20 text-white" />

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
      <span className="text-sm font-black uppercase tracking-wide text-neo-black truncate max-w-[100px]">
        {t(theme.nameKey)}
      </span>

      {/* Holiday sparkle indicator */}
      {isHoliday && (
        <motion.span
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm"
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  );
}

export default ThemeIndicator;
