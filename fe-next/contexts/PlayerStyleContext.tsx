'use client';

/**
 * PlayerStyleContext — owns the player's chosen music/theme style and applies
 * its accent color app-wide.
 *
 * Responsibilities:
 *   - Resolve the COMMITTED style from account (profiles.player_style) or guest
 *     localStorage (see selectActiveStyleKey).
 *   - Apply the accent: writes the active style's hex to the `--accent` CSS var
 *     (or removes it for `default` → zero change). Mechanism mirrors the
 *     `data-cosy` calm-mode override.
 *   - Support live PREVIEW: previewStyle(key) applies a style's accent without
 *     persisting; previewStyle(null) reverts to the committed style.
 *
 * Music reads the committed style separately (MusicContext consumes this).
 * Placed below AuthProvider, above MusicProvider in essential-providers.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStyle,
  resolveStyleAccent,
  DEFAULT_STYLE_KEY,
  type PlayerStyle,
  type PlayerStyleKey,
} from '@/lib/playerStyle/styles';
import { selectActiveStyleKey } from '@/lib/playerStyle/selectActiveStyle';
import { getStoredPlayerStyle, setStoredPlayerStyle } from '@/lib/playerStyle/playerStyleStorage';
import { applyAccentVar } from '@/lib/playerStyle/applyAccent';

export interface PlayerStyleContextValue {
  /** Feature gate — launched to all users. UI hides when false (kill-switch). */
  enabled: boolean;
  /** The committed (persisted) style key. */
  styleKey: PlayerStyleKey;
  /** The committed style object. */
  style: PlayerStyle;
  /** The style currently APPLIED (preview ?? committed) — what music/accent reflect. */
  activeStyleKey: PlayerStyleKey;
  activeStyle: PlayerStyle;
  isPreviewing: boolean;
  /** Persist a style choice (account or localStorage) and clear any preview. */
  setStyle: (key: PlayerStyleKey) => Promise<void>;
  /** Temporarily apply a style's accent without persisting; null ends the preview. */
  previewStyle: (key: PlayerStyleKey | null) => void;
}

const PlayerStyleContext = createContext<PlayerStyleContextValue | null>(null);

export function PlayerStyleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, profile, updateProfile } = useAuth();
  // LAUNCHED to everyone: new players pick a style during onboarding, and anyone
  // can change it in Settings. Safe for existing users — they default to the
  // `default` style (null accent/music), so nothing changes until they pick.
  // The one-time existing-user popup (PlayerStyleOnboardingWrapper) is now also
  // shown to all (no longer admin-gated) — it prompts each existing user once.
  const enabled = true;

  // Guest store is read on mount only (avoids SSR/hydration mismatch).
  const [storedKey, setStoredKey] = useState<PlayerStyleKey | null>(null);
  useEffect(() => {
    setStoredKey(getStoredPlayerStyle());
  }, []);

  const [previewKey, setPreviewKey] = useState<PlayerStyleKey | null>(null);

  const committedKey = enabled
    ? selectActiveStyleKey(isAuthenticated, profile?.player_style ?? null, storedKey)
    : DEFAULT_STYLE_KEY;
  const activeKey = previewKey ?? committedKey;

  // Apply the active accent whenever it changes. Null hex (default) removes the
  // override so the CSS default cascades back.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const accent = resolveStyleAccent(activeKey);
    applyAccentVar(document.documentElement, accent);
    // Marker so accent-themed chrome (logo, focus ring) can scope itself to a
    // non-default style — guarantees ZERO change for the default style.
    if (accent) document.documentElement.setAttribute('data-player-style-active', 'true');
    else document.documentElement.removeAttribute('data-player-style-active');
  }, [activeKey]);

  const setStyle = useCallback(
    async (key: PlayerStyleKey) => {
      if (!enabled) return;
      setPreviewKey(null);
      if (isAuthenticated && profile) {
        await updateProfile({ player_style: key });
      } else {
        setStoredPlayerStyle(key);
        setStoredKey(key);
      }
    },
    [enabled, isAuthenticated, profile, updateProfile],
  );

  const previewStyle = useCallback(
    (key: PlayerStyleKey | null) => {
      if (!enabled) return;
      setPreviewKey(key);
    },
    [enabled],
  );

  const value = useMemo<PlayerStyleContextValue>(
    () => ({
      enabled,
      styleKey: committedKey,
      style: getStyle(committedKey),
      activeStyleKey: activeKey,
      activeStyle: getStyle(activeKey),
      isPreviewing: previewKey !== null && previewKey !== committedKey,
      setStyle,
      previewStyle,
    }),
    [enabled, committedKey, activeKey, previewKey, setStyle, previewStyle],
  );

  return <PlayerStyleContext.Provider value={value}>{children}</PlayerStyleContext.Provider>;
}

const FALLBACK: PlayerStyleContextValue = {
  enabled: false,
  styleKey: DEFAULT_STYLE_KEY,
  style: getStyle(DEFAULT_STYLE_KEY),
  activeStyleKey: DEFAULT_STYLE_KEY,
  activeStyle: getStyle(DEFAULT_STYLE_KEY),
  isPreviewing: false,
  setStyle: async () => {},
  previewStyle: () => {},
};

/** Access the player style. Safe outside the provider (returns the default style). */
export function usePlayerStyle(): PlayerStyleContextValue {
  return useContext(PlayerStyleContext) ?? FALLBACK;
}
