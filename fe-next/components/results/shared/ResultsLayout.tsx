'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

interface ResultsLayoutProps {
  /** Zone 1: Hero section (score, outcome, stats) — always full width */
  hero: React.ReactNode;
  /** Zone 2: Action buttons (CTA, share, streak) */
  actions: React.ReactNode;
  /** Zone 3: Analysis sections (collapsible: words, performance, missed) */
  analysis?: React.ReactNode;
  /** Right column on desktop: leaderboard, chat, social context */
  sidebar?: React.ReactNode;
  className?: string;
}

/**
 * ResultsLayout — Unified responsive layout for all results pages.
 *
 * - Portrait mobile: single column scroll (hero → actions → analysis)
 * - Desktop (lg+): hero full-width, then 2-col (actions+analysis left, sidebar right)
 * - Landscape mobile: simplified 2-col (actions left, sidebar right)
 */
export function ResultsLayout({
  hero,
  actions,
  analysis,
  sidebar,
  className,
}: ResultsLayoutProps) {
  const isLandscape = useMobileLandscape();

  if (isLandscape) {
    return (
      <div className={cn(
        'flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain scrollable-area',
        className,
      )}>
        {/* Compact hero in landscape */}
        <div className="px-3 pt-2 pb-1">{hero}</div>

        {/* 2-column: actions left, sidebar right */}
        <div
          data-testid="landscape-grid"
          className="flex-1 grid grid-cols-2 gap-3 px-3 pb-3 min-h-0"
        >
          <div className="overflow-y-auto overscroll-contain space-y-3">
            {actions}
            {analysis}
          </div>
          {sidebar && (
            <div className="overflow-y-auto overscroll-contain">
              {sidebar}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex-1 min-h-0 flex flex-col items-center overflow-y-auto overscroll-contain scrollable-area',
      className,
    )}>
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl py-4 px-4">
        {/* Zone 1: Hero — always full width */}
        {hero}

        {/* Desktop: 2-column layout for zones 2+3 — sidebar scales with viewport */}
        <div className="lg:grid lg:grid-cols-[1fr_minmax(320px,400px)] xl:grid-cols-[1fr_minmax(360px,440px)] lg:gap-6 lg:items-start mt-4">
          {/* Left column: actions + analysis */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            {/* Zone 2: Actions */}
            {actions}

            {/* Zone 3: Analysis (collapsible sections) */}
            {analysis && (
              <div className="space-y-2 mt-4">
                {analysis}
              </div>
            )}
          </motion.div>

          {/* Right column: sidebar (desktop only, below analysis on mobile) */}
          {sidebar && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 lg:mt-0 lg:sticky lg:top-4 space-y-3"
            >
              {sidebar}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
