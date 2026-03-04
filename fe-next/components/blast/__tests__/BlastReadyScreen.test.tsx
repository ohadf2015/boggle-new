import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen } from '../BlastReadyScreen';

jest.mock('framer-motion', () => ({
  motion: {
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

  it('renders 3 infographic step cards', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('step-card-step1')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-step2')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-step3')).toBeInTheDocument();
  });

  it('displays translated step titles and descriptions', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByText('blast.ready.step1Title')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.step1Desc')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.step2Title')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.step3Title')).toBeInTheDocument();
  });

  it('does not render old difficulty picker or tile guide', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.queryByTestId('difficulty-easy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('difficulty-medium')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-legend-gold')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-legend-bomb')).not.toBeInTheDocument();
  });

  it('play button calls onStart with no arguments', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledWith();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders title and subtitle', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByText('blast.ready.title')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.subtitle')).toBeInTheDocument();
  });
});
