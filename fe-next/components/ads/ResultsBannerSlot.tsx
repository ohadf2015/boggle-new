'use client';

import InlineBannerAd from './InlineBannerAd';

export type ResultsPlacement =
  | 'singleplayer-complete'
  | 'daily-complete'
  | 'word-hunt-complete'
  | 'league-complete'
  | 'challenge-complete'
  | 'boss-rush-complete'
  | 'multiplayer-round-complete';

interface ResultsBannerSlotProps {
  /** Analytics anchor — which results screen this slot belongs to. */
  placement: ResultsPlacement;
  /** Reserved slot height (px). Defaults to standard adaptive banner. */
  reservedHeight?: number;
  /** UX kill switch — render nothing. Use for cases where caller needs the banner gone (e.g. ad-free entitlement, narrow screen). */
  disabled?: boolean;
  className?: string;
}

/**
 * ResultsBannerSlot — terminal-state banner for post-game screens.
 *
 * Why a wrapper around InlineBannerAd: centralizes "content variant +
 * post-game zone" as a single component so future cross-cutting changes
 * (impression tracking, viewability gating, dismiss button) land in one
 * place rather than 5 results screens.
 *
 * UX guardrails baked in:
 *   - `variant='content'` routes to the content banner unit (not the
 *     in-flow game banner) so house ads don't interrupt gameplay.
 *   - Mounted only on terminal screens — never during active play.
 *   - `disabled` prop for callers that need a kill switch (entitlement,
 *     narrow viewport, A/B variant).
 */
export default function ResultsBannerSlot({
  placement,
  reservedHeight = 60,
  disabled = false,
  className,
}: ResultsBannerSlotProps) {
  if (disabled) return null;

  return (
    <div data-results-banner={placement} className={className}>
      <InlineBannerAd
        variant="content"
        webZone="post-game"
        reservedHeight={reservedHeight}
      />
    </div>
  );
}
