'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { createDashScene, DASH_ART } from './scenes/dashScene';

const FOCUS = { x: 0.2, y: 0.6 };

export default function SleighDash(props: FamilyGameProps) {
  return <FamilyGame {...props} game="dash" art={DASH_ART} create={createDashScene} focus={FOCUS} />;
}
