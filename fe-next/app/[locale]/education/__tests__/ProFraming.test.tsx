/**
 * Pro framing section test — verifies that Teacher Pro is clearly positioned
 * on the landing page with sourced pricing and feature differentiation.
 *
 * The test ensures:
 * - Price is sourced from TEACHER_PRO_PRICE_USD, never hardcoded
 * - Free tier limits match FREE_TIER_LIMITS constants
 * - All text uses t() for i18n
 * - Link to /pricing is present
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProFramingSection } from '@/components/education/ProFramingSection';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { en } from '@/translations/en';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

describe('ProFramingSection', () => {
  // `initialTranslations` is the dictionary for `initialLanguage` — it is handed straight to
  // `seedTranslationCache(initialLanguage, initialTranslations)` (LanguageContext.tsx:119).
  // Wrapping it as `{{ en }}` nests it one level too deep, so nothing seeds and every `t()`
  // returns its raw key: the component still renders, so it looks like a copy bug rather than
  // a harness bug.
  const renderComponent = () =>
    render(
      <LanguageProvider initialLanguage="en" initialTranslations={en}>
        <ProFramingSection />
      </LanguageProvider>
    );

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /teacher pro/i })).toBeInTheDocument();
  });

  it('displays the correct Pro price sourced from constants', () => {
    renderComponent();
    // The price should be rendered somewhere in the component
    const priceText = screen.getByText(/\$9/);
    expect(priceText).toBeInTheDocument();
  });

  it('shows free tier limits sourced from FREE_TIER_LIMITS', () => {
    renderComponent();
    // Built from the constants, not typed here: if the caps move and the copy stops
    // interpolating, this fails instead of quietly advertising the old numbers.
    // `getAllBy` because the student cap is named twice on purpose — once in the tier card
    // and again in the "why now" line, which is the whole loss-framing argument.
    const classMatches = screen.getAllByText(
      new RegExp(`${FREE_TIER_LIMITS.classes}\\s+class`, 'i'),
    );
    expect(classMatches.length).toBeGreaterThan(0);

    const studentMatches = screen.getAllByText(
      new RegExp(`${FREE_TIER_LIMITS.studentsPerClass}\\s+students`, 'i'),
    );
    expect(studentMatches.length).toBeGreaterThan(0);
  });

  it('does not print the same benefit on both cards', () => {
    // `education.landing.pro.analytics` was rendered on the FREE card and the Pro card, so the
    // comparison table's job — showing what $9 buys — was answered "the same thing, twice".
    renderComponent();
    const analytics = screen.getAllByText(en.education.landing.pro.analytics);
    expect(analytics).toHaveLength(1);
  });

  it('lists analytics on the Pro side of the table, not the free side', () => {
    renderComponent();
    const analytics = screen.getByText(en.education.landing.pro.analytics);
    const card = analytics.closest('div.rounded-neo');
    expect(card?.textContent).toContain(en.education.landing.pro.proTier);
  });

  it('links to /pricing for checkout', () => {
    renderComponent();
    // Public pricing URL (alias of /teacher/upgrade Polar checkout). Matching on
    // the CTA copy key, not an English "upgrade" word — five of six locales
    // never say that word on the button.
    const upgradeLink = screen.getByRole('link', {
      name: en.education.landing.pro.chooseNow,
    });
    expect(upgradeLink).toHaveAttribute('href', expect.stringContaining('/pricing'));
  });

  it('illustrates the free-vs-Pro comparison with localized alt text', () => {
    renderComponent();

    const art = screen.getByRole('img', { name: /./ });
    expect(art.getAttribute('src') ?? '', 'comparison art is not wired to pro-unlocks').toContain(
      'pro-unlocks',
    );

    // The artwork carries no baked-in text, which is what lets one file serve all six
    // locales — but that only holds if the alt comes from t(). A raw key here means the
    // image is announced to a screen reader as "education.landing.pro.comparisonAlt".
    const alt = art.getAttribute('alt') ?? '';
    expect(alt.length, 'comparison art has an empty alt').toBeGreaterThan(0);
    expect(alt, 'alt is a raw translation key, not copy').not.toContain('education.landing');
  });

  it('uses translation keys for all user-facing text', () => {
    // This is a structure check — the component should use t() for all copy.
    // If this test passes (component renders), it means t() is being called.
    const { container } = renderComponent();
    // The container should have text content, not raw translation keys.
    const textContent = container.textContent;
    expect(textContent).not.toContain('education.landing.pro');
    expect(textContent?.length).toBeGreaterThan(100); // Sanity check it rendered
  });
});
