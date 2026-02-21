import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen } from '../BlastReadyScreen';

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('BlastReadyScreen', () => {
  const onStart = jest.fn();

  beforeEach(() => onStart.mockClear());

  it('renders all 3 difficulty cards', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument();
  });

  it('medium is selected by default', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a card selects it', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    expect(screen.getByTestId('difficulty-hard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'false');
  });

  it('play button calls onStart with selected difficulty', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('difficulty-hard'));
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledWith('hard');
  });

  it('play button calls onStart with medium by default', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledWith('medium');
  });

  it('renders tile guide with all 5 wave-1 tiles', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('tile-legend-gold')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-bomb')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-rainbow')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-ice')).toBeInTheDocument();
    expect(screen.getByTestId('tile-legend-wildcard')).toBeInTheDocument();
  });
});
