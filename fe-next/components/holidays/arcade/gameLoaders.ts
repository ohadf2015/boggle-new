import type { ComponentType } from 'react';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import type { FamilyGameProps } from './family/FamilyGame';

export const GAME_LOADERS: Record<ArcadeGameId, () => Promise<{ default: ComponentType<FamilyGameProps> }>> = {
  latke: () => import('./family/LatkeFlip'),
  spin: () => import('./family/SpinOff'),
  catch: () => import('./family/SufganiyahCatch'),
  presents: () => import('./family/PresentStack'),
  splat: () => import('./family/SnowballSplat'),
  dash: () => import('./family/SleighDash'),
};

export function prefetchGame(game: ArcadeGameId) {
  void GAME_LOADERS[game]().catch(() => undefined);
}
