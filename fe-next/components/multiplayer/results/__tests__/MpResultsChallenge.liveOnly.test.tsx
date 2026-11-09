import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChallengeInviteDialog } from '@/components/friends/ChallengeInviteDialog';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string) => k,
  }),
}));

describe('ChallengeInviteDialog allowedFlows (results live-only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to live and hides async when only live is allowed', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <ChallengeInviteDialog
        isOpen
        friendUsername="Maya"
        friendId="friend-1"
        onClose={vi.fn()}
        onSendChallenge={onSend}
        allowedFlows={['live']}
      />,
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByTestId('challenge-flow-hint').textContent).toContain('friends.challenges.live.subcopy');
  });

  it('sends flow:live on confirm so parent ack path runs', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <ChallengeInviteDialog
        isOpen
        friendUsername="Maya"
        friendId="friend-1"
        onClose={vi.fn()}
        onSendChallenge={onSend}
        allowedFlows={['live']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /friends.challenges.cta/i }));
    await waitFor(() => expect(onSend).toHaveBeenCalled());
    const [, , settings] = onSend.mock.calls[0];
    expect(settings.flow).toBe('live');
    expect(settings.flow).not.toBe('async');
  });
});
