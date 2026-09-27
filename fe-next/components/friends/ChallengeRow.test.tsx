// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChallengeRow } from './ChallengeRow';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

const challenge = {
  // uuid primary key — what every backend accept/decline path queries by (.eq('id', ...))
  id: 'f2243c74-2fa5-4dc2-a367-7636450fe136',
  challengerId: 'ad09bebc-a2bd-437f-a612-39b06a9d59ae',
  challengerUsername: 'Player_ad09bebc',
  challengerAvatarEmoji: '😊',
  challengerAvatarColor: '#4F46E5',
  // room code — NOT a valid uuid; passing this to the backend throws
  challengeId: 'HKJMZ7',
  challengeCode: 'HKJMZ7',
  status: 'pending' as const,
  createdAt: '2026-05-13T20:45:04.664Z',
};

describe('ChallengeRow — never shows a system placeholder username', () => {
  it('shows the localized "a player" fallback instead of Player_<hex>', () => {
    render(
      <ChallengeRow challenge={challenge} isDark onAccept={vi.fn()} onDecline={vi.fn()} />
    );
    expect(screen.queryByText('Player_ad09bebc')).not.toBeInTheDocument();
    expect(screen.getByText('a player')).toBeInTheDocument();
  });

  it('prefers a real display name when present', () => {
    render(
      <ChallengeRow
        challenge={{ ...challenge, challengerDisplayName: 'Maya' }}
        isDark
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.queryByText('Player_ad09bebc')).not.toBeInTheDocument();
  });

  it('shows a real username verbatim', () => {
    render(
      <ChallengeRow
        challenge={{ ...challenge, challengerUsername: 'wordwizard' }}
        isDark
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText('wordwizard')).toBeInTheDocument();
  });
});

describe('ChallengeRow — accept/decline pass the uuid, not the room code', () => {
  it('calls onAccept with the challenge uuid (challenge.id)', async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    render(
      <ChallengeRow challenge={challenge} isDark onAccept={onAccept} onDecline={vi.fn()} />
    );

    fireEvent.click(screen.getByLabelText('Accept'));

    await waitFor(() => expect(onAccept).toHaveBeenCalledWith(challenge.id));
  });

  it('calls onDecline with the challenge uuid (challenge.id)', async () => {
    const onDecline = vi.fn().mockResolvedValue(undefined);
    render(
      <ChallengeRow challenge={challenge} isDark onAccept={vi.fn()} onDecline={onDecline} />
    );

    fireEvent.click(screen.getByLabelText('Decline'));

    await waitFor(() => expect(onDecline).toHaveBeenCalledWith(challenge.id));
  });
});
