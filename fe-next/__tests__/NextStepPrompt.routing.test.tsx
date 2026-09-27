import { vi, type Mock, } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('NextStepPrompt - Routing Bug', () => {
  const mockPush = vi.fn();
  const mockOnBackToLobby = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });
  });

  const renderComponent = (currentMode: any) => {
    return render(
      <LanguageProvider>
        <NextStepPrompt
          currentMode={currentMode}
          onBackToLobby={mockOnBackToLobby}
          variant="mobile"
        />
      </LanguageProvider>
    );
  };

  it('should navigate to brain training when clicking the card in multiplayer-bots mode', async () => {
    const { container } = renderComponent('multiplayer-bots');

    // Find the main next step button (it's the first button, not the back button)
    const buttons = container.querySelectorAll('button');
    const nextStepButton = buttons[0]; // First button is the main CTA

    // Click the next step card
    fireEvent.click(nextStepButton);

    // Verify router.push was called with the correct route
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/daily');
    });
  });

  it('should navigate to multiplayer when clicking the card in daily mode', async () => {
    const { container } = renderComponent('daily');

    const buttons = container.querySelectorAll('button');
    const nextStepButton = buttons[0];
    fireEvent.click(nextStepButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer');
    });
  });

  it('should navigate to daily challenge when clicking the card in solo-bots mode', async () => {
    const { container } = renderComponent('solo-bots');

    const buttons = container.querySelectorAll('button');
    const nextStepButton = buttons[0];
    fireEvent.click(nextStepButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/daily');
    });
  });

  it('should navigate to singleplayer with bots preset when clicking the card in practice mode', async () => {
    const { container } = renderComponent('practice');

    const buttons = container.querySelectorAll('button');
    const nextStepButton = buttons[0];
    fireEvent.click(nextStepButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/singleplayer?preset=bots');
    });
  });

  it('should call onBackToLobby when clicking the back button', async () => {
    const { container } = renderComponent('multiplayer-bots');

    const buttons = container.querySelectorAll('button');
    const backButton = buttons[1]; // Second button is the back button
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(mockOnBackToLobby).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
