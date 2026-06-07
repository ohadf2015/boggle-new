'use client';

import { memo, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { selectClosestRivals } from '@/lib/leaderboard/selectClosestRivals';
import { rosterToRivals } from '@/lib/leaderboard/rivalNormalizers';
import { ClosestRivalsPanel } from '@/components/game/in-game/ClosestRivalsPanel';
import { ThemedPanel } from './ThemedPanel';
import { RosterRail, type RosterPlayer } from './RosterRail';
import type { MpDesktopMode } from './types';

export interface DesktopRivalsRosterRailProps {
  mode: MpDesktopMode;
  /** Live leaderboard (server-authoritative running scores), shared across modes. */
  leaderboard: RosterPlayer[];
  /** Current player key (username or userId — rosterToRivals checks both). */
  meId?: string;
  /** Preserves each mode's existing roster panel test id (standard-/blast-/wr-/hunt-roster). */
  rosterTestId?: string;
  /** Number of nearest rivals to surface in the Close Race panel. */
  rivalCount?: number;
}

/**
 * Unified desktop left rail for multiplayer: the "Close Race" rivals panel stacked
 * over the live roster. Identical component + logic for every reachable MP mode
 * (classic/blast/wheel-rush/word-hunt) — previously only classic showed the rivals
 * panel. The scoring math stays per-mode upstream; this is display-only and operates
 * on the shared RosterPlayer[] leaderboard. The rivals panel self-omits (selector
 * returns null) when there is no "me" or no rival to show (solo/spectator).
 */
function DesktopRivalsRosterRailImpl({
  mode,
  leaderboard,
  meId,
  rosterTestId,
  rivalCount = 3,
}: DesktopRivalsRosterRailProps) {
  const { t } = useLanguage();

  const rivalsView = useMemo(
    () => selectClosestRivals(rosterToRivals(leaderboard, meId), rivalCount),
    [leaderboard, meId, rivalCount],
  );

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {rivalsView && <ClosestRivalsPanel view={rivalsView} />}
      <ThemedPanel
        mode={mode}
        variant="rail"
        header={t('mp.insights.rosterHeader')}
        headerRight={`${leaderboard.length}`}
        testId={rosterTestId}
      >
        <RosterRail players={leaderboard} />
      </ThemedPanel>
    </div>
  );
}

export const DesktopRivalsRosterRail = memo(DesktopRivalsRosterRailImpl);
