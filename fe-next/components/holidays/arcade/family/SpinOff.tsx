'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { createSpinScene, SPIN_ART } from './scenes/spinScene';

const FOCUS = { x: 0.5, y: 0.5 };

export default function SpinOff(props: FamilyGameProps) {
  return <FamilyGame {...props} game="spin" art={SPIN_ART} create={createSpinScene} focus={FOCUS} />;
}
