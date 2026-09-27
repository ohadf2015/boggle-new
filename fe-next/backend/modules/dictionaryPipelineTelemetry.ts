/**
 * Telemetry for the self-improving dictionary pipeline.
 *
 * Each scheduled run (verify / promote / heal) emits one `dict:auto_run` PostHog
 * event so the founder can answer "is the dictionary improving over time?" from a
 * single trend — without it the only signal is stdout logs that die in Railway.
 *
 * Fire-and-forget: never throws, never blocks the pipeline.
 */

import { getPostHogServer } from '@/lib/posthog';
import logger from '../utils/logger';

export type DictionaryRunStage = 'verify' | 'promote' | 'heal';

export async function emitDictionaryRun(
  stage: DictionaryRunStage,
  props: Record<string, number>
): Promise<void> {
  try {
    const ph = getPostHogServer();
    if (!ph) return;
    ph.capture({
      distinctId: 'system:dictionary-pipeline',
      event: 'dict:auto_run',
      properties: { stage, ...props },
    });
    await ph.flush();
  } catch (error) {
    logger.warn('DICT_TELEMETRY', `emit failed for stage ${stage}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
