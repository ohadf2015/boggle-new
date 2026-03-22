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
const mockSingle = jest.fn();
const mockIn = jest.fn().mockResolvedValue({ data: [] });
const mockEq = jest.fn().mockReturnValue({ or: jest.fn().mockReturnValue({ single: mockSingle }), in: mockIn });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, in: mockIn });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

jest.mock('@/contexts/LanguageContext');
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useWordPact');
jest.mock('@/lib/utils', () => ({
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

const mockCreatePact = jest.fn();

describe('PactFriendSelector', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue({ t: mockT });
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useWordPact as jest.Mock).mockReturnValue({ createPact: mockCreatePact });
  });

  it('renders the modal with title', async () => {
    // No friends
    mockEq.mockReturnValueOnce({
      or: jest.fn().mockReturnValue({
        single: jest.fn(),
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
    const mockOrReturn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockSelect.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({ or: mockOrReturn }),
    });

    render(<PactFriendSelector onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Add friends to see their activity')).toBeInTheDocument();
    });
  });
});
