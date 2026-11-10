'use client';

/**
 * DEV-ONLY gallery for the shared results stage: /[locale]/dev/results-stage?s=<scenario>
 * Fixture data only; nothing here writes to an API.
 */

import { useSearchParams } from 'next/navigation';
import { Home, RotateCcw } from 'lucide-react';
import { QuickPlayResults } from '@/components/quick-play/QuickPlayResults';
import { SoloResultsHero } from '@/components/singleplayer/results/components/SoloResultsHero';
import { ResultsNextBar } from '@/components/results/stage/ResultsNextBar';
import { BlastResultsSummary } from '@/components/blast/legacy/BlastResultsSummary';
import { useLanguage } from '@/contexts/LanguageContext';
import { DailyResultsHero } from '@/components/daily/results/DailyResultsHero';

function BlastScenario({ failed }: { failed: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex h-dvh flex-col bg-neo-navy">
      <BlastResultsSummary
        t={t as never}
        onPlayAgain={noop}
        onQuit={noop}
        onOpenStore={noop}
        results={{
          finalScore: failed ? 1240 : 5200,
          previousBest: 4800,
          tilesCleared: failed ? 22 : 33,
          totalTiles: 36,
          clearPercentage: failed ? 61 : 92,
          wordsFound: ['quartz', 'stone', 'notes', 'rate'],
          bestWord: 'quartz',
          maxCombo: 4,
          stars: 2,
          wavesCompleted: failed ? 2 : 3,
          waveResults: [
            { waveNumber: 1, score: 1200, wordsFound: 3, clearPercentage: 88 },
            { waveNumber: 2, score: 1800, wordsFound: 4, clearPercentage: 90 },
            { waveNumber: 3, score: 2200, wordsFound: 5, clearPercentage: failed ? 61 : 92 },
          ],
        } as never}
      />
    </div>
  );
}

const noop = () => undefined;
const WORDS = ['quartz', 'stone', 'notes', 'tones', 'rate', 'tear', 'ears', 'seat', 'east', 'tan', 'ant', 'net', 'ten', 'sea'].map((word) => ({ word, score: word.length * 3 }));

function QuickScenario({ hunt = false }: { hunt?: boolean }) {
  return (
    <div className="flex h-dvh flex-col">
      <QuickPlayResults
        result={{ mode: hunt ? 'word-hunt' : 'classic', seed: 'x', score: 142, perfectScore: 260, scorePct: 55, wordsFound: 14, totalWords: 61, durationMs: 60000, words: WORDS, ...(hunt ? { targetWord: 'quartz', targetWordFound: true } : {}) }}
        outcome={{ scorePct: 55, coins: 12, xp: 30, percentileToday: 0, history: [55, 40, 48], totalPoints: 340 }}
        rival={null}
        rivals={[
          { userId: 'r1', name: 'Noa', scorePct: 71 },
          { userId: 'r2', name: 'Lior', scorePct: 49 },
          { userId: 'r3', name: 'Maya', scorePct: 38 },
        ]}
        collected={WORDS.map((w, i) => ({ ...w, isNew: i % 4 === 0 }))}
        collectionTotal={212}
        dayStreak={3}
        isGuest={hunt}
        onNextRound={noop}
        onChallenge={hunt ? async () => 'copied' : noop}
        onExit={noop}
      />
    </div>
  );
}

function SoloScenario({ bots, zero }: { bots: boolean; zero?: boolean }) {
  return (
    <div className="min-h-dvh bg-neo-navy pb-32 pt-2 text-white">
      <div className="mx-auto w-full max-w-xl px-3">
        <SoloResultsHero
          title={zero ? 'Try Again!' : bots ? 'Victory!' : 'Final score'}
          subtitle={zero ? "Didn't find any words this time" : 'Found 14 words — 47 more were hiding!'}
          score={zero ? 0 : 186}
          words={zero ? 0 : 14}
          avatar={{ userId: 'guest' }}
          rank={1}
          totalPlayers={bots ? 4 : 1}
          isNewHighScore={!zero && bots}
        />
      </div>
      <ResultsNextBar
        placement="fixed"
        shine
        primary={{ label: 'Run it back?', onClick: noop, icon: <RotateCcw className="h-5 w-5" strokeWidth={3} /> }}
        secondary={{ label: 'Home', onClick: noop, icon: <Home className="h-6 w-6" strokeWidth={2.5} /> }}
      />
    </div>
  );
}

export default function ResultsStageGallery() {
  const s = useSearchParams().get('s') ?? 'quick';
  if (s === 'blast') return <BlastScenario failed={false} />;
  if (s === 'blast-fail') return <BlastScenario failed />;
  if (s === 'daily')
    return (
      <div className="min-h-dvh bg-neo-navy p-3">
        <DailyResultsHero mode="word-wheel" outcome="win" headline="Wordsmith!" eyebrow="#142" score={86} celebrate
          stats={[{ value: 23, label: 'Words' }, { value: 'QUARTZ', label: 'Best' }, { value: '4', label: 'Pangrams' }]} />
      </div>
    );
  if (s === 'quick-hunt') return <QuickScenario hunt />;
  if (s === 'solo') return <SoloScenario bots={false} />;
  if (s === 'bots') return <SoloScenario bots />;
  if (s === 'zero') return <SoloScenario bots={false} zero />;
  return <QuickScenario />;
}
