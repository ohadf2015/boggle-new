/**
 * InvalidWordsManager Component Tests
 *
 * Tests for the admin invalid words review component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const {
      whileHover, whileTap, animate, initial, exit, transition,
      variants, layout, layoutId, ...rest
    } = props;
    return rest;
  };
  return {
    motion: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...stripFramerProps(props)}>{children}</div>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<{ mode?: string }>) => <>{children}</>,
  };
});

// Mock useDevicePerformance hook
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableComplexAnimations: false,
    enableParticles: false,
    devicePerformance: 'low',
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'admin.invalidWords.title': 'Invalid Words Review',
    'admin.invalidWords.subtitle': 'Words submitted 3+ times but not validated',
    'admin.invalidWords.pendingReview': 'Pending Review',
    'admin.invalidWords.approved': 'Approved',
    'admin.invalidWords.approve': 'Approve',
    'admin.invalidWords.dismiss': 'Dismiss',
    'admin.invalidWords.noResults': 'No invalid words meeting threshold',
    'admin.invalidWords.reasons.not_on_board': 'Not on board',
    'admin.invalidWords.reasons.not_in_dictionary': 'Not in dictionary',
    'admin.invalidWords.reasons.peer_rejected': 'Peer rejected',
  };
  return translations[key] || key;
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks
import { InvalidWordsManager } from '../InvalidWordsManager';
import toast from 'react-hot-toast';

describe('InvalidWordsManager', () => {
  const mockAuthToken = 'test-auth-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockInvalidWordsResponse = {
    words: [
      {
        id: '1',
        word: 'testword',
        language: 'en',
        submission_count: 5,
        reason: 'not_in_dictionary',
        first_submitted_at: '2026-01-20T00:00:00Z',
        last_submitted_at: '2026-01-22T00:00:00Z',
        approved_at: null,
      },
      {
        id: '2',
        word: 'anotherword',
        language: 'en',
        submission_count: 3,
        reason: 'peer_rejected',
        first_submitted_at: '2026-01-19T00:00:00Z',
        last_submitted_at: '2026-01-21T00:00:00Z',
        approved_at: null,
      },
    ],
    total: 2,
    stats: {
      total: 5,
      pending: 2,
      approved: 3,
    },
    pagination: {
      limit: 50,
      offset: 0,
      hasMore: false,
    },
  };

  it('renders component without crashing', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    // Simply verify the component renders without throwing
    expect(() => render(<InvalidWordsManager authToken={mockAuthToken} />)).not.toThrow();
  });

  it('renders invalid words when data is loaded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    expect(screen.getByText('anotherword')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('renders stats cards correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Stats should show pending count
    expect(screen.getByText('2')).toBeInTheDocument();
    // Stats should show approved count
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders empty state when no words meet threshold', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        words: [],
        total: 0,
        stats: { total: 0, pending: 0, approved: 0 },
        pagination: { limit: 50, offset: 0, hasMore: false },
      }),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText(/No invalid words meeting the threshold/i)).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load invalid words');
    });
  });

  it('calls approve API when approve button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, votesAdded: 10 }),
      });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Find and click the first Approve button
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/invalid-words/approve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ word: 'testword', language: 'en', addToDictionary: false }),
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Approved "testword"');
  });

  it('calls dismiss API when dismiss button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Find the dismiss (X) button for the first word - it's the button with just an X icon
    const dismissButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg.lucide-x') || btn.textContent === ''
    );

    // Click the first dismiss button (for testword)
    if (dismissButtons[0]) {
      fireEvent.click(dismissButtons[0]);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/invalid-words/dismiss',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('renders language filter select', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Verify the language filter select exists by finding the trigger button
    // Radix UI Select components render as buttons with specific attributes
    const selectTriggers = screen.getAllByRole('combobox');
    expect(selectTriggers.length).toBeGreaterThan(0);
  });

  it('passes auth token in request headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/invalid-words'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthToken}`,
          }),
        })
      );
    });
  });

  it('displays reason badges for each word', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Check for reason badges - they show translated labels
    expect(screen.getByText('Not in dictionary')).toBeInTheDocument();
    expect(screen.getByText('Peer rejected')).toBeInTheDocument();
  });

  it('displays language badges for each word', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInvalidWordsResponse),
    });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Both words are in English
    const englishBadges = screen.getAllByText('English');
    expect(englishBadges.length).toBe(2);
  });

  it('removes word from list after successful approval', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, votesAdded: 10 }),
      });

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Click approve on first word
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    // Wait for the word to be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('testword')).not.toBeInTheDocument();
    });

    // The other word should still be there
    expect(screen.getByText('anotherword')).toBeInTheDocument();
  });

  // Selection functionality tests
  describe('Selection functionality', () => {
    it('renders checkbox for each word', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      });

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2); // One for each word
    });

    it('toggles selection when checkbox is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      });

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(checkboxes[0]).toBeChecked();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('selects all words when Select All is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      });

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /select all/i }));

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('clears all selections when Clear Selection is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvalidWordsResponse),
      });

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select all first
      fireEvent.click(screen.getByRole('button', { name: /select all/i }));
      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // Clear selection
      fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });

    it('removes word from selection after approval', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockInvalidWordsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, votesAdded: 10 }),
        });

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select the word
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Approve the word
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      fireEvent.click(approveButtons[0]);

      // Wait for word to be removed
      await waitFor(() => {
        expect(screen.queryByText('testword')).not.toBeInTheDocument();
      });

      // Selection count should update (word removed from list and selection)
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });
});
