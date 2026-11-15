/**
 * The one `before_send` slot posthog-js gives us. It drops empty $exception
 * events (see posthogExceptionFilter) and relabels rage taps that the UI makes
 * by design.
 *
 * PostHog's rageclick test is purely geometric — 3 clicks inside ~1s within
 * ~30px — which Word Tower's letter row and full-width BUILD/DROP button trip
 * during ordinary fast play. `data-feedback-ignore-rage` was written at 11
 * sites to mark those surfaces and was read nowhere, so the word-tower URLs
 * stayed the app's biggest $rageclick cluster (109 events / 7d) with nothing
 * broken behind it. Marked taps now arrive as `rageclick_by_design`, so they
 * are still countable but no longer read as frustration.
 *
 * The gate is the literal value "true", not the attribute's presence: the
 * homepage hero, the Word Hunt board and the daily wheel carry an empty-valued
 * marker and must keep emitting plain $rageclick, because
 * exp-homepage-click-feedback-v1 and exp-wordhunt-clue-shake-v1 are scored on it.
 */

import { filterEmptyException, type PostHogEventLike } from './posthogExceptionFilter';

const MARKED_ATTR = 'attr__data-feedback-ignore-rage';
export const BY_DESIGN_RAGECLICK = 'rageclick_by_design';

/**
 * Autocapture carries the clicked element's attributes as `$elements` objects,
 * or as the flattened `$elements_chain` string. Which one reaches `before_send`
 * depends on the posthog-js build, so read both — matching only one would make
 * this a silent no-op.
 */
function isByDesign(properties: Record<string, unknown>): boolean {
  const elements = properties.$elements;
  if (
    Array.isArray(elements) &&
    elements.some((el) => el && typeof el === 'object' && (el as Record<string, unknown>)[MARKED_ATTR] === 'true')
  ) {
    return true;
  }
  const chain = properties.$elements_chain;
  return typeof chain === 'string' && chain.includes(`${MARKED_ATTR}="true"`);
}

export function posthogBeforeSend<T extends PostHogEventLike | null>(event: T): T | null {
  const kept = filterEmptyException(event);
  if (!kept || kept.event !== '$rageclick' || !kept.properties) return kept;
  if (isByDesign(kept.properties)) kept.event = BY_DESIGN_RAGECLICK;
  return kept;
}
