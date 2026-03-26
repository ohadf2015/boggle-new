import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen } from '../BlastReadyScreen';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('BlastReadyScreen', () => {
  const onStart = vi.fn();

  beforeEach(() => onStart.mockClear());

  it('displays translated step titles and descriptions', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByText('blast.ready.step1Title')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.step2Title')).toBeInTheDocument();
    expect(screen.getByText('blast.ready.step3Title')).toBeInTheDocument();
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

  it('has an expandable tile guide', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    const toggle = screen.getByTestId('tile-guide-toggle');
    // Tile hints hidden by default
    expect(screen.queryByText('blast.helpGoldLabel')).not.toBeInTheDocument();
    // Expand
    fireEvent.click(toggle);
    expect(screen.getByText('blast.helpGoldLabel')).toBeInTheDocument();
    expect(screen.getByText('blast.helpBombLabel')).toBeInTheDocument();
  });

  it('renders codex button', () => {
    render(<BlastReadyScreen onStart={onStart} />);
    expect(screen.getByTestId('codex-button')).toBeInTheDocument();
  });

  it('renders resume wave button when saved progress exists', () => {
    const onStartFromWave = vi.fn();
    render(<BlastReadyScreen onStart={onStart} onStartFromWave={onStartFromWave} savedWave={3} />);
    const resumeBtn = screen.getByTestId('resume-wave-button');
    fireEvent.click(resumeBtn);
    expect(onStartFromWave).toHaveBeenCalledWith(3);
  });
});
