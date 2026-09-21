// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page from './page';

describe('education main page', () => {
  describe('non-English locale rendering', () => {
    it('renders Spanish locale without error', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      expect(container).toBeTruthy();
    });
  });

  /**
   * The resource-link block (~19 SEO cards under three headings) was worth
   * 5-6 of the landing's 17+ screens at 390px, between a first-time teacher
   * and the FAQ. It collapses into a native <details>: closed by default, one
   * row tall, and every link still ships in the server HTML for crawlers —
   * the same reason EducationFAQ uses <details>.
   */
  describe('resource links', () => {
    async function resources() {
      const { container } = render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
      const details = container.querySelector('details[data-testid="education-resources"]');
      return { container, details };
    }

    it('collapses behind a closed <details>', async () => {
      const { details } = await resources();
      expect(details).not.toBeNull();
      expect(details?.hasAttribute('open')).toBe(false);
    });

    it('keeps every resource link in the markup for crawlers', async () => {
      const { details } = await resources();
      const hrefs = [...(details?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
      for (const slug of ['duels', 'esl-word-games', 'vocabulary-games-classroom', 'for-schools']) {
        expect(hrefs).toContain(`/en/education/${slug}`);
      }
    });

    it('labels the toggle with the section heading', async () => {
      const { details } = await resources();
      expect(details?.querySelector('summary h2')?.textContent?.trim()).toBeTruthy();
    });
  });

  /**
   * The hub's SEO card (title, description, features, a second FAQ) rendered
   * fully open at the very bottom — 2.2 screens at 390px, after the page's own
   * FAQ. GamePageSeoContent already has a `collapsible` mode built for this;
   * the content stays in the server HTML either way.
   */
  it('collapses the SEO card behind a closed <details>, content still in the HTML', async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
    const card = [...container.querySelectorAll('details')].find((d) =>
      d.textContent?.includes('Free Vocabulary Games for the Classroom'),
    );
    expect(card).toBeDefined();
    expect(card?.hasAttribute('open')).toBe(false);
  });
});
