'use client';

import { createContext } from 'react';
import { registerAvatarUidContext } from './avatarRenderValues';

/**
 * Provides a unique ID prefix for SVG gradient/filter/clipPath definitions
 * within a single avatar instance. Prevents ID collisions when multiple
 * avatars render on the same page (leaderboards, chat rooms, etc.).
 *
 * The AvatarRenderer wraps its SVG tree with this provider using React's useId().
 * Parts read it through avatarRenderValues.useAvatarUid — never import this
 * module from a part: it must stay out of the /api/avatar/png server graph.
 */
const AvatarUidContext = createContext<string>('');
registerAvatarUidContext(AvatarUidContext);

export { useAvatarUid } from './avatarRenderValues';
export default AvatarUidContext;
