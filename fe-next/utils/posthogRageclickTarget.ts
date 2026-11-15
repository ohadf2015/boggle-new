/**
 * PostHog $rageclick events carry a null target, so the Word Tower cluster
 * (102 clicks/7d) could not be traced to an element or confirmed to honour
 * data-feedback-ignore-rage. A capture-phase listener remembers the last
 * click's element; before_send stamps its descriptor on $rageclick events.
 */

interface PostHogEventLike {
  event?: string;
  properties?: Record<string, unknown>;
}

interface ClickTargetInfo {
  tag: string;
  id: string;
  testid: string;
  cls: string;
  ignored: boolean;
}

let lastTarget: ClickTargetInfo | null = null;

export function describeClickTarget(el: Element | null): ClickTargetInfo | null {
  if (!el) return null;
  const cls = typeof el.className === 'string' ? el.className : '';
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    testid: el.getAttribute('data-testid') || '',
    cls: cls.slice(0, 120),
    ignored: !!el.closest('[data-feedback-ignore-rage]'),
  };
}

export function installRageclickTargetTracker(): () => void {
  if (typeof document === 'undefined') return () => {};
  const onClick = (e: Event) => {
    lastTarget = describeClickTarget(e.target instanceof Element ? e.target : null);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}

export function enrichRageclick<T extends PostHogEventLike | null>(event: T): T {
  if (!event || event.event !== '$rageclick' || !lastTarget) return event;
  event.properties = {
    ...event.properties,
    rage_target_tag: lastTarget.tag,
    rage_target_id: lastTarget.id,
    rage_target_testid: lastTarget.testid,
    rage_target_class: lastTarget.cls,
    rage_target_ignored: lastTarget.ignored,
  };
  return event;
}
