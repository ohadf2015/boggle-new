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
import { GameShell } from '@/components/game/shell';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { AdventureLeftRail, AdventureRightRail } from './AdventureShellRails';

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
  const keyboard = useKeyboardWordInput({
    grid: run.grid,
    language,
    gameLanguage: language,
    enabled: run.phase === 'playing',
    onWordSubmit: (word) => void handleWordSubmit(word),
  });

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
      className="min-h-dvh shell:h-dvh shell:overflow-hidden flex flex-col bg-[#0f1b3d] text-neo-cream"
      style={{
        backgroundImage: `url(${worldBackdrop(WORLD)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Same top bar + foe card as a real level: timer, exit, rival HP vs the star bars. */}
      <header className="sticky top-0 z-40 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 space-y-2 shell:static shell:shrink-0 shell:px-[clamp(0.875rem,1.4vw,1.75rem)] shell:pb-0 shell:[&_[data-adv-slot=timer]]:hidden">
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

      {lvl && run.grid.length > 0 && (
        <GameShell
          mode="adventure"
          accent="lime"
          scene
          className="min-h-0 [--shell-chrome:12.5rem]"
          left={
            <AdventureLeftRail
              t={t}
              secsLeft={Math.ceil(run.msLeft / 1000)}
              totalSecs={lvl.seconds}
              score={run.score}
              words={run.words}
              stars={lvl.stars}
            />
          }
          right={<AdventureRightRail t={t} words={run.words} />}
        >
          <div
            data-testid="adventure-board"
            className="flex-1 flex flex-col items-center justify-center px-4 py-8 shell:p-0 shell:min-h-0 shell:[container-type:size] shell:[&_.game-board-frame]:!w-[min(100cqw,100cqh)] shell:[&_.game-board-frame]:!h-[min(100cqw,100cqh)] shell:[&_.game-board-frame]:!max-w-none shell:[&_.game-board-frame]:!max-h-none"
          >
            <GridComponent
              grid={run.grid}
              language={language}
              onWordSubmit={handleWordSubmit}
              tileSkinOverride={worldSkinId(WORLD)}
              interactive={run.phase === 'playing'}
              highlightedPath={keyboard.highlightedCells}
              isTypingMode={keyboard.isTypingMode}
            />
          </div>
        </GameShell>
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
