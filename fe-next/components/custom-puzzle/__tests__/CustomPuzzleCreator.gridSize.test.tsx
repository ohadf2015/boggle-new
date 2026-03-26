import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomPuzzleCreator from '../CustomPuzzleCreator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// Mock dependencies
vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/AuthContext');
vi.mock('@/utils/dailyChallenge', () => ({
  getGuestFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
}));

// Mock efficiency score that can be changed per test
let mockEfficiencyScore = 95;

// Mock DailyWordHuntSurvival component
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  default: function MockDailyWordHuntSurvival({ onComplete }: { onComplete: (result: any) => void }) {
    return (
      <div data-testid="game-component">
        <button onClick={() => onComplete({
          solved: true,
          attemptsUsed: 3,
          wordsDiscovered: ['WORD', 'TEST'],
          lifeRemaining: 5,
          efficiencyScore: mockEfficiencyScore,
        })}>Complete Game</button>
      </div>
    );
  },
}));

describe('CustomPuzzleCreator - Grid Size', () => {
  const mockOnClose = vi.fn();
  const mockT = (key: string) => key;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEfficiencyScore = 95; // Reset to default

    (useLanguage as jest.Mock).mockReturnValue({
      t: mockT,
      language: 'en',
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      profile: { display_name: 'Test User' },
    });

    // Mock fetch for grid generation
    global.fetch = vi.fn((url) => {
      if (url === '/api/grid/generate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            grid: Array(7).fill(null).map(() =>
              Array(7).fill(null).map(() => ({ letter: 'A', multiplier: 1 }))
            ),
          }),
        });
      }
      if (url === '/api/custom-puzzle/create') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            puzzleCode: 'TEST123',
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as jest.Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should always request 7x7 grid when creating custom puzzle', async () => {
    const user = userEvent.setup();

    // Mock matchMedia for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<CustomPuzzleCreator
        isOpen={true}
        onClose={mockOnClose}
        language="en"
      />, { wrapper: createWrapper() });

    // Enter a valid word
    const input = screen.getByPlaceholderText(/customPuzzle.enterWordPlaceholder/i);
    await user.type(input, 'TESTING');

    // Click create puzzle button
    const createButton = screen.getByRole('button', { name: /customPuzzle.createPuzzle/i });
    await user.click(createButton);

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/grid/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    // Verify the body contains 7x7 grid size
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const gridGenerationCall = fetchCalls.find(call => call[0] === '/api/grid/generate');
    expect(gridGenerationCall).toBeDefined();

    const requestBody = JSON.parse(gridGenerationCall[1].body);
    expect(requestBody.gridSize).toEqual({ rows: 7, cols: 7 });
  });

  it('should display share functionality after completing the puzzle', async () => {
    const user = userEvent.setup({ delay: null }); // Disable delay for faster tests

    render(<CustomPuzzleCreator
        isOpen={true}
        onClose={mockOnClose}
        language="en"
      />, { wrapper: createWrapper() });

    // Enter a valid word
    const input = screen.getByPlaceholderText(/customPuzzle.enterWordPlaceholder/i);
    await user.type(input, 'TESTING');

    // Click create puzzle button
    const createButton = screen.getByRole('button', { name: /customPuzzle.createPuzzle/i });
    await user.click(createButton);

    // Wait for game component to appear
    await waitFor(() => {
      expect(screen.getByTestId('game-component')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Complete the game
    const completeButton = screen.getByText('Complete Game');
    await user.click(completeButton);

    // Wait for share phase
    await waitFor(() => {
      expect(screen.getByText(/customPuzzle.created/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify share functionality is displayed
    expect(screen.getByRole('button', { name: /customPuzzle.share/i })).toBeInTheDocument();
    expect(screen.getByText(/TEST123/)).toBeInTheDocument(); // Puzzle code should be visible
  });

  it('should display efficiency score as whole number without decimals', async () => {
    // Set mock to return decimal efficiency score
    mockEfficiencyScore = 87.456789;

    const user = userEvent.setup();

    render(<CustomPuzzleCreator
        isOpen={true}
        onClose={mockOnClose}
        language="en"
      />, { wrapper: createWrapper() });

    // Enter a valid word
    const input = screen.getByPlaceholderText(/customPuzzle.enterWordPlaceholder/i);
    await user.type(input, 'TESTING');

    // Click create puzzle button
    const createButton = screen.getByRole('button', { name: /customPuzzle.createPuzzle/i });
    await user.click(createButton);

    // Wait for game component to appear
    await waitFor(() => {
      expect(screen.getByTestId('game-component')).toBeInTheDocument();
    });

    // Complete the game
    const completeButton = screen.getByText('Complete Game');
    await user.click(completeButton);

    // Wait for share phase
    await waitFor(() => {
      expect(screen.getByText(/customPuzzle.created/i)).toBeInTheDocument();
    });

    // Score should be displayed as whole number (87), not with decimals (87.456789)
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.queryByText(/87\.456/)).not.toBeInTheDocument();
  });
});
