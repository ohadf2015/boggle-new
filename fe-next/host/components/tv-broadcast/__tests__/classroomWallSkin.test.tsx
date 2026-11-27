// @vitest-environment happy-dom
import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvGameHeader from '../TvGameHeader';
import { TvFormatChip, TvRoundLabel } from '../TvBattleBar';
import MinimalToastLayout from '../notifications/MinimalToastLayout';
import CircularTimer from '../../../../components/CircularTimer';

vi.mock('framer-motion', () => {
  const pass = (Tag: 'div' | 'span' | 'circle') =>
    React.forwardRef(function Pass({ children, className, ...rest }: Record<string, unknown> & { children?: React.ReactNode; className?: string }, ref: React.Ref<HTMLElement>) {
      return React.createElement(Tag, { ref, className, style: rest.style, 'data-testid': rest['data-testid'], role: rest.role }, children);
    });
  return { m: { div: pass('div'), span: pass('span'), circle: pass('circle') }, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>, useReducedMotion: () => true };
});
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true, useSuppressTimerUrgency: () => false }));
vi.mock('@/utils/preloadResults', () => ({ preloadResultsChunks: () => {} }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const classroom = { round: 2, lessonName: '7B Science - Physics unit', playStyle: 'ffa' } as never;

describe('classroom wall skin on the sky page', () => {
  it('given an arcade room, then the header renders exactly as before', () => {
    const { container } = render(<TvGameHeader remainingTime={92} timerValue={3} gameMode="classic" t={t} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('given a classroom header, then the timer sits on a light plate with black digits', () => {
    render(<TvGameHeader compact classroom remainingTime={92} timerValue={3} gameMode="classic" t={t} />);
    expect(screen.getByTestId('tv-timer-plate')).toHaveClass('bg-edu-paper', 'border-neo-black', 'shadow-edu-lip');
    expect(screen.getByText('1:32')).toHaveClass('text-neo-black');
    expect(screen.getByText('1:32').style.textShadow).toBe('none');
  });

  it('given the default timer, then its digits stay white for the dark arcade wall', () => {
    render(<CircularTimer remainingTime={92} totalTime={180} size="lg" />);
    expect(screen.getByText('1:32')).toHaveClass('text-neo-white');
  });

  it('given a classroom round, then the round chip is yellow with an outline and the lesson and format read in page ink', () => {
    render(<><TvRoundLabel classroom={classroom} t={t} /><TvFormatChip classroom={classroom} t={t} /></>);
    expect(screen.getByText(/tvBroadcast.classroom.round/)).toHaveClass('bg-neo-yellow', 'border-neo-black');
    expect(screen.getByText('7B Science - Physics unit')).toHaveClass('text-edu-ink');
    const chip = screen.getByText('tvBroadcast.classroom.freeForAll');
    expect(chip).toHaveClass('text-edu-ink', 'border-edu-line');
    expect(chip.className).not.toContain('neo-cream');
  });

  it('given a classroom header toast, then it is a flat paper card with a yellow icon square, no gradient', () => {
    const Icon = (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />;
    render(<MinimalToastLayout wrap headline="FROM THE ASHES!" player="Maximiliana-Josefina" icon={Icon as never} bgGradient="from-neo-yellow via-neo-red to-neo-red" textColor="text-neo-black" borderColor="border-neo-black" />);
    const card = screen.getByTestId('tv-toast-card');
    expect(card.className).not.toMatch(/gradient|bg-linear/);
    expect(card).toHaveClass('bg-edu-paper', 'text-neo-black', 'border-neo-black');
    expect(screen.getByTestId('tv-toast-icon')).toHaveClass('bg-neo-yellow');
  });
});
