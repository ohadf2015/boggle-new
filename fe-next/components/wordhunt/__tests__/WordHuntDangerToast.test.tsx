/**
 * TDD RED: WordHuntDangerToast component tests
 * Tests toast rendering for danger/eliminated/lastStanding types,
 * auto-dismiss, max stack of 3, and animation presence.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { WordHuntDangerToast, type DangerToast } from '../WordHuntDangerToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'wordHunt.dangerAlert' && params?.name) return `${params.name} is in danger!`;
      if (key === 'wordHunt.eliminatedAlert' && params?.name) return `${params.name} eliminated!`;
      if (key === 'wordHunt.lastStanding' && params?.count) return `Last ${params.count} standing!`;
      if (key === 'wordHunt.lowLifeSelf') return 'Low on life! Find words to heal.';
      return key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const Wrapper = ({ children, ...props }: any) => <div data-testid="adaptive-motion" {...props}>{children}</div>;
  return {
    AdaptiveMotion: { div: Wrapper, span: Wrapper, button: Wrapper, li: Wrapper },
    AdaptiveAnimatePresence: ({ children }: any) => <div>{children}</div>,
  };
});

describe('WordHuntDangerToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a danger toast with player name', () => {
    const toasts: DangerToast[] = [
      { id: '1', type: 'danger', playerName: 'Alice', timestamp: Date.now() },
    ];
    const onDismiss = vi.fn();
    render(<WordHuntDangerToast toasts={toasts} onDismiss={onDismiss} />);
    expect(screen.getByText('Alice is in danger!')).toBeTruthy();
  });

  it('renders an eliminated toast', () => {
    const toasts: DangerToast[] = [
      { id: '2', type: 'eliminated', playerName: 'Bob', timestamp: Date.now() },
    ];
    render(<WordHuntDangerToast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('Bob eliminated!')).toBeTruthy();
  });

  it('renders a lowLifeSelf encouragement toast', () => {
    const toasts: DangerToast[] = [
      { id: 's1', type: 'lowLifeSelf', timestamp: Date.now() },
    ];
    render(<WordHuntDangerToast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('Low on life! Find words to heal.')).toBeTruthy();
    const el = screen.getByText('Low on life! Find words to heal.').closest('[data-toast-type]');
    expect(el?.getAttribute('data-toast-type')).toBe('lowLifeSelf');
  });

  it('renders a lastStanding toast', () => {
    const toasts: DangerToast[] = [
      { id: '3', type: 'lastStanding', count: 2, timestamp: Date.now() },
    ];
    render(<WordHuntDangerToast toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('Last 2 standing!')).toBeTruthy();
  });

  it('renders max 3 toasts even if more provided', () => {
    const toasts: DangerToast[] = [
      { id: '1', type: 'danger', playerName: 'A', timestamp: 1 },
      { id: '2', type: 'danger', playerName: 'B', timestamp: 2 },
      { id: '3', type: 'danger', playerName: 'C', timestamp: 3 },
      { id: '4', type: 'danger', playerName: 'D', timestamp: 4 },
    ];
    render(<WordHuntDangerToast toasts={toasts} onDismiss={vi.fn()} />);
    // Only newest 3 should render (B, C, D)
    expect(screen.queryByText('A is in danger!')).toBeNull();
    expect(screen.getByText('B is in danger!')).toBeTruthy();
    expect(screen.getByText('C is in danger!')).toBeTruthy();
    expect(screen.getByText('D is in danger!')).toBeTruthy();
  });

  it('calls onDismiss after 3 seconds for each toast', () => {
    const onDismiss = vi.fn();
    const toasts: DangerToast[] = [
      { id: '1', type: 'danger', playerName: 'Alice', timestamp: Date.now() },
    ];
    render(<WordHuntDangerToast toasts={toasts} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  it('applies correct style classes per toast type', () => {
    const toasts: DangerToast[] = [
      { id: '1', type: 'danger', playerName: 'X', timestamp: Date.now() },
      { id: '2', type: 'eliminated', playerName: 'Y', timestamp: Date.now() },
    ];
    const { container } = render(<WordHuntDangerToast toasts={toasts} onDismiss={vi.fn()} />);
    // danger toast should have warning-like styling, eliminated should have red/skull styling
    const dangerEl = screen.getByText('X is in danger!').closest('[data-toast-type]');
    const eliminatedEl = screen.getByText('Y eliminated!').closest('[data-toast-type]');
    expect(dangerEl?.getAttribute('data-toast-type')).toBe('danger');
    expect(eliminatedEl?.getAttribute('data-toast-type')).toBe('eliminated');
  });
});
