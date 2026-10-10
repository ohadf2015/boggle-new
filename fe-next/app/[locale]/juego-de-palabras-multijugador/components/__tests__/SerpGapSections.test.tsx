import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SerpGapSections } from '../SerpGapSections';
import { EXAMPLE_TOTAL_POINTS, EXAMPLE_WORDS, LENGTH_SCORES, SIMILAR_GAMES, TIPS } from '../../data';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('SerpGapSections — competitor heading gaps + unique round table', () => {
  it('renders every SERP-gap H2 we were missing vs minijuegos/solitaireparadise', () => {
    render(<SerpGapSections locale="es" />);
    expect(
      screen.getByRole('heading', { level: 2, name: /cómo jugar a scrabble online en español multijugador/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /cuáles son las características del juego/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ejemplo de ronda real/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /puntuación: longitud/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /consejos y trucos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /cómo se validan las palabras/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /qué juegos son parecidos a scrabble online/i }),
    ).toBeInTheDocument();
  });

  it('renders the worked 4×4 example with every scored word and the live total', () => {
    render(<SerpGapSections locale="es" />);
    EXAMPLE_WORDS.forEach((w) => {
      expect(screen.getByRole('rowheader', { name: w.word })).toBeInTheDocument();
    });
    expect(screen.getAllByText(String(EXAMPLE_TOTAL_POINTS)).length).toBeGreaterThan(0);
  });

  it('renders the length-scoring table from Classic rules', () => {
    render(<SerpGapSections locale="es" />);
    const tables = screen.getAllByRole('table');
    const scoring = tables[1];
    LENGTH_SCORES.forEach((row) => {
      expect(within(scoring).getByRole('rowheader', { name: row.letters })).toBeInTheDocument();
    });
  });

  it('lists every tip and similar-game heading', () => {
    render(<SerpGapSections locale="es" />);
    TIPS.forEach((t) => {
      expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument();
    });
    SIMILAR_GAMES.forEach((g) => {
      expect(screen.getByRole('heading', { name: g.name })).toBeInTheDocument();
    });
  });

  it('uses the exact target query in body copy', () => {
    render(<SerpGapSections locale="es" />);
    expect(screen.getByText(/scrabble online español multijugador/i)).toBeInTheDocument();
  });
});
