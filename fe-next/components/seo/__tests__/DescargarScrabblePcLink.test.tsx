import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  DescargarScrabblePcLink,
  DESCARGAR_SCRABBLE_PC_HREF,
  DESCARGAR_SCRABBLE_PC_QUERY,
} from '../DescargarScrabblePcLink';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('DescargarScrabblePcLink', () => {
  it('uses the exact query as anchor text into the ranking page', () => {
    render(<DescargarScrabblePcLink lead="En español, sin instalación:" />);
    const link = screen.getByRole('link', { name: DESCARGAR_SCRABBLE_PC_QUERY });
    expect(link).toHaveAttribute('href', DESCARGAR_SCRABBLE_PC_HREF);
    expect(link.textContent).toBe(DESCARGAR_SCRABBLE_PC_QUERY);
  });

  it('is mounted on the highest-traffic pages, not as a second URL', () => {
    const home = read('../../landing/LandingSEOSection.tsx');
    const friends = read('../../../app/[locale]/online-word-games-with-friends/page.tsx');
    const boggleFree = read('../../../app/[locale]/play-boggle-online-free/page.tsx');
    const ranking = read('../../../app/[locale]/juego-de-palabras-multijugador/page.tsx');
    expect(home).toContain('DescargarScrabblePcLink');
    expect(home).toContain("locale === 'es'");
    expect(friends).toContain('DescargarScrabblePcLink');
    expect(boggleFree).toContain('DescargarScrabblePcLink');
    expect(ranking).not.toContain('DescargarScrabblePcLink');
    expect(ranking).toContain('descargar scrabble en español gratis para pc');
  });
});
