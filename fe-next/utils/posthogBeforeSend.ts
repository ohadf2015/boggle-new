/**
 * The one `before_send` slot posthog-js gives us.
 *
 * Two jobs: drop empty $exception payloads (posthogExceptionFilter), and name
 * the element a $rageclick landed on. Assigning a single filter straight to
 * `before_send` is how the next one silently retires the last, so both compose
 * here.
 *
 * Word Tower has carried the product's top rageclick cluster for weeks (113
 * events / 7d across /en/word-tower, /ru/word-tower/daily and
 * /he/word-tower/daily) with no target on any of them, so every fix so far has
 * guessed which control players are mashing — a Delete-button disabled state, a
 * dock exemption — and the cluster did not move. PostHog's rule is purely
 * geometric (three clicks inside ~1s within ~30px), which the letter tray and
 * the full-width BUILD/DROP button trip during ordinary fast play, and nothing
 * in the payload separates that from a dead control.
 *
 * Annotation only: nothing is dropped, renamed or restyled, so the $rageclick
 * series stays comparable across the change and a by-design tap cannot
 * "improve" the metric by reclassification.
 *
 * Reading it back 7 days after deploy:
 *  - `rage_target` other than 'no-elements' on /en/word-tower names the control
 *    to fix; `rage_target_source` says which payload field carried it.
 *  - `rage_target_source='none'` with `rage_el_count=0`, beside an unchanged
 *    $rageclick count, means posthog-js hands before_send no element data for
 *    $rageclick at all and the target must come from another capture path.
 *  - `rage_el_count>0` with a bare tag and no label means element attributes are
 *    stripped, which is a config fix, not a missing target.
 *  - nonzero `rage_by_design` proves `data-feedback-ignore-rage` reaches the
 *    payload at all. It is written at eleven sites in this repo and read
 *    nowhere, and an empty-valued attribute may never be serialized — so any
 *    exemption built on it would be a silent no-op.
 */

import { filterEmptyException } from './posthogExceptionFilter';

interface PostHogEventLike {
  event?: string;
  properties?: Record<string, unknown>;
}

type ElementLike = Record<string, unknown>;

const IGNORE_ATTR = 'data-feedback-ignore-rage';
const LABEL_MAX = 60;

/** Kept apart from `undefined`: this says the annotator ran and found nothing. */
export const NO_ELEMENTS = 'no-elements';

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** `button#drop.bg-neo-lime.shadow-hard` — enough to grep the source for. */
function describeEl(el: ElementLike): string {
  const tag = str(el.tag_name) || 'unknown';
  const id = str(el.attr__id);
  const classes = str(el.attr__class).split(/\s+/).filter(Boolean).slice(0, 2);
  return `${tag}${id ? `#${id}` : ''}${classes.length ? `.${classes.join('.')}` : ''}`;
}

function labelOf(el: ElementLike): string {
  return (
    str(el['attr__aria-label']) ||
    str(el['attr__data-testid']) ||
    str(el.$el_text) ||
    str(el.text) ||
    str(el.attr__title)
  ).slice(0, LABEL_MAX);
}

function annotateRageclick(properties: Record<string, unknown>): void {
  const elements = (Array.isArray(properties.$elements) ? properties.$elements : []).filter(
    (el): el is ElementLike => !!el && typeof el === 'object',
  );
  // The chain's first segment is the clicked element. Read the marker off both
  // shapes: taking the target from $elements while the identity sits in the
  // chain string would report 'no-elements' for an element we do have.
  const segments = str(properties.$elements_chain).split(';').filter(Boolean);
  const target = elements[0];
  const label = target ? labelOf(target) : '';

  properties.rage_target = target ? describeEl(target) : segments[0]?.slice(0, 120) || NO_ELEMENTS;
  properties.rage_target_source = target ? 'elements' : segments.length ? 'chain' : 'none';
  properties.rage_el_count = elements.length || segments.length;
  // Key presence, not truthiness — the marker is written as `=""`.
  properties.rage_by_design =
    elements.some((el) => `attr__${IGNORE_ATTR}` in el) ||
    segments.some((segment) => segment.includes(IGNORE_ATTR));
  if (label) properties.rage_target_label = label;
}

export function filterBeforeSend<T extends PostHogEventLike | null>(event: T): T | null {
  const kept = filterEmptyException(event);
  if (!kept || kept.event !== '$rageclick') return kept;
  try {
    // Cast: a generic T can't take a fresh object through its own key.
    const mutable = kept as unknown as PostHogEventLike;
    mutable.properties ??= {};
    annotateRageclick(mutable.properties);
  } catch {
    /* instrumentation never breaks capture */
  }
  return kept;
}
