/**
 * AchievementQueueProvider Tests
 *
 * Tests for the AchievementQueueProvider component that handles
 * achievement notifications in multiplayer mode.
 *
 * Key behavior: In multiplayer, achievements should show ONLY as toast
 * notifications, NOT as full-screen modals (which disrupt gameplay).
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AchievementQueueProvider, useAchievementQueue } from '../AchievementQueue';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@testing-library/jest-dom';

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en/play',
}));

// Mock toast module
jest.mock('@/components/ui/EnhancedToast', () => ({
  toast: {
    success: jest.fn(),
  },
}));

// Import the mock after jest.mock
import { toast } from '@/components/ui/EnhancedToast';

// Mock SoundEffectsContext for UnifiedAchievementModal
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: jest.fn(),
  }),
}));

// Mock confetti
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
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
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementQueueProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const testAchievement = {
    key: 'FIRST_BLOOD',
    icon: '🩸',
  };

  // Test component that uses the queue
  const TestConsumer = () => {
    const { queueAchievement } = useAchievementQueue();
    return (
      <button onClick={() => queueAchievement(testAchievement)}>
        Trigger Achievement
      </button>
    );
  };

  const renderWithProviders = () => {
    return render(
      <LanguageProvider>
        <AchievementQueueProvider>
          <TestConsumer />
        </AchievementQueueProvider>
      </LanguageProvider>
    );
  };

  it('should show toast notification when achievement is queued', async () => {
    renderWithProviders();

    // GIVEN: A rendered provider with test consumer
    const button = screen.getByText('Trigger Achievement');

    // WHEN: Achievement is queued
    act(() => {
      button.click();
    });

    // THEN: Toast notification should be shown (no share action during gameplay)
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Achievement'),
      expect.any(String)
    );
  });

  it('should NOT show full-screen modal in multiplayer mode', async () => {
    renderWithProviders();

    // GIVEN: A rendered provider with test consumer
    const button = screen.getByText('Trigger Achievement');

    // WHEN: Achievement is queued
    act(() => {
      button.click();
    });

    // Allow time for any modal to appear
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // THEN: Full-screen modal should NOT be displayed
    // The UnifiedAchievementModal has data-testid="unified-achievement-modal"
    const modal = screen.queryByTestId('unified-achievement-modal');
    expect(modal).not.toBeInTheDocument();
  });

  it('should provide queueAchievement function via context', () => {
    const onContext = jest.fn();

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

  it('should throw error when useAchievementQueue is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useAchievementQueue();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useAchievementQueue must be used within AchievementQueueProvider'
    );

    consoleSpy.mockRestore();
  });
});
