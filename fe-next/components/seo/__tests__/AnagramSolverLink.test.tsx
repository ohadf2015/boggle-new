import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AnagramSolverLink,
  ANAGRAM_SOLVER_HREF,
  ANAGRAM_SOLVER_QUERY,
} from '../AnagramSolverLink';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('AnagramSolverLink (GR #25983 — "solver" queries up 207x)', () => {
  it('uses the exact query as anchor text into the solver page Google already ranks', () => {
    render(<AnagramSolverLink lead="Stuck on a rack?" />);
    const link = screen.getByRole('link', { name: ANAGRAM_SOLVER_QUERY });
    expect(link).toHaveAttribute('href', ANAGRAM_SOLVER_HREF);
    expect(link.textContent).toBe(ANAGRAM_SOLVER_QUERY);
  });

  it('is mounted on the homepage and the two most-visited EN pages', () => {
    const home = read('../../landing/LandingSEOSection.tsx');
    const friends = read('../../../app/[locale]/online-word-games-with-friends/page.tsx');
    const ranking = read('../../../app/[locale]/play-boggle-online-free/page.tsx');
    expect(home).toContain('AnagramSolverLink');
    expect(home).toContain("locale === 'en'");
    expect(friends).toContain('AnagramSolverLink');
    expect(ranking).toContain('AnagramSolverLink');
  });

  it('points at /en/tools/word-solver — the URL that owns the solver impressions', () => {
    expect(ANAGRAM_SOLVER_HREF).toBe('/en/tools/word-solver');
  });
});
