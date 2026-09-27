'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrCreateStoredCustomAvatar,
  getOrCreateStoredUsername,
  setStoredCustomAvatar,
  setStoredUsername,
} from '@/utils/profileStorage';
import { validateUsername } from '@/utils/validation';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface EntryIdentityInput {
  isAuthenticated: boolean;
  displayName: string | null | undefined;
  profileAvatar?: CustomAvatarConfig | null;
}

const SAVED_STAMP_MS = 1400;

/**
 * The player's identity on the entry — name + avatar — resolved AFTER mount and
 * AFTER auth. The entry is SSR'd: reading localStorage during render would be a
 * hydration mismatch, and rendering a guest identity while auth is still
 * loading would flash a guest name/avatar at a signed-in player (pitfall
 * class 1). Until then `ready` is false and the caller renders a placeholder.
 *
 * Writes go where the create/join sheets read from: guests → profileStorage,
 * signed-in → the profile (display_name / avatar_config). A signed-in avatar is
 * never randomised — it can hold purchased parts.
 */
export function useEntryIdentity({ isAuthenticated, displayName, profileAvatar }: EntryIdentityInput) {
  const { loading: authLoading, profile, updateProfile } = useAuth() as ReturnType<typeof useAuth> & { loading?: boolean };
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<CustomAvatarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const committedRef = useRef('');

  useEffect(() => setMounted(true), []);

  const ready = mounted && !authLoading;

  // Resolve (and re-resolve when the account changes) once auth has settled.
  useEffect(() => {
    if (!ready) return;
    const next = isAuthenticated && displayName ? displayName : getOrCreateStoredUsername(language || 'en');
    committedRef.current = next;
    setName(next);
    setError(null);
    setAvatar(isAuthenticated ? (profileAvatar ?? getOrCreateStoredCustomAvatar()) : getOrCreateStoredCustomAvatar());
  }, [ready, isAuthenticated, displayName, profileAvatar, language]);

  useEffect(() => {
    if (savedAt === null) return undefined;
    const id = setTimeout(() => setSavedAt(null), SAVED_STAMP_MS);
    return () => clearTimeout(id);
  }, [savedAt]);

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === committedRef.current) {
      setError(null);
      return;
    }
    const v = validateUsername(trimmed);
    if (!v.isValid) {
      setError(v.error ?? 'validation.usernameRequired');
      return;
    }
    setError(null);
    committedRef.current = trimmed;
    setName(trimmed);
    if (isAuthenticated) {
      updateProfile?.({ display_name: trimmed })?.catch?.(() => {});
    } else {
      setStoredUsername(trimmed);
    }
    setSavedAt(Date.now());
  }, [name, isAuthenticated, updateProfile]);

  const saveAvatar = useCallback(
    (config: CustomAvatarConfig) => {
      setAvatar(config);
      setStoredCustomAvatar(config);
      if (isAuthenticated) updateProfile?.({ avatar_config: config })?.catch?.(() => {});
    },
    [isAuthenticated, updateProfile],
  );

  /** Guests only: a fresh random avatar. */
  const reroll = useCallback(() => {
    if (isAuthenticated) return;
    const next = getRandomAvatarConfig();
    setAvatar(next);
    setStoredCustomAvatar(next);
  }, [isAuthenticated]);

  const rating = isAuthenticated ? ((profile as { ranked_mmr?: number | null } | null)?.ranked_mmr ?? null) : null;

  return {
    ready,
    name,
    setName: (v: string) => {
      setName(v);
      if (error) setError(null);
    },
    commitName,
    error,
    saved: savedAt !== null,
    avatar,
    saveAvatar,
    reroll,
    canReroll: !isAuthenticated,
    rating,
  };
}
