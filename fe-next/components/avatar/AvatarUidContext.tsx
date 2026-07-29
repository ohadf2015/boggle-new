'use client';

import { createContext, useContext } from 'react';

/**
 * Provides a unique ID prefix for SVG gradient/filter/clipPath definitions
 * within a single avatar instance. Prevents ID collisions when multiple
 * avatars render on the same page (leaderboards, chat rooms, etc.).
 *
 * The AvatarRenderer wraps its SVG tree with this provider using React's useId().
 * Part components call useAvatarUid() to get the prefix for their defs.
 */
const AvatarUidContext = createContext<string>('');

/** Get the unique avatar prefix for SVG def IDs. Returns '' if outside provider (e.g. PartPreview). */
export function useAvatarUid(): string {
  return useContext(AvatarUidContext);
}

export default AvatarUidContext;
