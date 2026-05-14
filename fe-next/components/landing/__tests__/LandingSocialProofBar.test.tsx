import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingSocialProofBar } from '../LandingSocialProofBar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => {
  const motionObj = new Proxy({}, { get: (_, tag) => ({ children, ...props }: any) => React.createElement(tag as string, props, children) });
  const mockMotionValue = (init: number) => ({ get: () => init, set: () => {}, on: () => () => {} });
  return {
    m: motionObj,
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: mockMotionValue,
    useSpring: (v: any) => v,
    useInView: () => true,
    animate: () => ({ stop: () => {} }),
  };
});

describe('LandingSocialProofBar', () => {
  it('renders nothing when no dynamic stats pass threshold', () => {
    const { container } = render(<LandingSocialProofBar activePlayers={0} gamesToday={0} gameModes={4} languages={4} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows active players pill only when > 10', () => {
    render(<LandingSocialProofBar activePlayers={50} gamesToday={0} gameModes={4} languages={4} />);
    expect(screen.getByText('landing.activePlayers')).toBeInTheDocument();
  });

  it('hides active players pill when <= 10', () => {
    render(<LandingSocialProofBar activePlayers={5} gamesToday={0} gameModes={4} languages={4} />);
    expect(screen.queryByText('landing.activePlayers')).not.toBeInTheDocument();
  });

  it('shows games today pill only when > 100', () => {
    render(<LandingSocialProofBar activePlayers={0} gamesToday={200} gameModes={4} languages={4} />);
    expect(screen.getByText('landing.gamesToday')).toBeInTheDocument();
  });

  it('hides games today pill when <= 100', () => {
    render(<LandingSocialProofBar activePlayers={0} gamesToday={50} gameModes={4} languages={4} />);
    expect(screen.queryByText('landing.gamesToday')).not.toBeInTheDocument();
  });

  it('shows both pills when both pass threshold', () => {
    render(<LandingSocialProofBar activePlayers={50} gamesToday={200} gameModes={4} languages={4} />);
    expect(screen.getByText('landing.activePlayers')).toBeInTheDocument();
    expect(screen.getByText('landing.gamesToday')).toBeInTheDocument();
  });
});
