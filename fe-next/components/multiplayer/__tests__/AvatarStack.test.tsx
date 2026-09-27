/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AvatarStack from '../AvatarStack';
import type { RoomPlayerAvatar } from '@/shared/types/game';
import { getSeededAvatarConfig, getRandomAvatarConfig, hashString } from '@/shared/types/customAvatar';

// The stack renders the (static) renderer directly: the lazy components/Avatar
// wrapper would put an async loader in EntryScreen's SSR'd chunk group
// (see entry/__tests__/entryChunkGroup.test.ts). Mock it to avoid SVG rendering.
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  default: function MockAvatarRenderer({ config, size }: { config: unknown; size?: number }) {
    return <div data-testid="avatar" data-config={JSON.stringify(config)} data-size={size} />;
  },
}));

const makeAvatars = (count: number): RoomPlayerAvatar[] =>
  Array.from({ length: count }, (_, i) => ({
    username: `player-${i}`,
    avatarImage: `avatar-${i}`,
  }));

const configOf = (el: HTMLElement) => JSON.parse(el.getAttribute('data-config') || 'null');

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

  it('uses the username as the identity seed (the userId Avatar used to get)', () => {
    render(
      <AvatarStack avatars={[{ username: 'alice' }]} totalCount={1} />
    );
    const avatar = screen.getByTestId('avatar');
    expect(configOf(avatar)).toEqual(getSeededAvatarConfig(hashString('alice')));
  });

  it("renders the player's own avatar when the room payload carries one", () => {
    const own = getRandomAvatarConfig();
    render(
      <AvatarStack avatars={[{ username: 'bob', customAvatar: own }]} totalCount={1} />
    );
    expect(configOf(screen.getByTestId('avatar'))).toEqual(own);
  });

  it('seeds a nameless player from their seat, so two of them never share a face by accident', () => {
    render(
      <AvatarStack avatars={[{}, {}]} totalCount={2} />
    );
    const [a, b] = screen.getAllByTestId('avatar');
    expect(configOf(a)).toEqual(getSeededAvatarConfig(hashString('room-player-0')));
    expect(configOf(b)).toEqual(getSeededAvatarConfig(hashString('room-player-1')));
  });

  it('scales 1.5x on a TV (DESIGN §b: every size token), faces and the +N chip alike', () => {
    render(
      <AvatarStack avatars={makeAvatars(3)} totalCount={5} maxVisible={3} />
    );
    const face = screen.getAllByTestId('avatar')[0].parentElement!;
    expect(face.className).toMatch(/(^|\s)w-6(\s|$)/);
    expect(face.className).toMatch(/(^|\s)tv:w-9(\s|$)/);
    expect(face.className).toMatch(/(^|\s)tv:h-9(\s|$)/);
    expect(screen.getByTestId('avatar-stack-overflow').className).toMatch(/(^|\s)tv:w-9(\s|$)/);
  });

  it('has data-testid="avatar-stack" on container', () => {
    render(
      <AvatarStack avatars={makeAvatars(1)} totalCount={1} />
    );
    expect(screen.getByTestId('avatar-stack')).toBeInTheDocument();
  });
});
