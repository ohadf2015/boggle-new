'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Mascot, type MascotVariant } from '../../../../components/ui/Mascot';

interface FullWidthBannerLayoutProps {
  headline: string;
  subtext?: string;
  icon: LucideIcon;
  mascotVariant: MascotVariant;
  bgGradient: string;
  textColor: string;
  borderColor: string;
}

/**
 * FullWidthBannerLayout - Wide banner for game state announcements
 * Used for Fire Round, Final Warning, Earthquake
 */
const FullWidthBannerLayout = memo<FullWidthBannerLayoutProps>(({
  headline,
  subtext,
  icon: Icon,
  mascotVariant,
  bgGradient,
  textColor,
  borderColor,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scaleX: 0.8 }}
      animate={{ opacity: 1, y: 0, scaleX: 1 }}
      exit={{ opacity: 0, y: 50, scaleX: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'w-[90vw] max-w-4xl px-8 py-5 rounded-neo border-4',
        `bg-gradient-to-r ${bgGradient}`,
        textColor,
        borderColor,
        'shadow-hard-xl',
      )}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Icon */}
        <motion.div
          animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="flex-shrink-0"
        >
          <Icon className="w-12 h-12 md:w-16 md:h-16" />
        </motion.div>

        {/* Center: Content */}
        <div className="flex-1 text-center">
          <motion.h3
            className="font-black uppercase tracking-wider text-3xl md:text-4xl lg:text-5xl"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            {headline}
          </motion.h3>
          {subtext && (
            <motion.p
              className="font-bold text-lg md:text-xl opacity-90 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 26 }}
            >
              {subtext}
            </motion.p>
          )}
        </div>

        {/* Right: Mascot */}
        <motion.div
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.15 }}
          className="flex-shrink-0"
        >
          <Mascot
            variant={mascotVariant}
            size="lg"
            animated
            className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
            clipBorder="pink"
          />
        </motion.div>
      </div>

      {/* Animated accent line */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-neo-cream/50"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
});

FullWidthBannerLayout.displayName = 'FullWidthBannerLayout';

export default FullWidthBannerLayout;
