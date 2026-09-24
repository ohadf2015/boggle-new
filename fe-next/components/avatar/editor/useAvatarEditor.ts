'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { type CustomAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { useAvatarEditorTelemetry } from '@/hooks/useAvatarEditorTelemetry';
import { editorReducer, initEditorState, previewConfigOf, canUndo, type ConfigKey } from './editorState';

/**
 * Draft state + telemetry for the editor. Telemetry fires OUTSIDE the reducer
 * (StrictMode double-invokes reducers) and only for committed picks — a
 * try-on is not a part change.
 */
export function useAvatarEditor(isOpen: boolean, initialConfig: CustomAvatarConfig | undefined) {
  const start = initialConfig ?? DEFAULT_AVATAR_CONFIG;
  const [state, dispatch] = useReducer(editorReducer, start, initEditorState);
  const telemetry = useAvatarEditorTelemetry(isOpen, start);

  // Reset on open, and when the caller hands a DIFFERENT avatar while open.
  // Compared by content: callers often pass a fresh object every render
  // (`profile.avatar_config ?? getRandomAvatarConfig()`), which must not wipe edits.
  const lastStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      lastStartRef.current = null;
      return;
    }
    const sig = JSON.stringify(start);
    if (lastStartRef.current === sig) return;
    lastStartRef.current = sig;
    dispatch({ type: 'reset', config: start });
  }, [isOpen, start]);

  const set = useCallback((key: ConfigKey, value: unknown) => {
    telemetry.partChanged(key, value);
    dispatch({ type: 'set', key, value });
  }, [telemetry]);

  const setMany = useCallback((patch: Partial<CustomAvatarConfig>, base: CustomAvatarConfig) => {
    for (const [k, v] of Object.entries(patch)) telemetry.partChanged(k, v);
    dispatch({ type: 'replace', config: { ...base, ...patch } });
  }, [telemetry]);

  const tryOn = useCallback((key: ConfigKey, value: string) => dispatch({ type: 'tryOn', key, value }), []);
  const clearTryOn = useCallback(() => dispatch({ type: 'clearTryOn' }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const replace = useCallback((config: CustomAvatarConfig) => dispatch({ type: 'replace', config }), []);

  // Stable identity per state — consumers key effects on it.
  const preview = useMemo(() => previewConfigOf(state), [state]);

  return {
    state,
    committed: state.committed,
    preview,
    canUndo: canUndo(state),
    set,
    setMany,
    tryOn,
    clearTryOn,
    undo,
    replace,
    saved: telemetry.saved,
  };
}
