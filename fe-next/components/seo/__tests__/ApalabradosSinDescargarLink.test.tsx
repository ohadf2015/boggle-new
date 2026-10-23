import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ApalabradosSinDescargarLink,
  SIN_DESCARGAR_HREF,
  SIN_DESCARGAR_QUERY,
} from '../ApalabradosSinDescargarLink';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('ApalabradosSinDescargarLink', () => {
  it('uses the exact query as anchor text into the ranking page', () => {
    render(<ApalabradosSinDescargarLink />);
    const link = screen.getByRole('link', { name: SIN_DESCARGAR_QUERY });
    expect(link).toHaveAttribute('href', SIN_DESCARGAR_HREF);
    expect(link.textContent).toBe(SIN_DESCARGAR_QUERY);
  });

  it('is mounted on the highest-traffic non-target pages', () => {
    const home = read('../../landing/LandingSEOSection.tsx');
    const boggle = read('../../../app/[locale]/play-boggle-online-free/page.tsx');
    const friends = read('../../../app/[locale]/online-word-games-with-friends/page.tsx');
    expect(home).toContain('ApalabradosSinDescargarLink');
    expect(home).toContain("locale === 'es'");
    expect(boggle).toContain('ApalabradosSinDescargarLink');
    expect(friends).toContain('ApalabradosSinDescargarLink');
  });
});
