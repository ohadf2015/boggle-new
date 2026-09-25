'use client';

/**
 * Demo adventure player for guests: uses AdventureLevel UI but read-only.
 * Reuses GridComponent, HUD, combat, and scoring logic from the main game.
 */
import { useCallback, useState, type ReactNode } from 'react';
import GridComponent from '@/components/GridComponent';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';
import { useAdventureDemo } from './useAdventureDemo';
import { useWordChecker } from '../play/useWordChecker';
import { DemoResultCard } from './DemoResultCard';
import type { Language } from '@/types';

interface AdventureDemoProps {
  onExit: () => void;
}

const WORLD = 1;
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

  const handleGameStart = useCallback(() => {
    run.start();
  }, [run]);

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
      {/* Back button */}
      <header className="sticky top-0 z-40 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000] hover:bg-neo-cream/90"
          aria-label={t('adventurePlay.guest.backToGate')}
        >
          ← {t('adventurePlay.guest.back')}
        </button>
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

      {/* Start button (if not running) */}
      {run.phase === 'ready' && (
        <div className="flex justify-center pb-6">
          <button
            onClick={handleGameStart}
            className="px-6 py-3 bg-neo-lime text-black font-bold rounded-lg hover:bg-[#dcff00] text-lg"
          >
            {t('adventurePlay.fight')}
          </button>
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
