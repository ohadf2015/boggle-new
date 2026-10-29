'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BlastBoardTrayProps {
  chainLevel: number;
  comboFlashTier: number;
  /** Off on low-end / reduced-motion: the glow keyframe repaints every frame. */
  animateGlow: boolean;
  isDesktopCanvas: boolean;
  children: ReactNode;
}

function trayBorder(chainLevel: number, comboFlashTier: number): string {
  if (chainLevel >= 4) return 'border-neo-yellow';
  if (chainLevel >= 2) return 'border-neo-purple';
  if (comboFlashTier >= 2) return 'border-neo-pink';
  return 'border-neo-black';
}

function glowColor(chainLevel: number, comboFlashTier: number): string {
  if (chainLevel >= 4) return 'rgba(255,200,0,0.5)';
  if (chainLevel >= 2) return 'rgba(139,92,246,0.4)';
  if (comboFlashTier >= 2) return 'rgba(255,20,147,0.4)';
  return 'transparent';
}

/**
 * Chunky board tray. Its slot is a size container, so the square takes the
 * short side of whatever space the HUD and word bar leave. Phones anchor it
 * under the HUD; the space below belongs to the word bar and coach.
 */
export function BlastBoardTray({ chainLevel, comboFlashTier, animateGlow, isDesktopCanvas, children }: BlastBoardTrayProps) {
  const glowing = chainLevel >= 2 || comboFlashTier >= 2;
  return (
    <div className="blast-tray-slot flex w-full min-h-0 flex-1 items-start justify-center pt-3 shell:items-center shell:pt-0 [container-type:size]">
      <div
        data-testid="blast-board-tray"
        className={cn(
          'blast-tray relative w-[min(100cqw,100cqh)] rounded-neo border-3 p-1 shadow-hard-lg transition-colors duration-300 sm:p-1.5',
          isDesktopCanvas ? 'max-w-[min(680px,82dvh)]' : '2xl:max-w-[min(820px,86dvh)]',
          trayBorder(chainLevel, comboFlashTier),
        )}
        style={{
          '--frame-glow-color': glowColor(chainLevel, comboFlashTier),
          ...(animateGlow && glowing ? { animation: 'blast-frame-glow 1.2s ease-in-out infinite' } : {}),
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
