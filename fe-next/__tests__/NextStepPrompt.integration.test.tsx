import { vi, type Mock, } from 'vitest';
/**
 * Integration test for NextStepPrompt routing in ResultsPage context
 * This test simulates the actual usage in ResultsPage to catch integration bugs
 */
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/en/results'),
}));

// Mock session utility
vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Import the already-mocked session module at top-level
import { clearSessionPreservingUsername } from '@/utils/session';

describe('NextStepPrompt Integration - ResultsPage Context', () => {
  const mockPush = vi.fn();
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('should clear session and navigate when clicking the main CTA button', async () => {
    const { container } = render(
      <LanguageProvider>
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      </LanguageProvider>
    );

    // Find the main CTA button (first button with gradient background)
    const buttons = container.querySelectorAll('button');
    const mainButton = buttons[0]; // Main "next step" button

    // Simulate user clicking the main button
    fireEvent.click(mainButton);

    // Verify session was cleared
    expect(clearSessionPreservingUsername).toHaveBeenCalledTimes(1);

    // Verify router.push was called with correct route
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/daily');
    });

    // Verify onBackToLobby was NOT called (that's for the back button)
    expect(mockOnBackToLobby).not.toHaveBeenCalled();
  });

  it('should only call onBackToLobby for the back button, not navigate', async () => {
    const { container } = render(
      <LanguageProvider>
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      </LanguageProvider>
    );

    const buttons = container.querySelectorAll('button');
    const backButton = buttons[1]; // "Back to Lobby" button

    // Simulate user clicking the back button
    fireEvent.click(backButton);

    // Verify onBackToLobby was called
    expect(mockOnBackToLobby).toHaveBeenCalledTimes(1);

    // Verify router.push was NOT called
    expect(mockPush).not.toHaveBeenCalled();

    // Verify session was NOT cleared (back button shouldn't clear session)
    expect(clearSessionPreservingUsername).not.toHaveBeenCalled();
  });

  it('should work correctly in all variants (mobile, desktop, landscape)', async () => {
    const variants = ['mobile', 'desktop', 'landscape'] as const;

    for (const variant of variants) {
      vi.clearAllMocks();

      const { container } = render(
        <LanguageProvider>
          <NextStepPrompt
            currentMode="multiplayer-bots"
            onBackToLobby={mockOnBackToLobby}
            variant={variant}
          />
        </LanguageProvider>
      );

      const buttons = container.querySelectorAll('button');
      const mainButton = buttons[0];

      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/daily');
      });

      expect(clearSessionPreservingUsername).toHaveBeenCalled();
    }
  });

  it('should generate correct hrefs for all modes', async () => {
    const testCases = [
      { mode: 'practice' as const, expectedHref: '/en/singleplayer?preset=bots' },
      { mode: 'solo-bots' as const, expectedHref: '/en/daily' },
      { mode: 'daily' as const, expectedHref: '/en/multiplayer' },
      { mode: 'multiplayer-bots' as const, expectedHref: '/en/daily' },
    ];

    for (const { mode, expectedHref } of testCases) {
      vi.clearAllMocks();

      const { container } = render(
        <LanguageProvider>
          <NextStepPrompt
            currentMode={mode}
            onBackToLobby={mockOnBackToLobby}
            variant="mobile"
          />
        </LanguageProvider>
      );

      const buttons = container.querySelectorAll('button');
      const mainButton = buttons[0];

      fireEvent.click(mainButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expectedHref);
      });
    }
  });
});
