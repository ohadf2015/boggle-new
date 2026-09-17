import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import Page from '../page';

/**
 * Mirror of word-games-for-the-classroom's fix: the hero used to ship three
 * equal-weight `border-4` CTAs with no hierarchy. Only one is now primary.
 */
describe('substitute-teacher-word-games hero CTA hierarchy', () => {
  it('has exactly one primary (border-4) CTA in the hero row', async () => {
    const el = (await Page({ params: Promise.resolve({ locale: 'en' }) })) as ReactElement;
    const { container } = render(el);

    const heroCtas = container.querySelector('[data-testid="hero-ctas"]');
    expect(heroCtas).not.toBeNull();
    const links = Array.from(heroCtas!.querySelectorAll('a'));
    expect(links).toHaveLength(3);

    const primary = links.filter((l) => /\bborder-4\b/.test(l.className));
    expect(primary).toHaveLength(1);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/en/education/classroom-game', '/en/word-games-for-the-classroom', '/en/education/duels']),
    );
  });
});
