import { createContext, useContext } from 'react';
import { darken } from './parts/avatarDesignConstants';

const DEFAULT_EYE_COLOR = '#4A6FA5';

const AvatarEyeColorContext = createContext<string>(DEFAULT_EYE_COLOR);

/** Get the current eye/iris color. Returns default blue if outside provider. */
export function useEyeColor(): string {
  return useContext(AvatarEyeColorContext);
}

/** Get a darker shade of the eye color for depth effect. */
export function useEyeColorDark(): string {
  const color = useContext(AvatarEyeColorContext);
  return darken(color, 0.25);
}

export default AvatarEyeColorContext;
