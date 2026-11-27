import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import Page from './page';

const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('online word games with friends hero', () => {
  it('shows the play buttons and the friends artwork before the first section heading', async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
    const firstH2 = container.querySelector('h2')!;
    const cta = container.querySelector('a[href="/en/multiplayer"]')!;
    const art = container.querySelector('img[src="/landing/kit/lp-friends.webp"]');
    expect(art).not.toBeNull();
    expect(before(cta, art!)).toBe(true);
    expect(before(art!, firstH2)).toBe(true);
  });
});
