'use client';

/**
 * Shared casino table shell — wood rail + green felt.
 * Used by solo SealedBidTable and multiplayer SealedBidVersus so both
 * surfaces read as the same game.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SEALED_BID_ASSETS } from './sealedBidAssets';

export interface SealedBidFeltShellProps {
  children: ReactNode;
  className?: string;
  /** Optional test id on the felt (default sb-felt) */
  testId?: string;
}

export default function SealedBidFeltShell({
  children,
  className,
  testId = 'sb-felt',
}: SealedBidFeltShellProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border-[5px] border-[#3d2314] shadow-hard-lg',
        className
      )}
      style={{
        // Outer "wood" rail via box-shadow rings
        boxShadow:
          '0 0 0 3px #1a0f0a, 0 0 0 6px #c9a227, 4px 6px 0 2px #000',
      }}
    >
      {/* Wood-grain rail inset */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.05rem]"
        style={{
          background:
            'linear-gradient(135deg, #5c3a1e 0%, #3d2314 40%, #6b4423 70%, #2a160c 100%)',
          padding: 10,
        }}
      />
      {/* Felt well */}
      <div
        className="relative m-[10px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[0.85rem]"
        style={{
          backgroundColor: '#14532d',
          backgroundImage: `url(${SEALED_BID_ASSETS.feltTile})`,
          backgroundSize: '72px 72px',
          backgroundRepeat: 'repeat',
        }}
      >
        {/* Table vignette + gold inner stitch */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[0.85rem]"
          style={{
            boxShadow:
              'inset 0 0 0 2px rgba(201,162,39,0.45), inset 0 0 60px rgba(0,0,0,0.45)',
          }}
        />
        {/* Soft center spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(34,197,94,0.18) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
