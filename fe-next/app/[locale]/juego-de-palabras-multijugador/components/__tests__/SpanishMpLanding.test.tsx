import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroAnimated } from '../HeroAnimated';
import { FeatureGrid } from '../FeatureGrid';
import { StepsSection } from '../StepsSection';
import { ModesShowcase } from '../ModesShowcase';
import { FaqAccordion } from '../FaqAccordion';
import { BottomCTA } from '../BottomCTA';
import { FAQS, FEATURES, MODES, STATS, STEPS, HERO_TILES } from '../../data';

vi.mock('framer-motion', () => {
  type Tag = keyof JSX.IntrinsicElements;
  const passthrough = (Tag: Tag) =>
    function Mock({ children, ...rest }: any) {
      const { initial, animate, exit, transition, whileInView, whileHover, whileTap, viewport, ...domSafe } = rest;
      void initial; void animate; void exit; void transition; void whileInView; void whileHover; void whileTap; void viewport;
      return React.createElement(Tag as string, domSafe, children);
    };
  return {
    m: new Proxy({}, { get: (_t, key) => passthrough(key as Tag) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, fill: _fill, ...rest }: any) => {
    void _fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={typeof src === 'string' ? src : ''} {...rest} />;
  },
}));

describe('Spanish MP landing — composition', () => {
  it('HeroAnimated renders title, all hero tiles, both CTAs and stats', () => {
    render(<HeroAnimated locale="es" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Juega Scrabble online gratis en español');
    HERO_TILES.forEach((tile, i) => {
      // Each tile letter shows up — match by exact text in a span
      const matches = screen.getAllByText(tile.ch);
      expect(matches.length).toBeGreaterThan(0);
      void i;
    });
    expect(screen.getByRole('link', { name: /crear sala/i })).toHaveAttribute('href', '/es/multiplayer');
    expect(screen.getByRole('link', { name: /probar solo/i })).toHaveAttribute('href', '/es/singleplayer?autoStart=bots');
    STATS.forEach((s) => {
      expect(screen.getByText(s.num)).toBeInTheDocument();
    });
  });

  it('FeatureGrid renders every FEATURES entry', () => {
    render(<FeatureGrid />);
    FEATURES.forEach((f) => {
      expect(screen.getByText(f.text)).toBeInTheDocument();
    });
  });

  it('StepsSection renders 3 ordered steps with mascot images', () => {
    render(<StepsSection />);
    STEPS.forEach((s) => {
      expect(screen.getByText(s.title)).toBeInTheDocument();
      expect(screen.getByText(s.n)).toBeInTheDocument();
    });
    // Three mascot images, one per step
    expect(document.querySelectorAll('img').length).toBe(STEPS.length);
  });

  it('ModesShowcase renders all MODES entries', () => {
    render(<ModesShowcase />);
    MODES.forEach((m) => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
      expect(screen.getByText(m.desc)).toBeInTheDocument();
    });
  });

  it('FaqAccordion: first item open by default, click second toggles open and closes first', () => {
    render(<FaqAccordion />);
    const firstButton = screen.getByRole('button', { name: new RegExp(FAQS[0].q.slice(0, 25), 'i') });
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    const secondButton = screen.getByRole('button', { name: new RegExp(FAQS[1].q.slice(0, 25), 'i') });
    fireEvent.click(secondButton);

    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('FaqAccordion: clicking the open item closes it (collapse)', () => {
    render(<FaqAccordion />);
    const firstButton = screen.getByRole('button', { name: new RegExp(FAQS[0].q.slice(0, 25), 'i') });
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('BottomCTA points the primary CTA to the locale multiplayer route', () => {
    render(<BottomCTA locale="es" />);
    expect(screen.getByRole('link', { name: /empezar partida/i })).toHaveAttribute('href', '/es/multiplayer');
    expect(screen.getByRole('link', { name: /desafío diario/i })).toHaveAttribute('href', '/es/daily');
  });
});
