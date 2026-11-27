'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { createSplatScene, SPLAT_ART } from './scenes/splatScene';

const FOCUS = { x: 0.5, y: 0.8 };

export default function SnowballSplat(props: FamilyGameProps) {
  return <FamilyGame {...props} game="splat" art={SPLAT_ART} create={createSplatScene} focus={FOCUS} />;
}
