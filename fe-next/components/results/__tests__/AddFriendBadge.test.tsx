import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { ResultsFriendStatusProvider, AddFriendBadge } from '../ResultsFriendStatus';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const mockSendRequest = vi.fn(async () => ({ success: true }));
const mockSearchUsers = vi.fn(async (q: string) => ([{ id: `id-${q}`, odUserId: `od-${q}`, username: q, status: 'none' }]));

const friendsMock = vi.hoisted(() => ({
  friends: [] as Array<{ username: string }>,
  outgoingRequests: [] as Array<{ fromUsername: string }>,
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    ...friendsMock,
    sendRequest: mockSendRequest,
  }),
}));

vi.mock('@/utils/friends', () => ({
  searchUsers: (q: string) => mockSearchUsers(q),
}));

const authMock = vi.hoisted(() => ({ isAuthenticated: true, currentUsername: 'Me' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authMock.isAuthenticated,
    user: authMock.isAuthenticated ? { id: 'me-id', username: authMock.currentUsername } : null,
  }),
}));

function wrap(child: React.ReactNode) {
  return <ResultsFriendStatusProvider>{child}</ResultsFriendStatusProvider>;
}

describe('AddFriendBadge', () => {
  beforeEach(() => {
    friendsMock.friends = [];
    friendsMock.outgoingRequests = [];
    authMock.isAuthenticated = true;
    authMock.currentUsername = 'Me';
    mockSendRequest.mockClear();
    mockSearchUsers.mockClear();
  });

  it('renders nothing for bots', () => {
    const { container } = render(wrap(<AddFriendBadge username="BotX" isBot />));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when unauthenticated', () => {
    authMock.isAuthenticated = false;
    const { container } = render(wrap(<AddFriendBadge username="Alice" />));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for current user', () => {
    const { container } = render(wrap(<AddFriendBadge username="Me" />));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when target is already a friend', () => {
    friendsMock.friends = [{ username: 'Alice' }];
    const { container } = render(wrap(<AddFriendBadge username="Alice" />));
    expect(container.firstChild).toBeNull();
  });

  it('renders pending pill when outgoing request exists', () => {
    friendsMock.outgoingRequests = [{ fromUsername: 'Bob' }];
    render(wrap(<AddFriendBadge username="Bob" />));
    expect(screen.getByLabelText('results.requestSent')).toBeInTheDocument();
  });

  it('renders + button for non-friend and sends request on click', async () => {
    render(wrap(<AddFriendBadge username="Carol" />));
    const btn = screen.getByRole('button', { name: /add/i });
    expect(btn).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => expect(mockSendRequest).toHaveBeenCalledWith('od-Carol'));
    await waitFor(() => expect(screen.getByLabelText('results.requestSent')).toBeInTheDocument());
  });
});
