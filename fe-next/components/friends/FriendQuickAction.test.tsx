import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FriendQuickAction } from './FriendQuickAction';
import type { FriendRelation, FriendStatusValue } from './FriendStatusContext';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (key: string) => key }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const ctx = vi.hoisted(() => ({ value: null as null | Partial<FriendStatusValue> }));
vi.mock('./FriendStatusContext', () => ({ useFriendStatus: () => ctx.value }));

function setCtx(relation: FriendRelation, over: Partial<FriendStatusValue> = {}) {
  ctx.value = {
    isAuthenticated: true,
    canManage: true,
    canMessage: true,
    relationFor: () => relation,
    sendTo: vi.fn(async () => true),
    acceptFrom: vi.fn(async () => true),
    ...over,
  };
}

describe('FriendQuickAction', () => {
  it('renders nothing outside a provider', () => {
    ctx.value = null;
    const { container } = render(<FriendQuickAction userId="u1" name="Dana" surface="test" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for guests/bots without an id, and for the viewer', () => {
    setCtx('none');
    expect(render(<FriendQuickAction userId={null} name="Guest" surface="test" />).container).toBeEmptyDOMElement();
    setCtx('self');
    expect(render(<FriendQuickAction userId="me" name="Me" surface="test" />).container).toBeEmptyDOMElement();
  });

  it('sends a request from the add button', async () => {
    setCtx('none');
    render(<FriendQuickAction userId="u1" name="Dana" surface="global_leaderboard" />);
    fireEvent.click(screen.getByTestId('friend-quick-add'));
    await waitFor(() => expect(ctx.value!.sendTo).toHaveBeenCalledWith('u1', 'global_leaderboard'));
  });

  it('accepts an incoming request', async () => {
    setCtx('incoming');
    render(<FriendQuickAction userId="u1" name="Dana" surface="daily_leaderboard" />);
    fireEvent.click(screen.getByTestId('friend-quick-accept'));
    await waitFor(() => expect(ctx.value!.acceptFrom).toHaveBeenCalledWith('u1', 'daily_leaderboard'));
  });

  it('links a friend straight to the chat thread', () => {
    setCtx('friend');
    render(<FriendQuickAction userId="u 1" name="Dana" surface="test" />);
    expect(screen.getByTestId('friend-quick-chat')).toHaveAttribute('href', '/he/friends?tab=messages&friendUserId=u%201');
  });

  it('shows a sent marker for a pending request', () => {
    setCtx('sent');
    render(<FriendQuickAction userId="u1" name="Dana" surface="test" />);
    expect(screen.getByTestId('friend-quick-sent')).toBeInTheDocument();
  });

  it('hides add and chat when the Families Policy turns them off', () => {
    setCtx('none', { canManage: false, canMessage: false });
    expect(render(<FriendQuickAction userId="u1" name="Dana" surface="test" />).container).toBeEmptyDOMElement();
    setCtx('friend', { canManage: false, canMessage: false });
    expect(render(<FriendQuickAction userId="u1" name="Dana" surface="test" />).container).toBeEmptyDOMElement();
  });
});
