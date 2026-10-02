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
   * #1155 made the GEO answer a visible H2 (never collapsed); that stays. The FAQ used to
   * render twice (client accordion + SEO heading list, overlapping questions). Now it renders
   * once, server-side, from the same items as the FAQPage JSON-LD: answers ship in the HTML.
   */
  it('ships the GEO answer visible and each FAQ answer once in the server HTML', async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
    const how = container.querySelector('section#how-it-works');
    expect(how?.querySelector('h2')?.textContent).toContain('How do I run a free vocabulary game in class');
    expect(how?.closest('details')).toBeNull();
    const faqs = container.querySelectorAll('section#faq');
    expect(faqs).toHaveLength(1);
    expect(faqs[0].textContent).toContain('Do students need an account to play?');
    expect(faqs[0].textContent).toContain('Students join a classroom session with a 6-character code');
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script').forEach((el) => el.remove());
    const text = clone.textContent ?? '';
    expect(text.split('Do students need an account to play?').length - 1).toBe(1);
  });
});
