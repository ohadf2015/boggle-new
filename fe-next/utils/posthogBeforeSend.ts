/**
 * posthog-js has ONE `before_send` slot, so everything that rewrites or drops an
 * outgoing event composes here.
 *
 * PostHog's rage-click test is purely geometric — 3 clicks inside ~1s within
 * ~30px — which Word Tower's letter row and backspace trip during ordinary fast
 * play (they exist to be tapped that way, see V2Dock). Those taps made Word
 * Tower roughly half of the product's $rageclick events, one player at a time.
 * Surfaces that opt out mark themselves with `data-feedback-ignore-rage="true"`;
 * their clicks are relabeled rather than dropped, so a nonzero
 * `rageclick_by_design` proves the marker reaches the captured element payload
 * at all.
 *
 * The exemption needs the literal `"true"`, not just the attribute. The marker
 * also sits empty-valued on the homepage hero, the board and the daily wheel,
 * while `exp-homepage-click-feedback-v1` (scored on $rageclick for `/en` + `/`)
 * and `exp-wordhunt-clue-shake-v1` (word-hunt daily URLs) are still running —
 * relabeling there would hand both experiments their conversion for free. Those
 * surfaces opt in by setting the value once their experiment has concluded.
 */

import { filterEmptyException } from './posthogExceptionFilter';

const MARKER_ATTR = 'attr__data-feedback-ignore-rage';
const MARKER_IN_CHAIN = `${MARKER_ATTR}="true"`;

interface PostHogEventLike {
  event?: string;
  properties?: Record<string, unknown>;
}

function isByDesignTap(properties: Record<string, unknown> | undefined): boolean {
  // Either shape can reach before_send depending on posthog-js version: the raw
  // $elements array, or the serialized chain.
  const elements = properties?.$elements;
  if (Array.isArray(elements)) {
    return (elements as Array<Record<string, unknown> | null>).some((el) => el?.[MARKER_ATTR] === 'true');
  }
  const chain = properties?.$elements_chain;
  return typeof chain === 'string' && chain.includes(MARKER_IN_CHAIN);
}

export function posthogBeforeSend<T extends PostHogEventLike | null>(event: T): T | null {
  const kept = filterEmptyException(event);
  if (kept?.event === '$rageclick' && isByDesignTap(kept.properties)) {
    (kept as PostHogEventLike).event = 'rageclick_by_design';
  }
  return kept;
}
