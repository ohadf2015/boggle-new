/**
 * InvalidWordsManager Component Tests
 *
 * Tests for the admin invalid words review component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const stripFramerProps = (props: Record<string, unknown>) => {
    const {
      whileHover, whileTap, animate, initial, exit, transition,
      variants, layout, layoutId, ...rest
    } = props;
    return rest;
  };
  return {
    m: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...stripFramerProps(props)}>{children}</div>
      ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<{ mode?: string }>) => <>{children}</>,
  };
});

// Mock AlertDialog component for BulkApproveButton
// This mock simulates Radix AlertDialog behavior: always render trigger, conditionally render content
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) => {
    // Filter children to find trigger and content
    const childArray = React.Children.toArray(children);
    // Find trigger and content components
    const trigger = childArray.find((child: React.ReactNode) => {
      if (React.isValidElement(child)) {
        // Check for our mocked components by displayName or type
        const c = child as React.ReactElement<{ 'data-testid'?: string }>;
        return c.props['data-testid'] === 'alert-dialog-trigger' || (child.type as { displayName?: string })?.displayName === 'AlertDialogTrigger';
      }
      return false;
    });
    const content = childArray.find((child: React.ReactNode) => {
      if (React.isValidElement(child)) {
        const c = child as React.ReactElement<{ 'data-testid'?: string }>;
        return c.props['data-testid'] === 'alert-dialog-content' || (child.type as { displayName?: string })?.displayName === 'AlertDialogContent';
      }
      return false;
    });

    // Always render trigger, only render content when open
    return (
      <>
        {trigger}
        {open && content}
      </>
    );
  },
  AlertDialogTrigger: Object.assign(
    ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean }>) => (
      <span data-testid="alert-dialog-trigger">{asChild ? children : <button>{children}</button>}</span>
    ),
    { displayName: 'AlertDialogTrigger' }
  ),
  AlertDialogContent: Object.assign(
    ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div role="alertdialog" data-testid="alert-dialog-content" className={className}>{children}</div>
    ),
    { displayName: 'AlertDialogContent' }
  ),
  AlertDialogHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  AlertDialogFooter: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  AlertDialogTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <h2 className={className}>{children}</h2>
  ),
  AlertDialogDescription: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <p className={className}>{children}</p>
  ),
  AlertDialogAction: ({ children, onClick, className }: React.PropsWithChildren<{ onClick?: () => void; className?: string }>) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  AlertDialogCancel: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <button className={className}>{children}</button>
  ),
}));

// Mock useDevicePerformance hook
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: true,
    enableComplexAnimations: false,
    enableParticles: false,
    devicePerformance: 'low',
  }),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
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
    'languages.english': 'English',
    'languages.hebrew': 'Hebrew',
    'languages.swedish': 'Swedish',
    'languages.japanese': 'Japanese',
    'languages.spanish': 'Spanish',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Import after mocks
import { InvalidWordsManager } from '../InvalidWordsManager';
import toast from 'react-hot-toast';

describe('InvalidWordsManager', () => {
  const mockAuthToken = 'test-auth-token';

  const mockAutoPromoteStatsResponse = {
    autoPromoted: 5,
    candidates: 3,
    bySource: { submission_threshold: 3, milog_verified: 2 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Register default handlers — return standard mock data for both endpoints
    server.use(
      http.get('*/api/admin/invalid-words/auto-promote-stats*', () =>
        HttpResponse.json(mockAutoPromoteStatsResponse)
      ),
      http.get('*/api/admin/invalid-words*', () =>
        HttpResponse.json(mockInvalidWordsResponse)
      )
    );
  });

  afterEach(() => {
    // Clean up any pending promises and timers
    vi.clearAllTimers();
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
    // Simply verify the component renders without throwing
    expect(() => render(<InvalidWordsManager authToken={mockAuthToken} />)).not.toThrow();
  });

  it('renders invalid words when data is loaded', async () => {
    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    expect(screen.getByText('anotherword')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('renders stats cards correctly', async () => {
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
    server.use(
      http.get('*/api/admin/invalid-words*', () =>
        HttpResponse.json({ words: [], total: 0, stats: { total: 0, pending: 0, approved: 0 }, pagination: { limit: 50, offset: 0, hasMore: false } })
      )
    );

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText(/No invalid words meeting the threshold/i)).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    server.use(
      http.get('*/api/admin/invalid-words*', () => new HttpResponse(null, { status: 500 }))
    );

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load invalid words');
    });
  });

  it('calls approve API when approve button is clicked', async () => {
    let capturedApproveBody: unknown = null;
    server.use(
      http.post('*/api/admin/invalid-words/approve*', async ({ request }) => {
        capturedApproveBody = await request.json();
        return HttpResponse.json({ success: true, votesAdded: 10 });
      })
    );

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Find the Approve button in the card (exact text "Approve", not "Bulk Approve")
    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(capturedApproveBody).toMatchObject({ word: 'testword', language: 'en', addToDictionary: false });
    });

    expect(toast.success).toHaveBeenCalledWith('Approved "testword"');
  });

  it('calls dismiss API when dismiss button is clicked', async () => {
    let dismissCalled = false;
    server.use(
      http.post('*/api/admin/invalid-words/dismiss*', () => {
        dismissCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

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
      expect(dismissCalled).toBe(true);
    });
  });

  it('renders language filter select', async () => {
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
    let capturedAuth: string | null = null;
    server.use(
      http.get('*/api/admin/invalid-words*', ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json(mockInvalidWordsResponse);
      })
    );

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(capturedAuth).toBe(`Bearer ${mockAuthToken}`);
    });
  });

  it('displays reason badges for each word', async () => {
    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Check for reason badges - they show translated labels
    expect(screen.getByText('Not in dictionary')).toBeInTheDocument();
    expect(screen.getByText('Peer rejected')).toBeInTheDocument();
  });

  it('displays language badges for each word', async () => {
    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Both words are in English
    const englishBadges = screen.getAllByText('English');
    expect(englishBadges.length).toBe(2);
  });

  it('removes word from list after successful approval', async () => {
    server.use(
      http.post('*/api/admin/invalid-words/approve*', () =>
        HttpResponse.json({ success: true, votesAdded: 10 })
      )
    );

    render(<InvalidWordsManager authToken={mockAuthToken} />);

    await waitFor(() => {
      expect(screen.getByText('testword')).toBeInTheDocument();
    });

    // Click approve on first word (exact match to avoid matching Bulk Approve)
    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
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
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2); // One for each word
    });

    it('toggles selection when checkbox is clicked', async () => {
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
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select all first
      fireEvent.click(screen.getByRole('button', { name: /select all/i }));
      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // Clear selection
      fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });

    it('removes word from selection after approval', async () => {
      server.use(
        http.post('*/api/admin/invalid-words/approve*', () =>
          HttpResponse.json({ success: true, votesAdded: 10 })
        )
      );

      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select the word
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Approve the word (exact match to avoid matching Bulk Approve)
      const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
      fireEvent.click(approveButtons[0]);

      // Wait for word to be removed
      await waitFor(() => {
        expect(screen.queryByText('testword')).not.toBeInTheDocument();
      });

      // Selection count should update (word removed from list and selection)
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  // BulkApproveButton integration tests
  describe('BulkApproveButton integration', () => {
    it('renders BulkApproveButton in toolbar when words are loaded', async () => {
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // BulkApproveButton should be rendered with initial count of 0
      expect(screen.getByRole('button', { name: /bulk approve/i })).toBeInTheDocument();
    });

    it('BulkApproveButton shows selected count in label', async () => {
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select both words
      fireEvent.click(screen.getByRole('button', { name: /select all/i }));

      // BulkApproveButton should show count of 2
      expect(screen.getByRole('button', { name: /bulk approve \(2\)/i })).toBeInTheDocument();
    });

    it('BulkApproveButton is disabled when no words are selected', async () => {
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // BulkApproveButton should be disabled
      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i });
      expect(bulkApproveButton).toBeDisabled();
    });

    it('BulkApproveButton is enabled when words are selected', async () => {
      render(<InvalidWordsManager authToken={mockAuthToken} />);

      await waitFor(() => {
        expect(screen.getByText('testword')).toBeInTheDocument();
      });

      // Select a word
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // BulkApproveButton should be enabled
      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve \(1\)/i });
      expect(bulkApproveButton).not.toBeDisabled();
    });
  });
});
