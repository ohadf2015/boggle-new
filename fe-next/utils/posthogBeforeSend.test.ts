import { describe, it, expect } from 'vitest';
import { filterBeforeSend, NO_ELEMENTS } from './posthogBeforeSend';

const IGNORE_ATTR = 'attr__data-feedback-ignore-rage';

function rageclick(properties: Record<string, unknown>) {
  return { event: '$rageclick', properties };
}

describe('filterBeforeSend', () => {
  it('still drops an empty $exception (the exception filter is not retired)', () => {
    expect(filterBeforeSend({ event: '$exception', properties: { $exception_list: [] } })).toBeNull();
  });

  it('leaves every other event untouched', () => {
    const event = { event: 'game_started', properties: { mode: 'word-tower' } };
    expect(filterBeforeSend(event)).toBe(event);
  });

  it('names the clicked control from $elements', () => {
    const result = filterBeforeSend(
      rageclick({
        $current_url: 'https://www.lexiclash.live/en/word-tower',
        $elements: [
          { tag_name: 'button', attr__id: 'drop', attr__class: 'bg-neo-lime shadow-hard px-4', 'attr__aria-label': 'Drop' },
          { tag_name: 'div', attr__class: 'wt-dock' },
        ],
      }),
    );
    expect(result?.properties?.rage_target).toBe('button#drop.bg-neo-lime.shadow-hard');
    expect(result?.properties?.rage_target_label).toBe('Drop');
    expect(result?.properties?.rage_target_source).toBe('elements');
    expect(result?.properties?.rage_el_count).toBe(2);
  });

  it('falls back to the serialized chain when $elements is absent', () => {
    const result = filterBeforeSend(
      rageclick({ $elements_chain: 'button.wt-tile:nth-child="3";div.wt-tray' }),
    );
    expect(result?.properties?.rage_target).toBe('button.wt-tile:nth-child="3"');
    expect(result?.properties?.rage_target_source).toBe('chain');
    expect(result?.properties?.rage_el_count).toBe(2);
  });

  it('reports no element data instead of guessing', () => {
    const result = filterBeforeSend(rageclick({ $current_url: '/en/word-tower' }));
    expect(result?.properties?.rage_target).toBe(NO_ELEMENTS);
    expect(result?.properties?.rage_target_source).toBe('none');
    expect(result?.properties?.rage_el_count).toBe(0);
  });

  it('reads data-feedback-ignore-rage as present even when its value is empty', () => {
    const fromElement = filterBeforeSend(
      rageclick({ $elements: [{ tag_name: 'button', [IGNORE_ATTR]: '' }] }),
    );
    expect(fromElement?.properties?.rage_by_design).toBe(true);

    const fromChain = filterBeforeSend(
      rageclick({ $elements_chain: 'button.wt-tile:data-feedback-ignore-rage="";div' }),
    );
    expect(fromChain?.properties?.rage_by_design).toBe(true);
  });

  it('annotates only — a by-design rageclick is neither dropped nor renamed', () => {
    const result = filterBeforeSend(
      rageclick({ $elements: [{ tag_name: 'button', [IGNORE_ATTR]: '' }] }),
    );
    expect(result?.event).toBe('$rageclick');
    expect(result?.properties?.rage_by_design).toBe(true);
  });

  it('marks a rageclick with no marker anywhere as not by design', () => {
    const result = filterBeforeSend(rageclick({ $elements: [{ tag_name: 'button' }] }));
    expect(result?.properties?.rage_by_design).toBe(false);
  });

  it('survives a malformed payload', () => {
    const result = filterBeforeSend(
      rageclick({ $elements: [null, 'nope', { tag_name: 42 }], $elements_chain: 7 }),
    );
    expect(result?.event).toBe('$rageclick');
    expect(result?.properties?.rage_target).toBe('unknown');
    expect(filterBeforeSend(null)).toBeNull();
  });
});
