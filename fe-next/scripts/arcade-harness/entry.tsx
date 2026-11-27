import { createRoot } from 'react-dom/client';
import { useState, type ComponentType } from 'react';
import ArcadeShell from '@/components/holidays/arcade/ArcadeShell';
import ArcadeHub from '@/components/holidays/arcade/ArcadeHub';
import LatkeFlip from '@/components/holidays/arcade/family/LatkeFlip';
import SpinOff from '@/components/holidays/arcade/family/SpinOff';
import PresentStack from '@/components/holidays/arcade/family/PresentStack';
import SnowballSplat from '@/components/holidays/arcade/family/SnowballSplat';
import OilGame from '@/components/holidays/arcade/oil/OilGame';
import DreidelGame from '@/components/holidays/arcade/dreidel/DreidelGame';
import StackGame from '@/components/holidays/arcade/stack/StackGame';
import SleighGame from '@/components/holidays/arcade/sleigh/SleighGame';
import SnowballGame from '@/components/holidays/arcade/snowball/SnowballGame';
import WrapGame from '@/components/holidays/arcade/wrap/WrapGame';
import { ARCADE_GAMES, type ArcadeGameId } from '@/lib/holidays/arcade/games';

declare const CONTENT: Record<string, unknown>;

const GAMES: Record<ArcadeGameId, ComponentType<never>> = {
  latke: LatkeFlip, spin: SpinOff, presents: PresentStack, splat: SnowballSplat,
  oil: OilGame, dreidel: DreidelGame, sufganiyah: StackGame, sleigh: SleighGame, snowball: SnowballGame, wrap: WrapGame,
} as Record<ArcadeGameId, ComponentType<never>>;

const q = new URLSearchParams(location.search);
const g = q.get('g') as ArcadeGameId | null;
const lang = q.get('lang') ?? 'en';
document.documentElement.lang = lang;
document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

function App() {
  const [score, setScore] = useState(0);
  if (!g) return <ArcadeHub />;
  const Game = GAMES[g] as ComponentType<Record<string, unknown>>;
  const content = ARCADE_GAMES[g].family ? { seed: 42 } : CONTENT[g];
  return (
    <ArcadeShell holiday={ARCADE_GAMES[g].holiday} game={g} score={score} onExit={() => {}}>
      <Game content={content} lang={lang} onScore={setScore} onEnd={(e: unknown) => ((window as unknown as { __end: unknown }).__end = e)} />
    </ArcadeShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <main className="flex min-h-dvh flex-col bg-neo-navy">
    <App />
  </main>,
);
