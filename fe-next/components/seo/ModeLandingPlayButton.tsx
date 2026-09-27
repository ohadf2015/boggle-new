'use client';

import React from 'react';
import Link from 'next/link';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface ModeLandingPlayButtonProps {
  mode: 'adventure' | 'word-tower';
  href: string;
  label?: string;
}

/**
 * CTA button for game mode landing pages.
 * Fires a trackGrowthEvent when clicked to measure landing-page engagement.
 *
 * Usage:
 * ```tsx
 * <ModeLandingPlayButton mode="adventure" href="/en/adventure" label="Play" />
 * ```
 */
export function ModeLandingPlayButton({ mode, href, label = 'Play' }: ModeLandingPlayButtonProps) {
  const handleClick = () => {
    trackGrowthEvent('mode_landing_play_clicked', { mode });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      data-mode-landing-cta={mode}
      className="inline-block rounded-neo bg-neo-lime px-6 py-3 font-bold text-neo-navy shadow-hard transition-transform hover:scale-105 active:scale-95"
    >
      {label}
    </Link>
  );
}
