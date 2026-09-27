// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeScrabbleCrossLink } from '../HeScrabbleCrossLink';

describe('HeScrabbleCrossLink', () => {
  it('renders nothing when locale is not he', () => {
    expect(render(<HeScrabbleCrossLink locale="en" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<HeScrabbleCrossLink locale="es" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<HeScrabbleCrossLink locale="sv" anchorVariant="words" />).container.firstChild).toBeNull();
  });

  it('renders link to /he/hebrew-multiplayer-word-game on words variant', () => {
    const { container } = render(<HeScrabbleCrossLink locale="he" anchorVariant="words" />);
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/he/hebrew-multiplayer-word-game');
    // Anchor must contain at least one of the target Hebrew tokens
    expect(link.textContent).toMatch(/סקראבל|סקרבל|מילים|רב משתתפים|שחקנים/);
  });

  it('renders dir="rtl" on the aside element for RTL flow', () => {
    const { container } = render(<HeScrabbleCrossLink locale="he" anchorVariant="words" />);
    const aside = container.querySelector('aside')!;
    expect(aside.getAttribute('dir')).toBe('rtl');
  });

  it('three variants produce three distinct anchor texts', () => {
    const variants = ['words', 'anagram', 'leaderboard'] as const;
    const texts = variants.map(v =>
      render(<HeScrabbleCrossLink locale="he" anchorVariant={v} />).container.querySelector('a')!.textContent
    );
    expect(new Set(texts).size).toBe(3);
  });
});
