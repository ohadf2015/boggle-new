import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { getContent } from '../content';

const nav = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: nav.locale }) }));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/AutoHideHeader', () => ({ AutoHideHeader: () => null }));

import Page from '../page';

describe('word solver page', () => {
  it.each(['en', 'he'])('shows each FAQ question and how-to step once (%s)', async (locale) => {
    nav.locale = locale;
    const { container } = render(await Page({ params: Promise.resolve({ locale }) }));
    const visible = container.cloneNode(true) as HTMLElement;
    visible.querySelectorAll('script').forEach((s) => s.remove());
    const text = visible.textContent ?? '';
    const content = getContent(locale);
    const count = (s: string) => text.split(s).length - 1;
    for (const faq of content.faqs) expect(count(faq.question), faq.question).toBe(1);
    for (const step of content.howToSteps) expect(count(step), step).toBe(1);
  });
});
