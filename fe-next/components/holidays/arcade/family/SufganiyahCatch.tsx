'use client';

import FamilyGame, { type FamilyGameProps } from './FamilyGame';
import { CATCH_ART, createCatchScene } from './scenes/catchScene';

const FOCUS = { x: 0.5, y: 0.85 };

export default function SufganiyahCatch(props: FamilyGameProps) {
  return <FamilyGame {...props} game="catch" art={CATCH_ART} create={createCatchScene} focus={FOCUS} />;
}
