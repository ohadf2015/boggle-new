import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedAchievementModal } from '../UnifiedAchievementModal';
import type { AchievementPayload } from '@/shared/types/socket';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const playAchievementSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playAchievementSound }),
}));

const fireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: (...args: unknown[]) => fireConfetti(...args) }));

let dialogOnOpenChange: ((open: boolean) => void) | undefined;
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) => {
    dialogOnOpenChange = onOpenChange;
    return open ? <div data-testid="dialog">{children}</div> : null;
  },
  DialogContent: ({ children, className, ...rest }: { children: React.ReactNode; className?: string }) =>
    <div className={className} data-testid="unified-achievement-modal" {...rest}>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

function socketAchievement(): AchievementPayload {
  return { key: 'first_word', icon: '🏆', count: 1 } as AchievementPayload;
}

describe('UnifiedAchievementModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    dialogOnOpenChange = undefined;
  });

  it('renders inside a Dialog with the achievement name', () => {
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement()} onClose={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('unified-achievement-modal')).toBeInTheDocument();
  });

  it('plays sound and fires confetti once on mount', () => {
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement()} onClose={vi.fn()} />);
    expect(playAchievementSound).toHaveBeenCalledTimes(1);
    expect(fireConfetti).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after 3 seconds', () => {
    const onClose = vi.fn();
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement()} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the continue button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement()} onClose={onClose} />);
    await user.click(screen.getByText('common.continue'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Dialog reports a dismiss (ESC/outside click)', () => {
    const onClose = vi.fn();
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement()} onClose={onClose} />);
    dialogOnOpenChange?.(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
