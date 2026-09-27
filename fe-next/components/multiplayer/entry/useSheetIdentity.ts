'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrCreateStoredCustomAvatar,
  getOrCreateStoredUsername,
  setStoredCustomAvatar,
  setStoredUsername,
} from '@/utils/profileStorage';
import { validateUsername } from '@/utils/validation';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface SheetIdentityInput {
  isOpen: boolean;
  isAuthenticated: boolean;
  displayName: string | null;
  profileAvatar?: CustomAvatarConfig | null;
  /** Language a first-time guest's generated name is drawn from. */
  nameLanguage?: string;
}

/**
 * The identity a create/join sheet submits with. Both sheets resolve it the
 * same way on open (the entry identity row writes to the same places), and
 * persist it the same way on submit — two entry paths that must never drift
 * (pitfall class 3).
 */
export function useSheetIdentity({ isOpen, isAuthenticated, displayName, profileAvatar, nameLanguage }: SheetIdentityInput) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<CustomAvatarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameKnown, setNameKnown] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const next = isAuthenticated && displayName ? displayName : getOrCreateStoredUsername(nameLanguage || 'en');
    setName(next);
    setError(null);
    setNameKnown(validateUsername(next).isValid);
    setAvatar(isAuthenticated ? (profileAvatar ?? getOrCreateStoredCustomAvatar()) : getOrCreateStoredCustomAvatar());
  }, [isOpen, isAuthenticated, displayName, profileAvatar, nameLanguage]);

  /** Validate, persist and return the trimmed name — or null (and an error) when it cannot be used. */
  const commit = useCallback((): string | null => {
    const trimmed = name.trim();
    const v = validateUsername(trimmed);
    if (!v.isValid || !avatar) {
      setError(v.error ?? 'validation.usernameRequired');
      setNameKnown(false);
      return null;
    }
    setError(null);
    if (!isAuthenticated) setStoredUsername(trimmed);
    setStoredCustomAvatar(avatar);
    if (isAuthenticated) {
      const updates: Record<string, unknown> = { avatar_config: avatar };
      if (trimmed !== displayName) updates.display_name = trimmed;
      updateProfile?.(updates)?.catch?.(() => {});
    }
    return trimmed;
  }, [name, avatar, isAuthenticated, displayName, updateProfile]);

  return {
    name,
    setName: (v: string) => {
      setName(v);
      if (error) setError(null);
    },
    avatar,
    error,
    /** False → the sheet shows the name field (no usable name yet, or the player asked to edit). */
    nameKnown,
    editName: () => setNameKnown(false),
    commit,
  };
}
