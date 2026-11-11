import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TvBattleBar from '../TvBattleBar';

vi.mock('framer-motion', () => ({
  m: { div: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div> },
}));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));

describe('TvBattleBar — one line on a teacher phone', () => {
  it('Given a 390px host screen, Then round, lesson and format share one row and the lesson truncates', () => {
    render(
      <TvBattleBar classroom={{ round: 3, lessonName: 'Common English', playStyle: 'ffa' }} players={[]} t={(k) => k} />
    );
    const row = screen.getByTestId('tv-battle-bar').firstElementChild as HTMLElement;
    expect(row.className).toContain('max-md:flex-nowrap');
    expect(screen.getByText('Common English').className).toContain('truncate');
  });
});

describe('TvRoundLabel — the class name on the wall', () => {
  it('Given a projector-wide header, Then the lesson name wraps to two lines before it is ever cut', async () => {
    const { TvRoundLabel } = await import('../TvBattleBar');
    render(<TvRoundLabel classroom={{ round: 2, lessonName: '7B Science - Physics unit', playStyle: 'ffa' }} t={(k) => k} />);
    const name = screen.getByText('7B Science - Physics unit');
    expect(name.className).toMatch(/md:whitespace-normal/);
    expect(name.className).toMatch(/md:line-clamp-2/);
  });
});
