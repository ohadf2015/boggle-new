import { describe, it, expect } from 'vitest';
import { posthogBeforeSend } from '../posthogBeforeSend';

type Ev = { event?: string; properties?: Record<string, unknown> };

const rageclick = (properties: Record<string, unknown>): Ev => ({
  event: '$rageclick',
  properties: { $current_url: 'https://www.lexiclash.live/en/word-tower', ...properties },
});

describe('posthogBeforeSend — by-design rage clicks', () => {
  it('relabels a rage click whose element carries the marker', () => {
    const out = posthogBeforeSend(
      rageclick({ $elements: [{ tag_name: 'button' }, { tag_name: 'div', 'attr__data-feedback-ignore-rage': 'true' }] }),
    );
    expect(out?.event).toBe('rageclick_by_design');
  });

  it('keeps an empty-valued marker counted — those surfaces are still under experiment', () => {
    const out = posthogBeforeSend(
      rageclick({ $elements: [{ tag_name: 'div', 'attr__data-feedback-ignore-rage': '' }] }),
    );
    expect(out?.event).toBe('$rageclick');
  });

  it('relabels when only the serialized element chain carries the marker', () => {
    const out = posthogBeforeSend(
      rageclick({
        $elements_chain:
          'button:nth-child="1"nth-of-type="1";div.bg-neo-navy:attr__data-feedback-ignore-rage="true"nth-child="2"',
      }),
    );
    expect(out?.event).toBe('rageclick_by_design');
  });

  it('leaves a rage click with no marker as $rageclick', () => {
    const out = posthogBeforeSend(rageclick({ $elements: [{ tag_name: 'a', attr__class: 'cta' }] }));
    expect(out?.event).toBe('$rageclick');
  });

  it('does not relabel a click just because the marker is on the page', () => {
    const out = posthogBeforeSend({
      event: '$autocapture',
      properties: { $elements: [{ 'attr__data-feedback-ignore-rage': 'true' }] },
    });
    expect(out?.event).toBe('$autocapture');
  });
});

describe('posthogBeforeSend — exception filtering still applies', () => {
  it('drops an exception with an empty payload', () => {
    expect(posthogBeforeSend({ event: '$exception', properties: { $exception_list: [] } })).toBeNull();
  });

  it('keeps a real exception', () => {
    const event = { event: '$exception', properties: { $exception_list: [{ type: 'TypeError', value: 'x' }] } };
    expect(posthogBeforeSend(event)).toBe(event);
  });

  it('passes null through', () => {
    expect(posthogBeforeSend(null)).toBeNull();
  });
});
