import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadTranslation } from '@/translations/loadTranslation';
import WordTowerV2Page from './page';

// Mock dependencies
vi.mock('./PageClient', () => ({
  WordTowerV2PageClient: () => <div data-testid="page-client">Game Client</div>,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

describe('Word Tower SEO Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verify all locales have seo.wordTowerV2 entries
  it('should have seo.wordTowerV2 entries in all locales', async () => {
    const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
    for (const locale of locales) {
      const t = (await loadTranslation(locale)) as Record<string, any>;
      expect(t?.seo?.wordTowerV2?.title, `missing title for ${locale}`).toBeDefined();
      expect(t?.seo?.wordTowerV2?.description, `missing description for ${locale}`).toBeDefined();
      expect(t?.seo?.wordTowerV2?.title?.length, `title too short for ${locale}`).toBeGreaterThan(10);
      expect(t?.seo?.wordTowerV2?.description?.length, `description too short for ${locale}`).toBeGreaterThan(20);
      expect(t?.seo?.wordTowerV2?.playLabel, `missing playLabel for ${locale}`).toBeDefined();
    }
  });

  it('renders play button with correct href and fires trackGrowthEvent', async () => {
    const component = await WordTowerV2Page({ params: Promise.resolve({ locale: 'en' }) });
    render(component);

    const button = screen.getByRole('link', { name: /play/i });
    expect(button).toHaveAttribute('href', '/en/word-tower');
    expect(button).toHaveAttribute('data-mode-landing-cta', 'word-tower');

    const user = userEvent.setup();
    await user.click(button);

    const { trackGrowthEvent } = await import('@/utils/growthTracking');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mode_landing_play_clicked', {
      mode: 'word-tower',
    });
  });

  it('renders Hebrew label on /he locale', async () => {
    const component = await WordTowerV2Page({ params: Promise.resolve({ locale: 'he' }) });
    render(component);

    const button = screen.getByRole('link', { name: /תשחק|שחק/i });
    expect(button).toHaveAttribute('href', '/he/word-tower');
  });

  it('renders per-locale FAQ with correct structure and JSON-LD', async () => {
    const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
    const dailyPatterns: Record<(typeof locales)[number], RegExp> = {
      en: /daily/i,
      he: /יומי|מידי/,
      sv: /daglig|dail/i,
      ja: /デイリー|毎日|毎/,
      es: /diari|diario/i,
      ru: /ежедневн|дневн/i,
    };

    for (const locale of locales) {
      const component = await WordTowerV2Page({ params: Promise.resolve({ locale }) });
      const { container } = render(component);

      // Extract JSON-LD script
      const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
      const faqScript = scripts.find(s => {
        try {
          const data = JSON.parse(s.textContent || '{}');
          return data['@type'] === 'FAQPage';
        } catch {
          return false;
        }
      });

      expect(faqScript, `FAQPage JSON-LD missing for ${locale}`).toBeDefined();

      const faqData = JSON.parse(faqScript!.textContent || '{}');
      const faqs = faqData.mainEntity || [];

      // Assert 4-5 FAQs per locale
      expect(faqs.length, `${locale} should have 4-5 FAQs, got ${faqs.length}`).toBeGreaterThanOrEqual(4);
      expect(faqs.length).toBeLessThanOrEqual(5);

      // Assert all questions and answers are non-empty
      for (let i = 0; i < faqs.length; i++) {
        expect(faqs[i].name, `${locale} FAQ ${i}: empty question`).toBeTruthy();
        expect(faqs[i].name.length, `${locale} FAQ ${i}: question too short`).toBeGreaterThan(5);
        expect(faqs[i].acceptedAnswer?.text, `${locale} FAQ ${i}: empty answer`).toBeTruthy();
        expect(faqs[i].acceptedAnswer.text.length, `${locale} FAQ ${i}: answer too short`).toBeGreaterThan(20);
      }

      // For non-en locales, verify not just English text
      if (locale !== 'en') {
        const jsonText = JSON.stringify(faqData);
        const hasLocaleScript = dailyPatterns[locale].test(jsonText);
        expect(
          hasLocaleScript,
          `${locale} FAQ should mention daily climb (matches ${dailyPatterns[locale]})`
        ).toBe(true);
      }

      // Check that at least one FAQ mentions daily climb in English
      if (locale === 'en') {
        const textContent = faqs.map((f: any) => `${f.name} ${f.acceptedAnswer.text}`).join(' ');
        expect(textContent.match(/daily/i)).toBeTruthy();
      }

      // Verify first question is visible in rendered content
      const faqSection = container.querySelector('details');
      expect(faqSection, `${locale}: details element should exist for FAQ`).toBeTruthy();
      const summaryText = faqSection?.querySelector('summary')?.textContent || '';
      expect(summaryText.length, `${locale}: first FAQ question should be visible`).toBeGreaterThan(0);
    }
  });
});
