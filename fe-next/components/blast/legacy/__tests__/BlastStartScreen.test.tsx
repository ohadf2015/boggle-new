import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BlastStartScreen } from '../BlastStartScreen';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));

describe('BlastStartScreen', () => {
  it('given a first-time player, then it shows the mode art, the tile pitch and one start CTA', () => {
    const onStart = vi.fn();
    render(<BlastStartScreen personalBest={null} resumeWave={null} onStart={onStart} onResume={vi.fn()} />);
    expect(screen.getByTestId('blast-start-art').getAttribute('src')).toContain('blast.png');
    expect(screen.getByText('blast.ready.subtitle')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-start-best')).toBeNull();
    expect(screen.queryByTestId('resume-button')).toBeNull();
    expect(screen.getByTestId('play-button').textContent).toBe('blast.ready.start');
    fireEvent.click(screen.getByTestId('play-button'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('given a best score, then it shows the score to beat', () => {
    render(<BlastStartScreen personalBest={12340} resumeWave={null} onStart={vi.fn()} onResume={vi.fn()} />);
    expect(screen.getByTestId('blast-start-best').textContent).toContain('12,340');
  });

  it('given a saved wave, then resume is the primary CTA and restart is secondary', () => {
    const onResume = vi.fn();
    render(<BlastStartScreen personalBest={null} resumeWave={4} onStart={vi.fn()} onResume={onResume} />);
    expect(screen.getByTestId('resume-button').textContent).toBe('blast.ready.resume:{"wave":4}');
    expect(screen.getByTestId('play-button').textContent).toBe('blast.ready.play');
    fireEvent.click(screen.getByTestId('resume-button'));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('renders extra pregame content under the CTAs', () => {
    render(
      <BlastStartScreen personalBest={null} resumeWave={null} onStart={vi.fn()} onResume={vi.fn()}>
        <span data-testid="extra" />
      </BlastStartScreen>,
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});
