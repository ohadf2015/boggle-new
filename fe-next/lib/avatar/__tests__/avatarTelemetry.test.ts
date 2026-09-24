import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

import {
  trackAvatarEditorOpened,
  trackAvatarPartChanged,
  trackAvatarSaved,
  trackAvatarUnlockRevealed,
  trackProfileViewed,
  countChangedFields,
  editorSourceFromPath,
} from '../avatarTelemetry';

describe('avatar telemetry helpers', () => {
  beforeEach(() => track.mockClear());

  it('avatar_editor_opened carries the source', () => {
    trackAvatarEditorOpened('profile');
    expect(track).toHaveBeenCalledWith('avatar_editor_opened', { source: 'profile' });
  });

  it('avatar_part_changed carries category + rarity of the picked part', () => {
    trackAvatarPartChanged('eyes', 'galaxy');
    expect(track).toHaveBeenCalledWith('avatar_part_changed', { category: 'eyes', rarity: 'epic' });
    trackAvatarPartChanged('skinColor', '#FFDBB4');
    expect(track).toHaveBeenLastCalledWith('avatar_part_changed', { category: 'skinColor', rarity: 'common' });
  });

  it('avatar_saved carries changedCount + the avatar rarity', () => {
    const next = { ...DEFAULT_AVATAR_CONFIG, eyes: 'laser' as const, hair: 'lightning' as const };
    trackAvatarSaved(DEFAULT_AVATAR_CONFIG, next);
    expect(track).toHaveBeenCalledWith('avatar_saved', { changedCount: 2, rarityMax: 'epic' });
  });

  it('avatar_unlock_revealed summarises the reveal', () => {
    trackAvatarUnlockRevealed(
      [
        { category: 'accessory', partId: 'headphones', level: 2, rarity: 'rare' },
        { category: 'eyes', partId: 'heartEye', level: 6, rarity: 'epic' },
      ],
      6,
    );
    expect(track).toHaveBeenCalledWith('avatar_unlock_revealed', { count: 2, rarityMax: 'epic', level: 6 });
  });

  it('avatar_unlock_revealed does not fire for an empty reveal', () => {
    trackAvatarUnlockRevealed([], 3);
    expect(track).not.toHaveBeenCalled();
  });

  it('profile_viewed carries source + isOwn (keeps the legacy isPublicProfile prop)', () => {
    trackProfileViewed('header', true);
    expect(track).toHaveBeenCalledWith('profile_viewed', { source: 'header', isOwn: true, isPublicProfile: false });
    trackProfileViewed('leaderboard', false);
    expect(track).toHaveBeenLastCalledWith('profile_viewed', { source: 'leaderboard', isOwn: false, isPublicProfile: true });
  });

  it('counts changed fields between two configs', () => {
    expect(countChangedFields(DEFAULT_AVATAR_CONFIG, DEFAULT_AVATAR_CONFIG)).toBe(0);
    expect(countChangedFields(DEFAULT_AVATAR_CONFIG, { ...DEFAULT_AVATAR_CONFIG, bgColor: '#000000', mouth: 'grin' as never })).toBe(2);
  });

  it('derives an editor source from the route when no explicit source is given', () => {
    expect(editorSourceFromPath('/he/profile')).toBe('profile');
    expect(editorSourceFromPath('/profile')).toBe('profile');
    expect(editorSourceFromPath('/en/multiplayer')).toBe('multiplayer');
    expect(editorSourceFromPath('/sv')).toBe('home');
    expect(editorSourceFromPath('/')).toBe('home');
    expect(editorSourceFromPath('/ja/avatar-test')).toBe('avatar-test');
    expect(editorSourceFromPath(undefined)).toBe('unknown');
  });
});
