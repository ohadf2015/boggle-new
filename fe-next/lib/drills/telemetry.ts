/**
 * Brain-drill telemetry — thin wrapper over PostHog `capture` for the
 * drills tree. Stable `drill_*` event names + snake_case property keys.
 *
 * Why a wrapper:
 * - Single grep target (`trackDrill*`) for compliance audits.
 * - Pairs with the server-side `drill_completed` event so funnels
 *   (started → abandoned vs completed) become computable.
 * - Never throws — analytics must not break gameplay.
 *
 * Audit ref: `fe-next/docs/audits/brain-drills-2026-04-26.md` §C1.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackGameStart } from '@/utils/growthTracking';
import type { DrillType } from '@/shared/types/cognitive';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[drillTelemetry] capture failed', { event, err });
    }
  }
};

export interface DrillStartArgs {
  drillType: DrillType;
  level: number;
}

export function trackDrillStart(args: DrillStartArgs): void {
  safeCapture('drill_started', {
    drill_type: args.drillType,
    level: args.level,
  });
  // Mirror game_started so brain-drill appears in the per-mode funnel alongside
  // all other modes (game_completed already fires via emitBrainDrillGameEnd).
  trackGameStart('brain-drill', { drillType: args.drillType, level: args.level });
}

export interface DrillSessionArgs {
  drillType: DrillType;
  level: number;
  score: number;
  wordsFound: number;
  durationSeconds: number;
}

export function trackDrillAbandon(args: DrillSessionArgs): void {
  safeCapture('drill_abandoned', {
    drill_type: args.drillType,
    level: args.level,
    score: args.score,
    words_found: args.wordsFound,
    duration_seconds: args.durationSeconds,
  });
}

export function trackDrillComplete(args: DrillSessionArgs): void {
  safeCapture('drill_completed', {
    drill_type: args.drillType,
    level: args.level,
    score: args.score,
    words_found: args.wordsFound,
    duration_seconds: args.durationSeconds,
  });
}
