import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoreGames } from '../MoreGames';

describe('MoreGames', () => {
  it('given the home, then every mode the old home linked to is still one tap away', () => {
    render(<MoreGames lang="sv" t={(k) => k} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/sv/word-tower', '/sv/blast', '/sv/word-craft', '/sv/connections', '/sv/adventure', '/sv/brain']),
    );
  });

  it('given a phone, then the cards load one still frame each and only desktop gets the animated mascots', () => {
    const { container } = render(<MoreGames lang="he" t={(k) => k} />);
    const imgs = screen.getAllByTestId('hp-game-art') as HTMLImageElement[];
    expect(imgs.length).toBe(3);
    for (const img of imgs) expect(img.getAttribute('src')).toMatch(/^\/mascot\/stills\/.+\.webp$/);
    const sources = Array.from(container.querySelectorAll('picture source'));
    expect(sources).toHaveLength(3);
    for (const s of sources) expect(s.getAttribute('media')).toBe('(min-width: 1024px)');
  });

  it('given the low-finish modes, then Word Tower and Adventure sit under More, not on the main shelf', () => {
    render(<MoreGames lang="en" t={(k) => k} />);
    const more = screen.getByTestId('hp-games-more');
    expect(more.tagName).toBe('DETAILS');
    expect(screen.getByTestId('hp-games-more-tower').getAttribute('href')).toBe('/en/word-tower');
    expect(screen.getByTestId('hp-games-more-adventure').getAttribute('href')).toBe('/en/adventure');
    const shelf = screen.getByTestId('hp-games').querySelector('ul')!;
    const shelfHrefs = Array.from(shelf.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(shelfHrefs).toEqual(['/en/blast', '/en/word-craft', '/en/connections', '/en/brain']);
  });

  it('given every still, then the file exists and stays small', async () => {
    const { statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { container } = render(<MoreGames lang="en" t={(k) => k} />);
    for (const img of Array.from(container.querySelectorAll('img[data-testid="hp-game-art"]'))) {
      const size = statSync(join(process.cwd(), 'public', img.getAttribute('src')!)).size;
      expect(size).toBeLessThan(20_000);
    }
  });
});
