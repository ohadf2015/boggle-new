import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }), usePathname: () => '/sv/swedish-multiplayer-word-game' }));

import Page from './page';

describe('Swedish multiplayer landing hero', () => {
  it('offers a play button before the first section heading', async () => {
    const { container } = render(await Page({ params: Promise.resolve({ locale: 'sv' }) }));
    const h1 = container.querySelector('h1')!;
    const firstH2 = container.querySelector('h2')!;
    const cta = [...container.querySelectorAll('a[href="/sv/multiplayer"]')].find(
      (a) =>
        h1.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING &&
        a.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(cta?.textContent).toMatch(/Spela/);
  });
});
