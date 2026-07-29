// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SvScrabbleCrossLink } from '../SvScrabbleCrossLink';

describe('SvScrabbleCrossLink', () => {
  it('renders nothing when locale is not sv', () => {
    expect(render(<SvScrabbleCrossLink locale="en" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<SvScrabbleCrossLink locale="es" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<SvScrabbleCrossLink locale="he" anchorVariant="words" />).container.firstChild).toBeNull();
  });

  it('renders link to /sv/swedish-multiplayer-word-game on words variant', () => {
    const { container } = render(<SvScrabbleCrossLink locale="sv" anchorVariant="words" />);
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/sv/swedish-multiplayer-word-game');
    expect(link.textContent).toMatch(/Scrabble.*svenska|ordspel/i);
  });

  it('renders different anchors for anagram and leaderboard variants', () => {
    const a = render(<SvScrabbleCrossLink locale="sv" anchorVariant="anagram" />).container.querySelector('a')!.textContent;
    const l = render(<SvScrabbleCrossLink locale="sv" anchorVariant="leaderboard" />).container.querySelector('a')!.textContent;
    expect(a).not.toBe(l);
    expect(a).toMatch(/Scrabble|alternativ/i);
  });

  it('three variants produce three distinct anchor texts', () => {
    const variants = ['words', 'anagram', 'leaderboard'] as const;
    const texts = variants.map(v =>
      render(<SvScrabbleCrossLink locale="sv" anchorVariant={v} />).container.querySelector('a')!.textContent
    );
    expect(new Set(texts).size).toBe(3);
  });
});
