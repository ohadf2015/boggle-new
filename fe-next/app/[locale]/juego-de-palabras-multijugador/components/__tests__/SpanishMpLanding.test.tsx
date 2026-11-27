import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroAnimated } from '../HeroAnimated';
import { FeatureGrid } from '../FeatureGrid';
import { StepsSection } from '../StepsSection';
import { ModesShowcase } from '../ModesShowcase';
import { FaqAccordion } from '../FaqAccordion';
import { BottomCTA } from '../BottomCTA';
import { FAQS, FEATURES, MODES, STATS, STEPS } from '../../data';

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
  it('HeroAnimated renders title, both CTAs and stats', () => {
    render(<HeroAnimated locale="es" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Como el Scrabble en español, pero online, gratis y sin registro');
    expect(screen.getByText('¿Buscas scrabble en español online, gratis y sin registrarte?')).toBeInTheDocument();
    expect(screen.getAllByText(/sin email/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /jugar ahora/i })).toHaveAttribute('href', '/es/multiplayer');
    expect(screen.getByRole('link', { name: /probar solo/i })).toHaveAttribute('href', '/es/quick-play');
    STATS.forEach((s) => {
      expect(screen.getByText(s.num)).toBeInTheDocument();
    });
  });

  it('FeatureGrid renders every FEATURES entry', () => {
    render(<FeatureGrid />);
    FEATURES.forEach((f) => {
      expect(screen.getByText(f)).toBeInTheDocument();
    });
  });

  it('StepsSection renders 3 ordered steps', () => {
    render(<StepsSection />);
    expect(screen.getAllByRole('listitem')).toHaveLength(STEPS.length);
    STEPS.forEach((s) => {
      expect(screen.getByText(s.title)).toBeInTheDocument();
      expect(screen.getByText(s.body)).toBeInTheDocument();
    });
  });

  it('ModesShowcase renders all MODES entries', () => {
    render(<ModesShowcase />);
    MODES.forEach((m) => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
      expect(screen.getByText(m.desc)).toBeInTheDocument();
    });
  });

  it('FaqAccordion renders every question with its answer in the DOM', () => {
    const { container } = render(<FaqAccordion />);
    expect(container.querySelectorAll('details')).toHaveLength(FAQS.length);
    const [first, second] = container.querySelectorAll('details');
    expect(first).toHaveAttribute('open');
    expect(second).not.toHaveAttribute('open');
    expect(second.getAttribute('name')).toBe(first.getAttribute('name'));
    FAQS.forEach((f) => {
      expect(screen.getByText(f.q)).toBeInTheDocument();
      expect(screen.getByText(f.a)).toBeInTheDocument();
    });
  });

  it('BottomCTA points the primary CTA to the locale multiplayer route', () => {
    render(<BottomCTA locale="es" />);
    expect(screen.getByRole('link', { name: /empezar partida/i })).toHaveAttribute('href', '/es/multiplayer');
    expect(screen.getByRole('link', { name: /desafío diario/i })).toHaveAttribute('href', '/es/daily');
  });
});
