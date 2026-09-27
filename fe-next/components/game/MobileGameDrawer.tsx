/**
 * MobileGameDrawer
 * Swipeable bottom drawer for mobile game view.
 * Shows a peek bar with key stats when collapsed, full content when expanded.
 * Uses framer-motion drag gesture for swipe up/down.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { m, useMotionValue, PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, BookOpen, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileGameDrawerProps {
  children: React.ReactNode;
  /** Key stats for the collapsed peek bar */
  peekStats?: {
    wordCount: number;
    score: number;
  };
  /** Translation fn */
  t: (key: string) => string;
  /** Collapsed height in px (peek bar) */
  peekHeight?: number;
  /** Expanded max height in px */
  expandedHeight?: number;
}

const DRAG_THRESHOLD = 40;

export function MobileGameDrawer({
  children,
  peekStats,
  t,
  peekHeight = 44,
  expandedHeight = 260,
}: MobileGameDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -DRAG_THRESHOLD) {
      setIsOpen(true);
    } else if (info.offset.y > DRAG_THRESHOLD) {
      setIsOpen(false);
    }
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <m.div
      ref={containerRef}
      className="block lg:hidden fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      animate={{
        height: isOpen ? expandedHeight : peekHeight,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      {/* Peek bar — always visible, shows key stats + drag handle */}
      <m.button
        type="button"
        aria-expanded={isOpen}
        aria-label={t('game.drawer.toggle')}
        className="w-full bg-neo-navy/95 border-t-2 border-neo-black/60 cursor-grab active:cursor-grabbing touch-none select-none"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y }}
        onClick={toggleDrawer}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrawer(); } }}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Drag indicator + chevron */}
          <div className="flex items-center gap-1.5">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-neo-white" />
            ) : (
              <ChevronUp className="w-4 h-4 text-neo-white" />
            )}
          </div>

          {/* Peek stats */}
          {peekStats && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-neo-white" />
                <span className="text-xs font-bold text-neo-white tabular-nums">
                  {peekStats.wordCount}
                </span>
                <span className="text-[9px] text-neo-white">
                  {t('results.wordsFound')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Gem className="w-3 h-3 text-neo-white" />
                <m.span
                  key={peekStats.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xs font-black text-neo-white tabular-nums"
                >
                  {peekStats.score}
                </m.span>
              </div>
            </div>
          )}

          {/* Drag pill */}
          <div className="w-6 h-1 rounded-full bg-neo-cream/30" />
        </div>
      </m.button>

      {/* Expanded content */}
      <m.div
        role="region"
        aria-label={t('game.drawer.content')}
        className={cn(
          'bg-neo-navy/95 overflow-y-auto overscroll-contain',
          'px-2 pb-2'
        )}
        animate={{
          height: isOpen ? expandedHeight - peekHeight : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
