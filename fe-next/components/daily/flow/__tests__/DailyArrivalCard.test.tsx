import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyArrivalCard } from '../DailyArrivalCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, number>) => (p ? `${key}:${p.n}/${p.total}` : key),
    language: 'en',
  }),
}));

describe('DailyArrivalCard', () => {
  it('shows step, title and art for the mode', () => {
    const { container } = render(<DailyArrivalCard modeId="connections" />);
    expect(screen.getByText('daily.journeyStepOf:3/4')).toBeInTheDocument();
    expect(screen.getByText('connections.daily.questTitle')).toBeInTheDocument();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/daily/modes/connections.webp');
  });

  it('marks the chain with one active pip', () => {
    render(<DailyArrivalCard modeId="word-hunt" />);
    const pips = screen.getByTestId('daily-arrival-pips').children;
    expect(pips).toHaveLength(4);
    expect(pips[1].getAttribute('data-pip')).toBe('active');
  });

  it('has no spinner and no fullscreen opacity entrance', () => {
    const { container } = render(<DailyArrivalCard modeId="word-tower" />);
    expect(container.innerHTML).not.toMatch(/animate-spin|opacity-0/);
  });

  it('word wheel arrival leaves the step, title and art to its ready card', () => {
    const { container } = render(<DailyArrivalCard modeId="word-wheel" />);
    expect(screen.queryByText(/daily\.journeyStepOf/)).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByTestId('daily-arrival-pips')).toBeNull();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'wordWheel.hub.wordWheelQuest');
  });

  it('is a polite status region', () => {
    render(<DailyArrivalCard modeId="word-wheel" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
