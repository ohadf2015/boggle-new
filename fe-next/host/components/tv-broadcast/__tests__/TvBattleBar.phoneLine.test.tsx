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
