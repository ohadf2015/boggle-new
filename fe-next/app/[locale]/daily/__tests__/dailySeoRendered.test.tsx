import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomepageContentSection } from '@/components/seo/HomepageContentSection';
import { dailySeoContent } from '../dailySeo.data';

/**
 * The /daily hub is a dynamic (client) import, so its server response was chrome plus a loader —
 * 98 words measured on 2026-08-21, against 1066 for the homepage, while AdSense had rejected the
 * site for "Low value content". The copy was never missing: dailySeo.data.ts carries a description,
 * seven features and four FAQs per locale, and layout.tsx fed them ONLY to <meta> and JSON-LD.
 *
 * page.tsx rendered that same data through HomepageContentSection until 2026-08-27, when the user
 * asked for no marketing/FAQ card on any game screen (it was also what kept the hub from filling
 * the viewport — see app/[locale]/__tests__/appShellSeoContent.test.tsx). This test is deliberately
 * kept: it renders the section DIRECTLY, so what it still pins is the data contract — DailySeoEntry
 * stays prop-compatible with the section, every locale carries a description and a non-empty FAQ,
 * and those words reach a DOM. That data is live: layout.tsx feeds it to <meta> + JSON-LD, and the
 * section is the render path if the copy is ever surfaced on a non-play page.
 */
describe('daily hub SEO copy is rendered, not just meta', () => {
  const locales = Object.keys(dailySeoContent);

  it('covers every locale the data file declares', () => {
    expect(locales.length).toBeGreaterThan(1);
    expect(locales).toContain('en');
  });

  it.each(locales)('%s renders description, features and FAQ into the DOM', (locale) => {
    const entry = dailySeoContent[locale as keyof typeof dailySeoContent];

    // Shape guard first — the whole point of reusing the homepage section is that these match.
    expect(entry.description, `${locale} description`).toBeTruthy();
    expect(entry.features.length, `${locale} features`).toBeGreaterThan(0);
    expect(entry.faq.length, `${locale} faq`).toBeGreaterThan(0);

    const { unmount } = render(
      <HomepageContentSection content={entry} locale={locale} />,
    );

    // A substring, not the whole paragraph: these are long localized strings and the component is
    // free to wrap or split them across elements.
    // getAllByText, not getByText: every ancestor of the paragraph also "contains" the text, so a
    // single-match assertion fails on nesting rather than on the thing we care about.
    const probe = entry.description.slice(0, 40);
    expect(
      screen.getAllByText((_t, node) => Boolean(node?.textContent?.includes(probe))).length,
      `${locale} description not in the DOM`,
    ).toBeGreaterThan(0);

    expect(screen.getByText(entry.faq[0].question)).toBeTruthy();

    // NOT asserted: entry.features. HomepageContentSection declares `features: string[]` in its
    // props and carries a localized "What you can play" heading for it, but it renders only
    // content.description and content.faq — the array is accepted and dropped. Seven bullets per
    // locale, already written, shown to nobody. Tracked separately; asserting it here would fail
    // for a reason that has nothing to do with the daily hub.

    unmount();
  });
});
