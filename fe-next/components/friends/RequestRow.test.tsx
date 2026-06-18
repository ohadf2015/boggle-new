// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RequestRow } from './RequestRow';

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

const base = {
  requestId: '11111111-1111-1111-1111-111111111111',
  fromUserId: '22222222-2222-2222-2222-222222222222',
  fromUsername: 'Player_22222222',
  fromAvatar: { emoji: '😊', color: '#4F46E5' },
  toUserId: '33333333-3333-3333-3333-333333333333',
  toUsername: 'me',
  status: 'pending' as const,
  createdAt: 0,
  expiresAt: 0,
};

describe('RequestRow — never shows a system placeholder username', () => {
  it('shows the localized "a player" fallback instead of Player_<hex>', () => {
    render(
      <RequestRow request={base} isDark isLoading={false} onAccept={vi.fn()} onDecline={vi.fn()} language="en" />
    );
    expect(screen.queryByText('Player_22222222')).not.toBeInTheDocument();
    expect(screen.getByText('a player')).toBeInTheDocument();
  });

  it('prefers a real display name when present', () => {
    render(
      <RequestRow
        request={{ ...base, fromDisplayName: 'Lior' }}
        isDark
        isLoading={false}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        language="en"
      />
    );
    expect(screen.getByText('Lior')).toBeInTheDocument();
  });

  it('shows a real username verbatim', () => {
    render(
      <RequestRow
        request={{ ...base, fromUsername: 'wordsmith' }}
        isDark
        isLoading={false}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        language="en"
      />
    );
    expect(screen.getByText('wordsmith')).toBeInTheDocument();
  });
});
