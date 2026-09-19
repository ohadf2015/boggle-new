import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import Page from '../page';

/**
 * The hero used to ship three equal-weight CTAs (`border-4`, filled/outline,
 * identical size) side by side — no primary/secondary hierarchy, contradicting
 * the "one CTA, unmistakable next action" rule the rest of the education
 * module follows. This locks in that only ONE CTA in the hero row is styled
 * as the primary button; the other two are demoted to secondary text links.
 */
describe('word-games-for-the-classroom hero CTA hierarchy', () => {
  it('has exactly one primary (border-4) CTA in the hero row', async () => {
    const el = (await Page({ params: Promise.resolve({ locale: 'en' }) })) as ReactElement;
    const { container } = render(el);

    const heroCtas = container.querySelector('[data-testid="hero-ctas"]');
    expect(heroCtas).not.toBeNull();
    const links = Array.from(heroCtas!.querySelectorAll('a'));
    expect(links).toHaveLength(3);

    const primary = links.filter((l) => /\bborder-4\b/.test(l.className));
    expect(primary).toHaveLength(1);
    // The demoted two must still route to their original destinations.
    expect(links.map((l) => l.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/en/education/classroom-game', '/en/education/duels', '/en/vocabulary-games-for-middle-school']),
    );
  });
});
