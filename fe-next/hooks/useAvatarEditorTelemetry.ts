'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import {
  type AvatarEditorSource,
  editorSourceFromPath,
  trackAvatarEditorOpened,
  trackAvatarPartChanged,
  trackAvatarSaved,
} from '@/lib/avatar/avatarTelemetry';

/**
 * Editor telemetry kept OUT of AvatarBuilderModal (which sits at the 500-line
 * cap). `opened` fires once per closed→open transition; `partChanged` must be
 * called outside any setState updater (StrictMode double-invokes updaters).
 */
export function useAvatarEditorTelemetry(
  isOpen: boolean,
  startConfig: CustomAvatarConfig,
  source?: AvatarEditorSource,
) {
  const openedRef = useRef(false);
  const startRef = useRef(startConfig);

  useEffect(() => {
    if (!isOpen) {
      openedRef.current = false;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    startRef.current = startConfig;
    trackAvatarEditorOpened(
      source ?? editorSourceFromPath(typeof window !== 'undefined' ? window.location.pathname : null),
    );
  }, [isOpen, startConfig, source]);

  const partChanged = useCallback((category: string, value: unknown) => {
    trackAvatarPartChanged(category, value);
  }, []);

  const saved = useCallback((config: CustomAvatarConfig) => {
    trackAvatarSaved(startRef.current, config);
  }, []);

  // Stable identity so the modal's updateConfig/handleSave callbacks stay memoized.
  return useMemo(() => ({ partChanged, saved }), [partChanged, saved]);
}
