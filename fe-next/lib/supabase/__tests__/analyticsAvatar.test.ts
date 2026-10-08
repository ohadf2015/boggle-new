import { describe, it, expect } from 'vitest';
import { avatarForProgress } from '../analyticsClassroom';

describe('avatarForProgress', () => {
  it('Given an avatar_config object and an emoji default, When picked, Then the emoji is used and the object never leaks', () => {
    expect(avatarForProgress({ avatar_config: { hat: 'crown' }, avatar_emoji: '😊' })).toBe('😊');
  });

  it('Given an image URL in avatar_config, When picked, Then the URL is used', () => {
    expect(avatarForProgress({ avatar_config: '/avatars/fox.png', avatar_emoji: '😊' })).toBe('/avatars/fox.png');
  });

  it('Given neither field is usable, When picked, Then null', () => {
    expect(avatarForProgress({ avatar_config: null, avatar_emoji: '  ' })).toBeNull();
  });
});
