import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { posthogBeforeSend } from '../posthogBeforeSend';

const COMPONENTS = join(__dirname, '../../components');
const MARKED = 'true';

function rageclick(properties: Record<string, unknown>) {
  return { event: '$rageclick', properties };
}

function elements(marker?: string) {
  return [{ tag_name: 'button', ...(marker === undefined ? {} : { 'attr__data-feedback-ignore-rage': marker }) }];
}

describe('by-design rage taps are relabelled, not counted', () => {
  it('Given a $rageclick on a marked element, When posthog sends it, Then it arrives as rageclick_by_design', () => {
    const out = posthogBeforeSend(rageclick({ $elements: elements(MARKED) }));
    expect(out?.event).toBe('rageclick_by_design');
  });

  it('Given the marker only in $elements_chain, Then it is still relabelled', () => {
    const out = posthogBeforeSend(
      rageclick({ $elements_chain: 'button:attr__data-feedback-ignore-rage="true"nth-child="2"' }),
    );
    expect(out?.event).toBe('rageclick_by_design');
  });

  it('Given an empty-valued marker (experiment-scored surfaces), Then the $rageclick is left alone', () => {
    expect(posthogBeforeSend(rageclick({ $elements: elements('') }))?.event).toBe('$rageclick');
    expect(
      posthogBeforeSend(rageclick({ $elements_chain: 'div:attr__data-feedback-ignore-rage=""' }))?.event,
    ).toBe('$rageclick');
  });

  it('Given an unmarked element, Then the $rageclick is left alone', () => {
    expect(posthogBeforeSend(rageclick({ $elements: elements() }))?.event).toBe('$rageclick');
    expect(posthogBeforeSend(rageclick({}))?.event).toBe('$rageclick');
  });

  it('Given a marked element on any other event, Then the event name is untouched', () => {
    const out = posthogBeforeSend({ event: '$autocapture', properties: { $elements: elements(MARKED) } });
    expect(out?.event).toBe('$autocapture');
  });

  it('Given the exception filter also runs in this slot, Then an empty $exception is still dropped', () => {
    expect(posthogBeforeSend({ event: '$exception', properties: { $exception_list: [] } })).toBeNull();
    expect(posthogBeforeSend(null)).toBeNull();
  });
});

describe('the marker is written where the filter reads it', () => {
  const wordTowerSurfaces = [
    'wordTowerV2/LetterRow.tsx',
    'wordTowerV2/V2Dock.tsx',
    'wordTower/WordTowerVersus.tsx',
  ];

  it.each(wordTowerSurfaces)('Given %s, Then every marker it writes carries the literal "true"', (file) => {
    const src = readFileSync(join(COMPONENTS, file), 'utf8');
    const written = src.match(/data-feedback-ignore-rage=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
    expect(written.length).toBeGreaterThan(0);
    expect(written.filter((m) => !m.includes('"true"'))).toEqual([]);
  });

  // exp-homepage-click-feedback-v1 and exp-wordhunt-clue-shake-v1 are scored on
  // $rageclick for these URLs, so these surfaces must stay countable.
  it.each([
    'landing/fresh/HeroGrid.tsx',
    'board/LetterBoard.tsx',
    'daily/wheel/WheelDisc.tsx',
    'daily/wheel/WheelDiscLetter.tsx',
    'daily/wheel/WheelActionBar.tsx',
    'daily/WordWheelParts.tsx',
  ])('Given %s, Then its marker stays empty-valued so the surface is not exempt', (file) => {
    const src = readFileSync(join(COMPONENTS, file), 'utf8');
    expect(src).not.toMatch(/data-feedback-ignore-rage="true"/);
  });
});
