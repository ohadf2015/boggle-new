/**
 * /[locale]/education/lessons has no route — lessons live at
 * /[locale]/student/lessons. Real visitors still open the /education/ shape
 * directly (Growth Radar rec 11669: 2 direct visitors in 28 days got a 404),
 * so both the index and per-lesson URLs 308 to the live lesson pages.
 */
import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('@posthog/nextjs-config', () => ({
  withPostHogConfig: (config: unknown) => config,
}));

const nextConfig = (await import('../../next.config.mjs')).default;

type Rule = { source: string; destination: string; permanent?: boolean };

const redirects = (await nextConfig.redirects()) as Rule[];
const find = (source: string) => redirects.find((r) => r.source === source);

describe('/education/lessons → /student/lessons', () => {
  it.each([
    ['/:locale(en|he|sv|ja|es|ru)/education/lessons', '/:locale/student/lessons'],
    ['/:locale(en|he|sv|ja|es|ru)/education/lessons/:path+', '/:locale/student/lessons/:path+'],
  ])('permanently redirects %s -> %s', (source, destination) => {
    expect(find(source)).toMatchObject({ destination, permanent: true });
  });

  it('targets a route that exists and does not shadow a real education page', () => {
    const app = resolve(__dirname, '../../app/[locale]');
    expect(existsSync(`${app}/student/lessons/page.tsx`)).toBe(true);
    expect(existsSync(`${app}/student/lessons/[id]/page.tsx`)).toBe(true);
    expect(existsSync(`${app}/education/lessons`)).toBe(false);
  });
});
