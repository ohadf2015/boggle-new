import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SinDescargarSection } from '../SinDescargarSection';
import { ES_DICT_FLOOR } from '../../data';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('SinDescargarSection — GR #3729 heading gaps', () => {
  it('renders the exact query as H2 and the competitor headings we lacked', () => {
    render(<SinDescargarSection locale="es" />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'apalabrados online gratis sin descargar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /requisitos: cero descarga/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /modos de apalabrados, sin instalar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /jugar en el ordenador sin descargar/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /idiomas y puntos, sin la app/i })).toBeInTheDocument();
  });

  it('publishes the measured dictionary floor and 0 MB, not a store size', () => {
    render(<SinDescargarSection locale="es" />);
    const table = screen.getByRole('table', { name: /0 MB y el suelo del diccionario/i });
    expect(within(table).getByRole('cell', { name: '0 MB' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: `${ES_DICT_FLOOR}+` })).toBeInTheDocument();
    expect(screen.queryByText(/158/)).not.toBeInTheDocument();
  });

  it('maps Apalabrados modes without inventing a Color clone', () => {
    render(<SinDescargarSection locale="es" />);
    expect(screen.getByRole('rowheader', { name: 'Color / Casual' })).toBeInTheDocument();
    expect(screen.getByText(/No los clonamos/)).toBeInTheDocument();
  });

  it('links the computer FAQ to the Spanish multiplayer room', () => {
    render(<SinDescargarSection locale="es" />);
    expect(screen.getByRole('link', { name: /sala multijugador/i })).toHaveAttribute(
      'href',
      '/es/multiplayer',
    );
  });
});
