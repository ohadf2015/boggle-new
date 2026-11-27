'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { createPresentsScene, PRESENTS_ART } from './scenes/presentsScene';

const FOCUS = { x: 0.5, y: 1 };

export default function PresentStack(props: FamilyGameProps) {
  return <FamilyGame {...props} game="presents" art={PRESENTS_ART} create={createPresentsScene} focus={FOCUS} />;
}
