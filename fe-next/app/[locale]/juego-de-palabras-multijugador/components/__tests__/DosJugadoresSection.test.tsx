import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DosJugadoresSection } from '../DosJugadoresSection';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('DosJugadoresSection', () => {
  it('answers the two-player query in its H2 and links the locale multiplayer route', () => {
    render(<DosJugadoresSection locale="es" />);
    expect(
      screen.getByRole('heading', { level: 2, name: /scrabble online 2 jugadores/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abre el modo multijugador/i })).toHaveAttribute(
      'href',
      '/es/multiplayer',
    );
  });
});
