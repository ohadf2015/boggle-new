import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomPuzzleCreator from '../CustomPuzzleCreator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/contexts/LanguageContext');
jest.mock('@/contexts/AuthContext');
jest.mock('@/utils/dailyChallenge', () => ({
  getGuestFingerprint: jest.fn().mockResolvedValue('test-fingerprint'),
}));

// Mock DailyWordHuntSurvival component
jest.mock('@/components/daily/DailyWordHuntSurvival', () => {
  return function MockDailyWordHuntSurvival({ onComplete }: any) {
    return (
      <div data-testid="game-component">
        <button onClick={() => onComplete({
          solved: true,
          attemptsUsed: 3,
          wordsDiscovered: ['WORD', 'TEST'],
          lifeRemaining: 5,
          efficiencyScore: 95,
        })}>Complete Game</button>
      </div>
    );
  };
});

describe('CustomPuzzleCreator - Grid Size', () => {
  const mockOnClose = jest.fn();
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();

    (useLanguage as jest.Mock).mockReturnValue({
      t: mockT,
      language: 'en',
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      profile: { display_name: 'Test User' },
    });

    // Mock fetch for grid generation
    global.fetch = jest.fn((url) => {
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
    jest.restoreAllMocks();
  });

  it('should always request 7x7 grid when creating custom puzzle', async () => {
    const user = userEvent.setup();

    // Mock matchMedia for framer-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <CustomPuzzleCreator
        isOpen={true}
        onClose={mockOnClose}
        language="en"
      />
    );

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
    const user = userEvent.setup();

    render(
      <CustomPuzzleCreator
        isOpen={true}
        onClose={mockOnClose}
        language="en"
      />
    );

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

    // Verify share functionality is displayed
    expect(screen.getByRole('button', { name: /customPuzzle.share/i })).toBeInTheDocument();
    expect(screen.getByText(/TEST123/)).toBeInTheDocument(); // Puzzle code should be visible
  });
});
