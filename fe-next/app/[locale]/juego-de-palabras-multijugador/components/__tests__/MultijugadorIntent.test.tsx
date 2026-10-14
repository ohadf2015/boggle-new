import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultijugadorIntent } from '../MultijugadorIntent';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('MultijugadorIntent', () => {
  it('answers the exact GSC query in H2 and body, and links the ES multiplayer route', () => {
    render(<MultijugadorIntent locale="es" />);
    expect(
      screen.getByRole('heading', { level: 2, name: /qué es scrabble online español multijugador/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/scrabble online español multijugador/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /abre el modo multijugador/i })).toHaveAttribute(
      'href',
      '/es/multiplayer',
    );
  });
});
