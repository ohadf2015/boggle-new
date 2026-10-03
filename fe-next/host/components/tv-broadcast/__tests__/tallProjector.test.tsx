import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TvGameHeader from '../TvGameHeader';
import TvJoinBar from '../TvJoinBar';

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

describe('Classroom host on a tall projector (1440x900 and up)', () => {
  it('Given the compact classroom header on a tall wall, Then the timer grows for the back row', () => {
    render(<TvGameHeader compact remainingTime={60} timerValue={3} gameMode="classic" t={t} />);
    expect(screen.getByTestId('tv-timer-slot').className).toContain('lg:[@media(min-height:851px)]:[zoom:1.2]');
  });

  it('Given the dense classroom join bar on a desktop, Then the address never wraps mid-code', () => {
    render(<TvJoinBar gameCode="X9HB5V" playerCount={3} language="en" baseUrl="http://localhost:3323" t={t} dense />);
    const address = screen.getByText('localhost:3323/en/join/X9HB5V');
    expect(address.className).toContain('lg:whitespace-nowrap');
    expect(address.className).toContain('lg:break-normal');
  });
});
