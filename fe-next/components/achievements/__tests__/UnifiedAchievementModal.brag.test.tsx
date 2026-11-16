import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedAchievementModal } from '../UnifiedAchievementModal';
import type { AchievementPayload } from '@/shared/types/socket';

const share = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/multiplayer' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile: { display_name: 'Noa' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const socketAchievement = { key: 'first_word', icon: 'x', count: 1 } as AchievementPayload;

describe('UnifiedAchievementModal brag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    share.mockReset().mockReturnValue(new Promise(() => {}));
    Object.defineProperty(window, 'location', { value: { origin: 'https://lexiclash.live', pathname: '/en/multiplayer' }, writable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('Given a game achievement, Then Brag shares an achievement link named after it', () => {
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('brag-button-achievement'));
    const { text, url } = share.mock.calls[0][0];
    expect(text).toContain('brag2.text.achievement');
    const q = new URL(url).searchParams;
    expect(q.get('kind')).toBe('achievement');
    expect(q.get('title')).toBe('achievements.first_word.name');
    expect(q.get('me')).toBe('Noa');
  });

  it('holds the auto-dismiss once the player taps Brag', () => {
    const onClose = vi.fn();
    render(<UnifiedAchievementModal type="socket" achievement={socketAchievement} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('brag-button-achievement'));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('releases the hold when the next achievement replaces this one', () => {
    const onClose = vi.fn();
    const { rerender } = render(<UnifiedAchievementModal type="socket" achievement={socketAchievement} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('brag-button-achievement'));
    rerender(<UnifiedAchievementModal type="socket" achievement={{ key: 'second', icon: 'y', count: 1 } as AchievementPayload} onClose={onClose} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onClose).toHaveBeenCalled();
  });

  it('Given a classroom achievement, Then there is no Brag button', () => {
    render(
      <UnifiedAchievementModal
        type="education"
        unlock={{ achievementKey: 'k', icon: 'x', tier: 'gold', isNew: true, isUpgrade: false } as never}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('brag-button-achievement')).toBeNull();
  });
});
