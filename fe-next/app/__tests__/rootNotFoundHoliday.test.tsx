import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { holidayWindows } from '@/lib/holidays/calendar';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-next-url': '/he/blog/missing' }),
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock('@/components/holidays/eggs/NotFoundLatke', () => ({
  default: (p: { text: string; label: string }) => <i data-latke={p.text} data-label={p.label} />,
}));

import GlobalNotFound from '../not-found';
import { he } from '@/translations/he';

const inlineScripts = (html: string) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.className = '';
});

describe('root 404 during the holidays', () => {
  it('Given a Hebrew visitor on a Hanukkah night, when the root 404 html runs its head scripts, then <html> gets the holiday class', async () => {
    const html = renderToStaticMarkup(await GlobalNotFound());
    const scripts = inlineScripts(html);
    expect(scripts.length).toBeGreaterThan(0);

    const night = holidayWindows(2026).find((w) => w.key === 'hanukkah')!.trackDays[2];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${night}T20:00:00`));
    document.documentElement.lang = 'he';
    for (const s of scripts) new Function(s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'"))();

    expect(document.documentElement.classList.contains('holiday-hanukkah')).toBe(true);
  });

  it('Given a Hebrew visitor, then the root 404 mounts the lost latke with its Hebrew line and label', async () => {
    const html = renderToStaticMarkup(await GlobalNotFound());
    const { lost_latke, lost_latkeLabel } = he.holiday.eggs.permanent;
    expect(html).toContain(`data-latke="${lost_latke}"`);
    expect(html).toContain(`data-label="${lost_latkeLabel}"`);
  });
});
