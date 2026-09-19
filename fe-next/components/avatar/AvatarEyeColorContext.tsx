'use client';

import { createContext } from 'react';
import { DEFAULT_EYE_COLOR, registerAvatarEyeColorContext } from './avatarRenderValues';

// Parts read it through avatarRenderValues — see AvatarUidContext.
const AvatarEyeColorContext = createContext<string>(DEFAULT_EYE_COLOR);
registerAvatarEyeColorContext(AvatarEyeColorContext);

export { useEyeColor, useEyeColorDark } from './avatarRenderValues';
export default AvatarEyeColorContext;
