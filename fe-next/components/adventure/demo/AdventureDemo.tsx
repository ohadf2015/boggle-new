'use client';

/**
 * Demo adventure player for guests: uses AdventureLevel UI but read-only.
 * Reuses GridComponent, HUD, combat, and scoring logic from the main game.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import GridComponent from '@/components/GridComponent';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';
import { useAdventureDemo } from './useAdventureDemo';
import { useWordChecker } from '../play/useWordChecker';
import { DemoResultCard } from './DemoResultCard';
import LevelTopBar from '../play/LevelTopBar';
import FoeTarget from '../play/fx/FoeTarget';
import { WORLD_CONFIGS } from '@/lib/adventure/worldConfig';
import type { Language } from '@/types';

interface AdventureDemoProps {
  onExit: () => void;
}

const WORLD = 1;
const WORLD_NAME = WORLD_CONFIGS.find((w) => w.id === WORLD)?.name ?? '';
const worldBackdrop = (world: number) => `/images/adventure/play/world-${world}.webp`;

interface DemoRunProps {
  language: Language;
  onPlayAgain: () => void;
  onExit: () => void;
}

function DemoRun({ language, onPlayAgain, onExit }: DemoRunProps): ReactNode {
  const { t } = useLanguageSafe();
  const isWord = useWordChecker(language);
  const run = useAdventureDemo({ language, isWord });

  const handleWordSubmit = useCallback(
    async (word: string) => {
      const result = await run.submit(word);
      return result;
    },
    [run]
  );

  // The guest already chose "play a free battle" — no second start button.
  const { phase, start } = run;
  useEffect(() => {
    if (phase === 'ready') start();
  }, [phase, start]);

  const lvl = run.lvl;

  if (run.phase === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0f1b3d]">
        <p className="text-neo-cream">{t('adventurePlay.loading')}</p>
      </div>
    );
  }

  if (run.phase === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0f1b3d]">
        <div className="text-center">
          <p className="text-neo-cream mb-4">{t('adventurePlay.loadError')}</p>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-neo-lime text-black rounded-lg font-bold hover:bg-[#dcff00]"
          >
            {t('adventurePlay.backHome')}
          </button>
        </div>
      </div>
    );
  }

  if (run.phase === 'done' && run.result) {
    return <DemoResultCard result={run.result} onPlayAgain={onPlayAgain} />;
  }

  return (
    <div
      className="min-h-dvh flex flex-col bg-[#0f1b3d] text-neo-cream"
      style={{
        backgroundImage: `url(${worldBackdrop(WORLD)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Same top bar + foe card as a real level: timer, exit, rival HP vs the star bars. */}
      <header className="sticky top-0 z-40 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 space-y-2">
        <LevelTopBar
          worldName={t('adventure.worlds.' + WORLD_NAME)}
          levelLabel={t('adventurePlay.guest.demoLabel')}
          secs={Math.ceil(run.msLeft / 1000)}
          urgent={run.phase === 'playing' && run.msLeft <= 10_000}
          onExit={onExit}
          world={WORLD}
        />
        {lvl && (
          <FoeTarget world={WORLD} score={run.score} stars={lvl.stars} lastHit={null}
            combat={run.phase === 'playing' ? run.combat : null} />
        )}
      </header>

      {/* Board */}
      {lvl && run.grid.length > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <GridComponent
            grid={run.grid}
            language={language}
            onWordSubmit={handleWordSubmit}
            tileSkinOverride={worldSkinId(WORLD)}
            interactive={run.phase === 'playing'}
          />
        </div>
      )}

    </div>
  );
}

export function AdventureDemo({ onExit }: AdventureDemoProps): ReactNode {
  const { language } = useLanguageSafe();
  const [round, setRound] = useState(0);

  const handlePlayAgain = useCallback(() => {
    setRound((r) => r + 1);
  }, []);

  return (
    <DemoRun key={round} language={language} onPlayAgain={handlePlayAgain} onExit={onExit} />
  );
}
