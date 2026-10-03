import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TvGameHeader from '../TvGameHeader';
import TvJoinBar from '../TvJoinBar';
import TvBattleBar from '../TvBattleBar';

vi.mock('framer-motion', () => {
  const pass = (Tag: 'div' | 'span') =>
    React.forwardRef(function Pass({ children, className, ...rest }: Record<string, unknown> & { children?: React.ReactNode; className?: string }, ref: React.Ref<HTMLElement>) {
      return React.createElement(Tag, { ref, className, 'data-testid': rest['data-testid'] }, children);
    });
  return { m: { div: pass('div'), span: pass('span') }, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('../../../../components/CircularTimer', () => ({ __esModule: true, default: () => <div data-testid="circular-timer" /> }));

const t = (k: string) => k;

describe('Classroom host on a short projector (1366x768)', () => {
  it('Given the compact classroom header, When the screen is short, Then the timer and padding shrink so the board keeps the height', () => {
    const { container } = render(<TvGameHeader compact remainingTime={60} timerValue={3} gameMode="classic" t={t} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('md:medium-short:py-1');
    expect(screen.getByTestId('tv-timer-slot').className).toContain('md:medium-short:[zoom:0.55]');
  });

  it('Given an arcade header, Then the short-screen squeeze does not apply', () => {
    render(<TvGameHeader remainingTime={60} timerValue={3} gameMode="classic" t={t} />);
    expect(screen.getByTestId('tv-timer-slot').className).not.toContain('medium-short');
  });

  it('Given the dense classroom join bar, When the screen is short, Then the bar tightens and the address stays on one line', () => {
    render(<TvJoinBar gameCode="4MYA47" playerCount={4} language="en" baseUrl="https://www.lexiclash.live" t={t} dense />);
    const row = screen.getByTestId('tv-join-row');
    expect((row.parentElement as HTMLElement).className).toContain('md:medium-short:py-2');
    expect(screen.getByText(/join\/4MYA47/).className).toContain('md:medium-short:text-xl');
  });

  it('Given the battle bar, When the screen is short, Then the lesson name drops a size', () => {
    render(<TvBattleBar classroom={{ round: 1, lessonName: 'Common English', playStyle: 'ffa' }} players={[]} t={t} />);
    expect(screen.getByText('Common English').className).toContain('md:medium-short:text-2xl');
  });
});
