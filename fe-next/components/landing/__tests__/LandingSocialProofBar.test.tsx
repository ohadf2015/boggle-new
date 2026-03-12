import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingSocialProofBar } from '../LandingSocialProofBar';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

jest.mock('framer-motion', () => {
  const motionObj = new Proxy({}, { get: (_, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) });
  const mockMotionValue = (init: number) => ({ get: () => init, set: () => {}, on: () => () => {} });
  return {
    motion: motionObj,
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: mockMotionValue,
    useSpring: (v: any) => v,
    useInView: () => true,
    animate: () => ({ stop: () => {} }),
  };
});

describe('LandingSocialProofBar', () => {
  it('renders game modes and languages pills always', () => {
    render(<LandingSocialProofBar activePlayers={0} gamesToday={0} gameModes={5} languages={4} />);
    expect(screen.getByText('landing.gameModes')).toBeInTheDocument();
    expect(screen.getByText('landing.languages')).toBeInTheDocument();
  });

  it('shows active players pill only when > 10', () => {
    render(<LandingSocialProofBar activePlayers={50} gamesToday={0} gameModes={5} languages={4} />);
    expect(screen.getByText('landing.activePlayers')).toBeInTheDocument();
  });

  it('hides active players pill when <= 10', () => {
    render(<LandingSocialProofBar activePlayers={5} gamesToday={0} gameModes={5} languages={4} />);
    expect(screen.queryByText('landing.activePlayers')).not.toBeInTheDocument();
  });

  it('shows games today pill only when > 100', () => {
    render(<LandingSocialProofBar activePlayers={0} gamesToday={200} gameModes={5} languages={4} />);
    expect(screen.getByText('landing.gamesToday')).toBeInTheDocument();
  });

  it('hides games today pill when <= 100', () => {
    render(<LandingSocialProofBar activePlayers={0} gamesToday={50} gameModes={5} languages={4} />);
    expect(screen.queryByText('landing.gamesToday')).not.toBeInTheDocument();
  });

  it('renders animated numbers', () => {
    render(<LandingSocialProofBar activePlayers={100} gamesToday={0} gameModes={5} languages={4} />);
    // AnimatedNumber renders span with initial text "0"
    const spans = screen.getAllByText('0');
    expect(spans.length).toBeGreaterThanOrEqual(2);
  });
});
