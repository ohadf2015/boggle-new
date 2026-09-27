import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { HighlightedHeading } from '../HighlightedHeading';

/**
 * The education landing pages accent one phrase inside a localized heading. The
 * original inline pattern was:
 *
 *   heading.split(/drill sight words/).map((part, i) => <>{part}{i === 0 && <span>drill sight words</span>}</>)
 *
 * `String.split` on a phrase that is not present returns `[wholeString]`, so
 * `i === 0` stayed true and the ENGLISH phrase was appended onto every
 * translated heading — es/he/ja/sv/ru users read "…título en español" followed
 * by "drill sight words". Accent is decoration; never let it corrupt the copy.
 */
describe('<HighlightedHeading>', () => {
  it('accents the phrase when the heading contains it', () => {
    const { container } = render(
      <HighlightedHeading
        text="Four ways to drill sight words"
        highlight="drill sight words"
        highlightClassName="accent"
      />
    );
    expect(container.textContent).toBe('Four ways to drill sight words');
    expect(container.querySelector('.accent')?.textContent).toBe('drill sight words');
  });

  it('renders a translated heading untouched when the phrase is absent', () => {
    const spanish = 'Cuatro formas de practicar palabras de uso frecuente';
    const { container } = render(
      <HighlightedHeading text={spanish} highlight="drill sight words" highlightClassName="accent" />
    );
    // The regression: this used to render the Spanish heading + "drill sight words".
    expect(container.textContent).toBe(spanish);
    expect(container.textContent).not.toContain('drill sight words');
    expect(container.querySelector('.accent')).toBeNull();
  });

  it('accents only the first occurrence, keeping the rest of the copy intact', () => {
    const { container } = render(
      <HighlightedHeading text="play and play again" highlight="play" highlightClassName="accent" />
    );
    expect(container.textContent).toBe('play and play again');
    expect(container.querySelectorAll('.accent')).toHaveLength(1);
  });

  it('treats the highlight as literal text, not a regex', () => {
    // A phrase with regex metacharacters must not blow up or silently mis-split.
    const { container } = render(
      <HighlightedHeading text="Scores (and streaks) rise" highlight="(and streaks)" highlightClassName="accent" />
    );
    expect(container.textContent).toBe('Scores (and streaks) rise');
    expect(container.querySelector('.accent')?.textContent).toBe('(and streaks)');
  });

  it('renders plain text when no highlight is supplied', () => {
    const { container } = render(<HighlightedHeading text="Just a heading" />);
    expect(container.textContent).toBe('Just a heading');
  });
});
