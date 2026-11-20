import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/local', () => ({ default: () => ({ className: '', variable: '', style: {} }) }));
vi.mock('next/font/google', () => new Proxy({}, { get: () => () => ({ className: '', variable: '', style: {} }) }));
import { generateMetadata as multiplayerMeta } from '@/app/[locale]/multiplayer/layout';
import { generateMetadata as localeMeta } from '@/app/[locale]/layout';

const ogUrl = (m: { openGraph?: { images?: unknown } | null }) => {
  const imgs = m.openGraph?.images as Array<{ url: string } | string>;
  const first = imgs[0];
  return typeof first === 'string' ? first : first.url;
};

describe('locale share image', () => {
  it.each([
    ['locale root', localeMeta],
    ['multiplayer', multiplayerMeta],
  ])('%s uses the Russian card for ru', async (_name, gen) => {
    const meta = await gen({ params: Promise.resolve({ locale: 'ru' }) } as never);
    expect(ogUrl(meta as never)).toMatch(/og-image-ru\.webp\?v=\d+$/);
  });
});
