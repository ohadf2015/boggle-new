import { describe, it, expect } from 'vitest';
import { resolveChallengerIdentity } from '../challengerIdentity';
import { getSeededAvatarConfig } from '@/shared/types/customAvatar';

const FALLBACK = 'A challenger';

describe('resolveChallengerIdentity', () => {
  it('prefers display_name, carries avatar_config', () => {
    const avatar = getSeededAvatarConfig(5);
    const id = resolveChallengerIdentity(
      { display_name: 'Ada Lovelace', username: 'ada', avatar_config: avatar },
      FALLBACK,
    );
    expect(id).toEqual({ name: 'Ada Lovelace', avatar });
  });

  it('falls back to username when display_name is missing/blank', () => {
    expect(resolveChallengerIdentity({ username: 'ada' }, FALLBACK).name).toBe('ada');
    expect(resolveChallengerIdentity({ display_name: '   ', username: 'ada' }, FALLBACK).name).toBe('ada');
  });

  it('uses the fallback name for a null/empty profile and omits avatar', () => {
    expect(resolveChallengerIdentity(null, FALLBACK)).toEqual({ name: FALLBACK });
    expect(resolveChallengerIdentity(undefined, FALLBACK)).toEqual({ name: FALLBACK });
    expect(resolveChallengerIdentity({}, FALLBACK)).toEqual({ name: FALLBACK });
  });

  it('omits the avatar key when avatar_config is null/undefined', () => {
    const id = resolveChallengerIdentity({ display_name: 'Ada', avatar_config: null }, FALLBACK);
    expect(id.name).toBe('Ada');
    expect(id).not.toHaveProperty('avatar');
  });
});
