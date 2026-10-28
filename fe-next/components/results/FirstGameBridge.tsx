'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';
import {
  FIRST_GAME_BRIDGE_KEY,
  FIRST_GAME_BRIDGE_TREATMENT,
  bridgeDestination,
  nextGamePickedPayload,
  shouldShowFirstGameBridge,
  type FirstGameBridgeSurface,
} from '@/lib/retention/firstGameBridge';

interface FirstGameBridgeProps {
  surface: FirstGameBridgeSurface;
  /**
   * The player is on the results surface under test (classic MP, not a
   * classroom, reveal finished). First-session is checked here so a returning
   * player never logs an exposure.
   */
  enabled: boolean;
  /** Parent owns navigation: SP pushes quick play, MP leaves through useMpExit. */
  onActivate: () => void;
  /** Treatment is on screen — parent may hold a same-mode auto-advance. */
  onHoldingChange?: (holding: boolean) => void;
}

/**
 * One-tap next-mode bridge. Renders nothing on control, before the flag
 * loads, or outside the first session — today's screen stays today's screen.
 */
export default function FirstGameBridge({
  surface,
  enabled,
  onActivate,
  onHoldingChange,
}: FirstGameBridgeProps) {
  const { t } = useLanguage();
  const [gamesCompleted] = useState(() => readGamesCompletedCount());
  const askFlag = enabled && gamesCompleted <= 1;
  const variant = useGrowthRadarFlag(FIRST_GAME_BRIDGE_KEY, askFlag);
  const show = shouldShowFirstGameBridge({ gamesCompleted, variant, classicMp: true });
  const dest = bridgeDestination(surface, 'en');
  const onHoldingChangeRef = useRef(onHoldingChange);
  onHoldingChangeRef.current = onHoldingChange;

  useEffect(() => {
    onHoldingChangeRef.current?.(show);
  }, [show]);

  if (!show) return null;

  const Icon = surface === 'singleplayer' ? Users : Timer;
  const activate = () => {
    trackGrowthEvent('next_game_picked', nextGamePickedPayload(surface));
    onActivate();
  };

  return (
    <button
      type="button"
      data-testid="first-game-bridge"
      data-variant={FIRST_GAME_BRIDGE_TREATMENT}
      data-to={dest.toMode}
      onClick={activate}
      className="w-full min-h-14 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard font-neo-display font-black uppercase tracking-wide text-base sm:text-lg px-4 py-3 flex items-center justify-center gap-2 active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span>{t(dest.labelKey)}</span>
    </button>
  );
}
