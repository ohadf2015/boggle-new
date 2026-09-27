/**
 * AchievementQueueProvider Tests
 *
 * Tests for the AchievementQueueProvider component that handles
 * achievement notifications in multiplayer mode.
 *
 * Key behaviors:
 * - Shows ONLY one achievement notification at a time (sequential queue)
 * - Displays achievement icon and translated name (rich notification)
 * - Does NOT show full-screen modals (non-intrusive for gameplay)
 * - Auto-dismisses after timeout and shows next queued achievement
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AchievementQueueProvider, useAchievementQueue } from '../AchievementQueue';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@testing-library/jest-dom';

// Mock next/navigation for tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/en/play',
}));

// Mock SoundEffectsContext for UnifiedAchievementModal
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: vi.fn(),
  }),
}));

// Mock confetti
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.PropsWithChildren<{ className?: string; onClick?: () => void }>>(
      function MotionDiv({ children, className, onClick, ...props }, ref) {
        return (
          <div ref={ref} className={className} onClick={onClick} {...props}>
            {children}
          </div>
        );
      }
    ),
    h2: React.forwardRef<HTMLHeadingElement, React.PropsWithChildren<{ className?: string }>>(
      function MotionH2({ children, className, ...props }, ref) {
        return (
          <h2 ref={ref} className={className} {...props}>
            {children}
          </h2>
        );
      }
    ),
    h3: React.forwardRef<HTMLHeadingElement, React.PropsWithChildren<{ className?: string }>>(
      function MotionH3({ children, className, ...props }, ref) {
        return (
          <h3 ref={ref} className={className} {...props}>
            {children}
          </h3>
        );
      }
    ),
    p: React.forwardRef<HTMLParagraphElement, React.PropsWithChildren<{ className?: string }>>(
      function MotionP({ children, className, ...props }, ref) {
        return (
          <p ref={ref} className={className} {...props}>
            {children}
          </p>
        );
      }
    ),
    button: React.forwardRef<HTMLButtonElement, React.PropsWithChildren<{ className?: string; onClick?: () => void }>>(
      function MotionButton({ children, className, onClick, ...props }, ref) {
        return (
          <button ref={ref} className={className} onClick={onClick} {...props}>
            {children}
          </button>
        );
      }
    ),
    span: React.forwardRef<HTMLSpanElement, React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>>(
      function MotionSpan({ children, className, style, ...props }, ref) {
        // Strip framer-only props that React doesn't recognize on real DOM nodes
        const {
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileHover: _wh,
          whileTap: _wt,
          ...rest
        } = props as Record<string, unknown>;
        return (
          <span ref={ref} className={className} style={style} {...(rest as Record<string, unknown>)}>
            {children}
          </span>
        );
      }
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementQueueProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const testAchievement = {
    key: 'FIRST_BLOOD',
    icon: '🩸',
  };

  const secondAchievement = {
    key: 'SPEED_DEMON',
    icon: '⚡',
  };

  const thirdAchievement = {
    key: 'WORD_MASTER',
    icon: '📚',
  };

  // Test component that uses the queue
  const TestConsumer = ({ achievements }: { achievements?: Array<{ key: string; icon: string }> }) => {
    const { queueAchievement } = useAchievementQueue();
    return (
      <>
        <button onClick={() => queueAchievement(testAchievement)}>
          Trigger Achievement
        </button>
        {achievements && (
          <button onClick={() => achievements.forEach(a => queueAchievement(a))}>
            Trigger Multiple
          </button>
        )}
      </>
    );
  };

  const renderWithProviders = (achievements?: Array<{ key: string; icon: string }>) => {
    return render(
      <LanguageProvider>
        <AchievementQueueProvider>
          <TestConsumer achievements={achievements} />
        </AchievementQueueProvider>
      </LanguageProvider>
    );
  };

  it('should show achievement notification with icon when queued', () => {
    renderWithProviders();

    // GIVEN: A rendered provider with test consumer
    const button = screen.getByText('Trigger Achievement');

    // WHEN: Achievement is queued
    act(() => {
      button.click();
    });

    // Allow notification to appear
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // THEN: Achievement notification should show with icon and name
    const notification = screen.getByTestId('achievement-inline-toast');
    expect(notification).toBeInTheDocument();

    // Should display the achievement icon
    expect(screen.getByTestId('achievement-inline-icon')).toHaveTextContent('🎯'); // FIRST_BLOOD icon from ACHIEVEMENT_ICONS
  });

  it('should show only ONE notification at a time when multiple achievements arrive', () => {
    const achievements = [testAchievement, secondAchievement, thirdAchievement];
    renderWithProviders(achievements);

    // WHEN: Multiple achievements are queued simultaneously
    act(() => {
      screen.getByText('Trigger Multiple').click();
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // THEN: Only ONE notification should be visible
    const notifications = screen.getAllByTestId('achievement-inline-toast');
    expect(notifications).toHaveLength(1);
  });

  it('should show next achievement after current one auto-dismisses', () => {
    const achievements = [testAchievement, secondAchievement];
    renderWithProviders(achievements);

    // GIVEN: Two achievements queued
    act(() => {
      screen.getByText('Trigger Multiple').click();
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // First notification visible
    expect(screen.getByTestId('achievement-inline-toast')).toBeInTheDocument();

    // WHEN: First notification auto-dismisses (3000ms + 500ms gap)
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // THEN: Second notification should now be visible
    const notification = screen.getByTestId('achievement-inline-toast');
    expect(notification).toBeInTheDocument();
  });

  it('should NOT show full-screen modal in multiplayer mode', () => {
    renderWithProviders();

    // GIVEN: A rendered provider with test consumer
    const button = screen.getByText('Trigger Achievement');

    // WHEN: Achievement is queued
    act(() => {
      button.click();
    });

    // Allow time for any modal to appear
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // THEN: Full-screen modal should NOT be displayed
    const modal = screen.queryByTestId('unified-achievement-modal');
    expect(modal).not.toBeInTheDocument();
  });

  it('should display achievement name from translations', () => {
    renderWithProviders();

    // WHEN: Achievement is queued
    act(() => {
      screen.getByText('Trigger Achievement').click();
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // THEN: Achievement name should be displayed
    const nameEl = screen.getByTestId('achievement-inline-name');
    expect(nameEl).toBeInTheDocument();
    // Translation falls back to key if not found
    expect(nameEl.textContent).toBeTruthy();
  });

  it('should provide queueAchievement function via context', () => {
    const onContext = vi.fn();

    const ContextCapture = ({ onCapture }: { onCapture: (ctx: ReturnType<typeof useAchievementQueue>) => void }) => {
      const context = useAchievementQueue();
      React.useEffect(() => {
        onCapture(context);
      }, [context, onCapture]);
      return null;
    };

    render(
      <LanguageProvider>
        <AchievementQueueProvider>
          <ContextCapture onCapture={onContext} />
        </AchievementQueueProvider>
      </LanguageProvider>
    );

    expect(onContext).toHaveBeenCalled();
    expect(onContext.mock.calls[0][0].queueAchievement).toBeInstanceOf(Function);
  });

  it('returns no-op queueAchievement when used outside provider (does not throw)', () => {
    const onCapture = vi.fn();
    const TestComponent = () => {
      const ctx = useAchievementQueue();
      onCapture(ctx);
      return null;
    };

    expect(() => render(<TestComponent />)).not.toThrow();
    expect(onCapture).toHaveBeenCalled();
    const captured = onCapture.mock.calls[0][0] as { queueAchievement: (a: { key: string; icon: string }) => void };
    expect(captured.queueAchievement).toBeInstanceOf(Function);
    expect(() => captured.queueAchievement({ key: 'TEST', icon: '🎯' })).not.toThrow();
  });

  it('should auto-dismiss notification after timeout', () => {
    renderWithProviders();

    // GIVEN: Achievement notification is showing
    act(() => {
      screen.getByText('Trigger Achievement').click();
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('achievement-inline-toast')).toBeInTheDocument();

    // WHEN: Auto-dismiss timeout expires (2000ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // THEN: Notification should be gone
    expect(screen.queryByTestId('achievement-inline-toast')).not.toBeInTheDocument();
  });

  it('should cap queue at 5 achievements', () => {
    const TestManyConsumer = () => {
      const { queueAchievement } = useAchievementQueue();
      return (
        <button onClick={() => {
          for (let i = 0; i < 8; i++) {
            queueAchievement({ key: `ACH_${i}`, icon: '🏅' });
          }
        }}>
          Trigger Many
        </button>
      );
    };

    render(
      <LanguageProvider>
        <AchievementQueueProvider>
          <TestManyConsumer />
        </AchievementQueueProvider>
      </LanguageProvider>
    );

    // WHEN: 8 achievements queued
    act(() => {
      screen.getByText('Trigger Many').click();
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // First one showing, rest in queue (max 5 total)
    expect(screen.getByTestId('achievement-inline-toast')).toBeInTheDocument();

    // Cycle through all — should only see 5 total (capped)
    let shownCount = 1;
    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      if (screen.queryByTestId('achievement-inline-toast')) {
        shownCount++;
      }
    }
    // Max 5 achievements should have been shown
    expect(shownCount).toBeLessThanOrEqual(5);
  });

  it('should dedupe rapid duplicate same-key calls to queueAchievement', () => {
    // Bug repro: useAchievementSocketBridge + useHostPlayerEvents both listen to
    // liveAchievementUnlocked → same payload enqueued twice. With AnimatePresence
    // same-key reuse the second toast can stay stuck visible. Fix: dedupe by key.
    const DoubleConsumer = () => {
      const { queueAchievement } = useAchievementQueue();
      return (
        <button onClick={() => {
          queueAchievement(testAchievement);
          queueAchievement(testAchievement);
        }}>
          Trigger Double
        </button>
      );
    };

    render(
      <LanguageProvider>
        <AchievementQueueProvider>
          <DoubleConsumer />
        </AchievementQueueProvider>
      </LanguageProvider>
    );

    act(() => { screen.getByText('Trigger Double').click(); });
    act(() => { vi.advanceTimersByTime(150); });

    expect(screen.getByTestId('achievement-inline-toast')).toBeInTheDocument();

    // After dismiss + gap the duplicate must NOT resurface.
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByTestId('achievement-inline-toast')).not.toBeInTheDocument();
  });
});
