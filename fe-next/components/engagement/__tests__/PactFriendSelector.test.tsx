/**
 * PactFriendSelector Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PactFriendSelector } from '../PactFriendSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWordPact } from '@/hooks/useWordPact';

// Mock Supabase chain
const mockSingle = vi.fn();
const mockIn = vi.fn().mockResolvedValue({ data: [] });
const mockEq = vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ single: mockSingle }), in: mockIn });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, in: mockIn });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useWordPact');
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'wordPact.selectFriend': 'Choose a friend',
    'wordPact.invite': 'Invite',
    'wordPact.alreadyInPact': 'Already in a pact',
    'friendsActivity.empty': 'Add friends to see their activity',
  };
  return translations[key] ?? key;
};

const mockCreatePact = vi.fn();

describe('PactFriendSelector', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue({ t: mockT });
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useWordPact as jest.Mock).mockReturnValue({ createPact: mockCreatePact });
  });

  it('renders the modal with title', async () => {
    // No friends
    mockEq.mockReturnValueOnce({
      or: vi.fn().mockReturnValue({
        single: vi.fn(),
      }),
    });

    render(<PactFriendSelector onClose={onClose} />);
    expect(screen.getByText('Choose a friend')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(<PactFriendSelector onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-selector-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    render(<PactFriendSelector onClose={onClose} />);
    fireEvent.click(screen.getByTestId('pact-friend-selector'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when no friends', async () => {
    // Mock: friends query returns empty
    const mockOrReturn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({ or: mockOrReturn }),
    });

    render(<PactFriendSelector onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Add friends to see their activity')).toBeInTheDocument();
    });
  });
});
