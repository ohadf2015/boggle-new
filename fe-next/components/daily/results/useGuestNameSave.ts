'use client';

import { useState } from 'react';
import { markGuestNameChosen, saveGuestNameEverywhere } from '@/utils/guestManager';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';

export const MAX_GUEST_NAME_LENGTH = 20;

export type GuestNameSource = 'prompt' | 'nudge' | 'edit';

export type GuestNameT = (
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  params?: Record<string, string | number>,
) => string;

/**
 * Renames every daily leaderboard row of a guest and all local name stores.
 * Resolves true when the guest now owns a name (saved, or kept unchanged).
 */
export function useGuestNameSave(
  name: string,
  guestFingerprint: string | null,
  onRenamed: (name: string) => void,
  t: GuestNameT,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (draft: string, source: GuestNameSource): Promise<boolean> => {
    const trimmed = draft.trim().slice(0, MAX_GUEST_NAME_LENGTH);
    if (!trimmed) return false;
    if (trimmed === name || !guestFingerprint) {
      markGuestNameChosen();
      return true;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-challenge/guest-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestFingerprint, displayName: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error === 'profane'
          ? t('wordHunt.results.guestNameRejected', 'Pick a different name')
          : t('wordHunt.results.guestNameFailed', "Couldn't save your name. Try again."));
        return false;
      }
      saveGuestNameEverywhere(body.displayName);
      markGuestNameChosen();
      trackGrowthEvent('daily_guest_name_saved', { source, was_default: isDefaultPlayerName(name) });
      onRenamed(body.displayName);
      return true;
    } catch {
      setError(t('wordHunt.results.guestNameFailed', "Couldn't save your name. Try again."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error, clearError: () => setError(null) };
}
