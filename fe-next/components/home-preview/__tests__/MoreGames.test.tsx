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
    expect(imgs.length).toBe(4);
    for (const img of imgs) expect(img.getAttribute('src')).toMatch(/^\/mascot\/stills\/.+\.webp$/);
    const sources = Array.from(container.querySelectorAll('picture source'));
    expect(sources).toHaveLength(4);
    for (const s of sources) expect(s.getAttribute('media')).toBe('(min-width: 1024px)');
  });

  it('given Adventure, then it sits on the main shelf and only Word Tower stays under More', () => {
    render(<MoreGames lang="en" t={(k) => k} />);
    const more = screen.getByTestId('hp-games-more');
    expect(more.tagName).toBe('DETAILS');
    expect(screen.getByTestId('hp-games-more-tower').getAttribute('href')).toBe('/en/word-tower');
    expect(screen.queryByTestId('hp-games-more-adventure')).toBeNull();
    const shelf = screen.getByTestId('hp-games').querySelector('ul')!;
    const shelfHrefs = Array.from(shelf.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(shelfHrefs).toEqual(['/en/blast', '/en/word-craft', '/en/connections', '/en/adventure', '/en/brain']);
  });

  it('given the page already has its own Adventure card, when hideAdventure is set, then no Adventure link is left on the shelf or under More', () => {
    render(<MoreGames lang="en" t={(k) => k} hideAdventure />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/en/adventure');
    expect(hrefs).toEqual(expect.arrayContaining(['/en/blast', '/en/word-tower']));
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

  it('given an admin or beta tester, then Crossword is on the shelf; everyone else does not see it', () => {
    const { unmount } = render(<MoreGames lang="he" t={(k) => k} showCrossword />);
    expect(screen.getByRole('link', { name: /crossword\.name/ }).getAttribute('href')).toBe('/he/crossword');
    unmount();
    render(<MoreGames lang="he" t={(k) => k} />);
    expect(screen.queryByRole('link', { name: /crossword\.name/ })).toBeNull();
  });
});
