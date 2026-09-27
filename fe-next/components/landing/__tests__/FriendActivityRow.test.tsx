/**
 * FriendActivityRow Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FriendActivityRow } from '../FriendActivityRow';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'friendsActivity.scored') return `scored ${params?.score} on Daily #${params?.number}`;
      if (key === 'friendsActivity.beatYou') return 'Beat your score!';
      if (key === 'friendsActivity.blastWords') return `found ${params?.count} words in Blast`;
      return key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/Avatar', () => {
  const MockAvatar = ({ userId }: { userId?: string }) => {
    return <div data-testid="avatar" data-user-id={userId} />;
  };
  return { default: MockAvatar };
});

describe('FriendActivityRow', () => {
  const baseEvent = {
    friendId: 'u2',
    friendName: 'WordWiz',
    friendAvatar: null as string | null,
    friendAvatarConfig: null,
    actionKey: 'friendsActivity.scored',
    actionParams: { score: 420, number: 42 },
    timeAgo: '5m ago',
    mode: 'daily_challenge' as const,
    beatPlayer: false,
  };

  it('should render friend name', () => {
    render(<FriendActivityRow event={baseEvent} />);
    expect(screen.getByText('WordWiz')).toBeInTheDocument();
  });

  it('should render action text', () => {
    render(<FriendActivityRow event={baseEvent} />);
    expect(screen.getByText('scored 420 on Daily #42')).toBeInTheDocument();
  });

  it('should render time ago', () => {
    render(<FriendActivityRow event={baseEvent} />);
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('should render avatar with userId', () => {
    render(<FriendActivityRow event={baseEvent} />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveAttribute('data-user-id', 'u2');
  });

  it('should highlight row when friend beat player score', () => {
    const beatEvent = { ...baseEvent, beatPlayer: true };
    render(<FriendActivityRow event={beatEvent} />);
    expect(screen.getByText('Beat your score!')).toBeInTheDocument();
  });

  it('should not show beat badge when beatPlayer is false', () => {
    render(<FriendActivityRow event={baseEvent} />);
    expect(screen.queryByText('Beat your score!')).not.toBeInTheDocument();
  });
});
