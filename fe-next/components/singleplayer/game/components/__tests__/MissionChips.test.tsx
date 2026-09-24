import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MissionChips } from '../MissionChips';
import type { SoloMission } from '@/lib/soloMissions';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => (
      params && params.letter != null ? `${key}:${params.letter}` : key
    ),
    language: 'en',
    dir: 'ltr',
  }),
}));

const missions: SoloMission[] = [
  { id: 'volume', labelKey: 'singlePlayer.missions.volume', progress: 3, target: 10, bonusPts: 50, done: false },
  { id: 'letter', labelKey: 'singlePlayer.missions.letter', progress: 1, target: 1, bonusPts: 30, done: true, letter: 'R' },
  { id: 'sprint', labelKey: 'singlePlayer.missions.sprint', progress: 40, target: 120, bonusPts: 40, done: false },
];

describe('MissionChips', () => {
  it('renders three chips with translated labels and ltr progress', () => {
    render(<MissionChips missions={missions} />);
    expect(screen.getByTestId('mission-chips').children).toHaveLength(3);
    expect(screen.getByTestId('mission-volume')).toHaveTextContent('singlePlayer.missions.volume');
    expect(screen.getByTestId('mission-letter')).toHaveTextContent('singlePlayer.missions.letter:R');
    const progress = screen.getByTestId('mission-volume').querySelector('[dir="ltr"]');
    expect(progress).not.toBeNull();
    expect(progress).toHaveTextContent('3/10');
    expect(screen.getByTestId('mission-sprint').querySelector('[dir="ltr"]')).toHaveTextContent('40/120');
  });

  it('turns a completed mission lime and exposes the done label', () => {
    render(<MissionChips missions={missions} />);
    const done = screen.getByTestId('mission-letter');
    expect(done).toHaveAttribute('data-done', 'true');
    expect(done.className).toContain('bg-neo-lime');
    expect(done.className).toContain('text-neo-black');
    expect(screen.getByLabelText('singlePlayer.missions.done')).toBeInTheDocument();
    expect(screen.getByTestId('mission-volume')).toHaveAttribute('data-done', 'false');
  });
  it('wraps labels to two lines instead of truncating them on a phone', () => {
    // "WORD OF 6+ LETTE..." at 390px: a mission you cannot read is not a goal.
    render(<MissionChips missions={missions} />);
    const label = screen.getByTestId('mission-volume').querySelector('[data-part="label"]');
    expect(label?.className).toContain('line-clamp-2');
    expect(label?.className).not.toContain('truncate');
  });

  it('shows progress as a bar, not only a fraction', () => {
    render(<MissionChips missions={missions} />);
    const bar = screen.getByTestId('mission-volume').querySelector('[data-part="bar"]') as HTMLElement | null;
    expect(bar?.style.width).toBe('30%');
  });
});
