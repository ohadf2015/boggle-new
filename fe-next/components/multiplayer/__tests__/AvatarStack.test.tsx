/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AvatarStack from '../AvatarStack';
import type { RoomPlayerAvatar } from '@/shared/types/game';

// Mock Avatar component to avoid SVG rendering complexity
vi.mock('@/components/Avatar', () => ({
  default: function MockAvatar({ userId, size }: { userId?: string; size?: string }) {
    return <div data-testid="avatar" data-userid={userId} data-size={size} />;
  },
}));

const makeAvatars = (count: number): RoomPlayerAvatar[] =>
  Array.from({ length: count }, (_, i) => ({
    username: `player-${i}`,
    avatarImage: `avatar-${i}`,
  }));

describe('AvatarStack', () => {
  it('renders nothing when avatars array is empty', () => {
    const { container } = render(
      <AvatarStack avatars={[]} totalCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correct number of avatars up to maxVisible', () => {
    render(
      <AvatarStack avatars={makeAvatars(3)} totalCount={3} maxVisible={4} />
    );
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(3);
  });

  it('limits visible avatars to maxVisible', () => {
    render(
      <AvatarStack avatars={makeAvatars(5)} totalCount={6} maxVisible={3} />
    );
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(3);
  });

  it('shows overflow indicator when totalCount exceeds visible', () => {
    render(
      <AvatarStack avatars={makeAvatars(3)} totalCount={7} maxVisible={3} />
    );
    const overflow = screen.getByTestId('avatar-stack-overflow');
    expect(overflow).toHaveTextContent('+4');
  });

  it('does not show overflow when all players are visible', () => {
    render(
      <AvatarStack avatars={makeAvatars(2)} totalCount={2} maxVisible={4} />
    );
    expect(screen.queryByTestId('avatar-stack-overflow')).toBeNull();
  });

  it('passes username as userId to Avatar', () => {
    render(
      <AvatarStack avatars={[{ username: 'alice' }]} totalCount={1} />
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveAttribute('data-userid', 'alice');
  });

  it('has data-testid="avatar-stack" on container', () => {
    render(
      <AvatarStack avatars={makeAvatars(1)} totalCount={1} />
    );
    expect(screen.getByTestId('avatar-stack')).toBeInTheDocument();
  });
});
