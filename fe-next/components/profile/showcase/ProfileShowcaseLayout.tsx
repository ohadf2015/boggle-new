'use client';

import React, { useEffect, useId, useRef } from 'react';
import { m, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface ShowcaseTab {
  id: string;
  label: string;
  Icon?: LucideIcon;
}

interface ProfileShowcaseLayoutProps {
  stage: React.ReactNode;
  tabs: readonly ShowcaseTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  isRtl?: boolean;
  /** Active panel content. */
  children: React.ReactNode;
  /** Spread on the swipe container (pull-to-refresh touch handlers). */
  panelHandlers?: Pick<React.HTMLAttributes<HTMLDivElement>, 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'>;
  /** Rendered above the panel inside the swipe container (pull-to-refresh indicator). */
  beforePanel?: React.ReactNode;
}

const SWIPE_THRESHOLD = 50;

/**
 * Phone: stage on top, then a 4-segment tab bar (not sticky: the app header is fixed on top) and ONE panel (swipe or
 * tap between segments — no endless card stack). Desktop (md+): stage in the
 * inline-start column, tabs + panel fill the rest of the width.
 * Scroll stays on the document (no nested scroll container).
 */
export function ProfileShowcaseLayout({
  stage,
  tabs,
  activeTab,
  onTabChange,
  isRtl = false,
  children,
  panelHandlers,
  beforePanel,
}: ProfileShowcaseLayoutProps): React.ReactElement {
  const reduced = useReducedMotion();
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const index = Math.max(0, tabs.findIndex(tab => tab.id === activeTab));
  // Last COMMITTED index (updated after commit, so StrictMode double-render agrees).
  const prevIndex = useRef(index);
  const direction = index === prevIndex.current ? 0 : index > prevIndex.current ? 1 : -1;
  useEffect(() => { prevIndex.current = index; }, [index]);

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < tabs.length) onTabChange(tabs[next].id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const back = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) { e.preventDefault(); go(1); }
    else if (e.key === back) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); onTabChange(tabs[0].id); }
    else if (e.key === 'End') { e.preventDefault(); onTabChange(tabs[tabs.length - 1].id); }
  };

  const onDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return;
    // Dragging toward the inline-start reveals the next segment.
    const towardStart = isRtl ? info.offset.x > 0 : info.offset.x < 0;
    go(towardStart ? 1 : -1);
  };

  const slide = (reduced ? 0 : 28) * direction * (isRtl ? -1 : 1);

  return (
    <div className="w-full max-w-6xl mx-auto md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] md:gap-8 md:px-6 md:py-6">
      <div className="px-5 pt-3 md:px-0 md:pt-0 md:self-start">{stage}</div>

      <div className="min-w-0 mt-5 md:mt-0">
        <div
          role="tablist"
          aria-orientation="horizontal"
          className="relative z-20 bg-neo-navy px-5 md:px-0 py-2 flex items-stretch gap-1.5"
        >
          {tabs.map((tab, i) => {
            const selected = i === index;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                id={`${baseId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={onKeyDown}
                className={cn(
                  'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 rounded-neo font-neo-display text-[10px] min-[400px]:text-[11px] sm:text-sm font-bold leading-tight tracking-tight transition-transform duration-150',
                  selected
                    ? 'bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard-sm -translate-y-0.5'
                    : 'bg-neo-white/8 text-neo-white border-2 border-neo-white/20 active:scale-95',
                )}
              >
                {Icon && <Icon className="w-5 h-5 shrink-0" aria-hidden />}
                <span className="max-w-full truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          {index > 0 && (
            <div
              className="md:hidden absolute inset-s-0 top-0 bottom-0 w-5 z-10 pointer-events-none bg-linear-to-r rtl:bg-linear-to-l from-neo-navy/60 to-transparent flex items-start pt-10 justify-start"
              aria-hidden="true"
            >
              <ChevronLeft className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}
          {index < tabs.length - 1 && (
            <div
              className="md:hidden absolute inset-e-0 top-0 bottom-0 w-5 z-10 pointer-events-none bg-linear-to-l rtl:bg-linear-to-r from-neo-navy/60 to-transparent flex items-start pt-10 justify-end"
              aria-hidden="true"
            >
              <ChevronRight className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}

          <m.div
            className="h-full px-5 md:px-0 pt-3 pb-24 md:pb-6"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            {...panelHandlers}
          >
            {beforePanel}
            <m.div
              key={tabs[index]?.id}
              id={`${baseId}-panel`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${tabs[index]?.id}`}
              className="flex flex-col gap-4"
              initial={reduced || direction === 0 ? false : { x: slide, opacity: 0.4 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </m.div>
          </m.div>
        </div>
      </div>
    </div>
  );
}

export default ProfileShowcaseLayout;
