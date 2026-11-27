'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { createLatkeScene, LATKE_ART } from './scenes/latkeScene';

const FOCUS = { x: 0.5, y: 0.92 };

export default function LatkeFlip(props: FamilyGameProps) {
  return <FamilyGame {...props} game="latke" art={LATKE_ART} create={createLatkeScene} focus={FOCUS} />;
}
