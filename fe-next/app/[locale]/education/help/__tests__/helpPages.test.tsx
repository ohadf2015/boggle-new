// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

import HelpHomePage, { generateMetadata as homeMetadata } from '../page';
import HelpArticlePage, { generateStaticParams, generateMetadata as articleMetadata } from '../[slug]/page';
import { HELP_ARTICLES } from '@/components/education/help/helpRegistry';

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });
const articleParams = (locale: string, slug: string) => ({ params: Promise.resolve({ locale, slug }) });

function jsonLdTypes(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
    (s) => JSON.parse(s.textContent ?? '{}')['@type'],
  );
}

describe('help center home', () => {
  it('renders the search, every topic and a link to every guide', async () => {
    const { container, getByRole } = render(await HelpHomePage(params('en')));
    expect(getByRole('heading', { level: 1 })).toBeTruthy();
    expect(container.querySelector('input[type="search"]')).not.toBeNull();
    for (const a of HELP_ARTICLES) {
      expect(container.querySelector(`a[href="/en/education/help/${a.slug}"]`), a.slug).not.toBeNull();
    }
    expect(jsonLdTypes(container)).toEqual(expect.arrayContaining(['FAQPage', 'BreadcrumbList']));
    expect(container.querySelector('a[href="/en/teacher"]')).not.toBeNull();
  });

  it('renders Hebrew right-to-left content from the Hebrew catalogue', async () => {
    const { getByRole } = render(await HelpHomePage(params('he')));
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(/[֐-׿]/);
  });

  it('is indexable with five-locale hreflang', async () => {
    const meta = await homeMetadata(params('ja'));
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/ja/education/help');
    expect(Object.keys(meta.alternates?.languages ?? {})).not.toContain('ru');
  });
});

describe('help article page', () => {
  it('pre-renders every guide in the five locales only', async () => {
    const all = await generateStaticParams();
    expect(all).toHaveLength(5 * HELP_ARTICLES.length);
    expect(all.some((p) => p.locale === 'ru')).toBe(false);
  });

  it('renders numbered steps, the real button labels, HowTo JSON-LD and a next step', async () => {
    const { container } = render(await HelpArticlePage(articleParams('en', 'start-a-live-game')));
    expect(container.querySelectorAll('ol li[id^="step-"]').length).toBeGreaterThan(2);
    expect(container.querySelector('[data-ui-label="teacher.playNow.goLive"]')?.textContent).toBe('Go live');
    expect(jsonLdTypes(container)).toEqual(expect.arrayContaining(['HowTo', 'TechArticle', 'BreadcrumbList']));
    expect(container.querySelector('[data-help-next] a[href="/en/education/classroom-game"]')).not.toBeNull();
  });

  it('shows the Japanese label for the same button on the Japanese page', async () => {
    const { container } = render(await HelpArticlePage(articleParams('ja', 'start-a-live-game')));
    expect(container.querySelector('[data-ui-label="teacher.playNow.goLive"]')?.textContent).toBe('スタート');
  });

  it('skips HowTo on guides that are not a procedure', async () => {
    const { container } = render(await HelpArticlePage(articleParams('en', 'student-privacy')));
    expect(jsonLdTypes(container)).not.toContain('HowTo');
  });

  it('404s for an unknown guide or an unsupported locale', async () => {
    await expect(HelpArticlePage(articleParams('en', 'nope'))).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(HelpArticlePage(articleParams('ru', 'start-a-live-game'))).rejects.toThrow('NEXT_NOT_FOUND');
    const meta = await articleMetadata(articleParams('en', 'create-a-class'));
    expect(String(meta.title)).toContain('Create a class');
  });
});
