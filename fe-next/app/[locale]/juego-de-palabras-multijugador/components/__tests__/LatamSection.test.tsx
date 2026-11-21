import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LatamSection } from '../LatamSection';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('LatamSection', () => {
  it('answers "juegos de palabras con amigos" in its H2', () => {
    render(<LatamSection locale="es" />);
    expect(screen.getByRole('heading', { level: 2, name: /juegos de palabras con amigos/i })).toBeInTheDocument();
  });

  it('speaks Latin American Spanish and names the countries players come from', () => {
    const { container } = render(<LatamSection locale="es" />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/celular/);
    for (const country of ['México', 'Argentina', 'Colombia']) expect(text).toContain(country);
  });

  it('links to the locale multiplayer and daily routes', () => {
    render(<LatamSection locale="es" />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/es/multiplayer', '/es/daily']));
  });

  it('shows the countries as decorative chips next to the sentence that names them', () => {
    const { container } = render(<LatamSection locale="es" />);
    const chips = container.querySelector('[data-country-chips]');
    expect(chips).toHaveAttribute('aria-hidden', 'true');
    expect(chips?.querySelectorAll('li').length).toBeGreaterThanOrEqual(8);
  });

  it('pictures the room link being shared in a group chat', () => {
    const { container } = render(<LatamSection locale="es" />);
    const chat = container.querySelector('[data-group-chat]');
    expect(chat).toHaveAttribute('aria-hidden', 'true');
    expect(chat).toHaveTextContent('lexiclash.live');
  });
});
