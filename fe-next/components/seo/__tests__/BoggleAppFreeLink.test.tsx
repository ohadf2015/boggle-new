import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  BoggleAppFreeLink,
  BOGGLE_APP_FREE_HREF,
  BOGGLE_APP_FREE_QUERY,
} from '../BoggleAppFreeLink';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('BoggleAppFreeLink', () => {
  it('uses the exact query as anchor text into the ranking page', () => {
    render(<BoggleAppFreeLink lead="Skip the store:" />);
    const link = screen.getByRole('link', { name: BOGGLE_APP_FREE_QUERY });
    expect(link).toHaveAttribute('href', BOGGLE_APP_FREE_HREF);
    expect(link.textContent).toBe(BOGGLE_APP_FREE_QUERY);
  });

  it('is mounted on the highest-traffic pages, not as a second URL', () => {
    const home = read('../../landing/LandingSEOSection.tsx');
    const friends = read('../../../app/[locale]/online-word-games-with-friends/page.tsx');
    const es = read('../../../app/[locale]/juego-de-palabras-multijugador/page.tsx');
    const ranking = read('../../../app/[locale]/play-boggle-online-free/page.tsx');
    expect(home).toContain('BoggleAppFreeLink');
    expect(home).toContain("locale === 'en'");
    expect(friends).toContain('BoggleAppFreeLink');
    expect(es).toContain('BoggleAppFreeLink');
    expect(ranking).not.toContain('BoggleAppFreeLink');
    expect(ranking).toContain('boggle app free');
  });
});
