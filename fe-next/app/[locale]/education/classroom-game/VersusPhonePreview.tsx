'use client';

/** DEV-ONLY: `?preview=wheelphone|towerphone|wordcraftphone|blastphone|huntphone[&arcade=1]` a student's phone mid Wheel Rush / Word Tower / Wordcraft / Blast / Word Hunt in a classroom (arcade=1: the main game's look). */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WheelRushView } from '@/components/multiplayer/WheelRushView';
import { WordTowerVersus } from '@/components/wordTower/WordTowerVersus';
import { WordcraftLiveView } from '@/components/multiplayer/wordcraft/WordcraftLiveView';
import { MpBlastCanvas } from '@/components/multiplayer/round/MpBlastCanvas';
import { WordHuntGame } from '@/components/wordhunt/WordHuntGame';
import { useLanguage } from '@/contexts/LanguageContext';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';
import { FakeSocket } from '../../teacher/preview/_edu/fakeSocket';

const LEADERBOARD = [{ username: 'Maya', score: 42 }, { username: 'Leo', score: 48 }, { username: 'Noa', score: 20 }];

function makeSocket() {
  return new FakeSocket({
    requestWheelRushState: (_p, reply) => reply('wheelRushInit', {
      puzzle: { centerLetter: 'r', outerLetters: ['s', 't', 'o', 'm', 'a', 'i'], allLetters: ['r', 's', 't', 'o', 'm', 'a', 'i'] },
      startedAt: Date.now() - 60_000,
      myWords: ['storm', 'riot'],
    }),
    requestTowerState: (_p, reply) => reply('towerStateSync', {
      you: { tray: ['C', 'A', 'T', 'S', 'E', 'R'], anchorLetter: 'S', scramblesLeft: 2, heightM: 18, combo: 1, floors: 4, bombCharge: 0 },
      standings: [
        { rank: 1, playerId: 'Leo', username: 'Leo', heightM: 24, floors: 5, biome: 'meadow', banked: 0 },
        { rank: 2, playerId: 'Maya', username: 'Maya', heightM: 18, floors: 4, biome: 'meadow', banked: 0 },
      ],
      endsAtMs: Date.now() + 150_000,
    }),
    'wordcraft:requestState': (_p, reply) => reply('wordcraft:state', {
      gameCode: 'CRAFT1', boardSize: 9, botScore: 9, myScore: 14, moves: 2, bagCount: 38,
      rack: ['P', 'L', 'A', 'N', 'E', 'T', 'S'].map((letter, i) => ({ id: `t-${i}`, letter, value: 1, isBlank: false })),
      cells: [
        ...['S', 'T', 'A', 'R'].map((letter, i) => ({ row: 4, col: 3 + i, letter, value: 1, isBlank: false, by: 'player' })),
        ...['O', 'O', 'N'].map((letter, i) => ({ row: 5 + i, col: 5, letter, value: 1, isBlank: false, by: 'bot' })),
      ],
      targets: [{ word: 'STAR', built: true }, { word: 'PLANET', built: false }, { word: 'COMET', built: false }, { word: 'ORBIT', built: false }],
    }),
  }).asSocket();
}

// The arcade comparison needs the main game's navy page on this sky route.
const ARCADE_PAGE = { background: 'rgb(var(--neo-navy))' };

const BLAST_GRID = [['S', 'T', 'O', 'R', 'M', 'A'], ['H', 'A', 'D', 'E', 'W', 'L'], ['I', 'N', 'L', 'S', 'A', 'E'], ['V', 'E', 'R', 'T', 'Y', 'P'], ['O', 'C', 'K', 'B', 'U', 'N'], ['R', 'I', 'G', 'H', 'T', 'S']];

export function VersusPhonePreview({ mode }: { mode: 'wheel' | 'tower' | 'wordcraft' | 'blast' | 'hunt' }) {
  const { t } = useLanguage();
  const classroom = useSearchParams()?.get('arcade') !== '1';
  const [socket] = useState(makeSocket);

  return (
    <ClassroomBoardProvider value={classroom}>
      {mode === 'wheel' ? (
        <div className="flex h-dvh flex-col">
          <WheelRushView socket={socket} username="Maya" leaderboard={LEADERBOARD} onQuit={() => undefined} t={t as never} remainingTime={95} totalTime={120} />
        </div>
      ) : mode === 'blast' ? (
        <div className="flex h-dvh flex-col bg-edu-page" style={classroom ? undefined : ARCADE_PAGE}>
          <MpBlastCanvas grid={BLAST_GRID as never} username="Maya" socket={socket} totalTime={120} onQuit={() => undefined} onWordWithComboType={() => undefined} onBoardCleared={() => undefined} />
        </div>
      ) : mode === 'hunt' ? (
        <div className="flex h-dvh flex-col bg-edu-page" style={classroom ? undefined : ARCADE_PAGE}>
          <WordHuntGame grid={BLAST_GRID as never} gameLanguage="en" leaderboard={LEADERBOARD as never} username="Maya" score={42} onQuit={() => undefined} onWordSubmit={() => undefined} onWordHuntGuess={() => undefined} gameActive minWordLength={3} socket={socket} foundWords={[{ word: 'storm', isValid: true, score: 5 }]} mpChrome />
        </div>
      ) : mode === 'wordcraft' ? (
        <div className="flex h-dvh flex-col">
          <WordcraftLiveView socket={socket as never} username="Maya" t={t as never} remainingTime={240} />
        </div>
      ) : (
        <WordTowerVersus socket={socket} username="Maya" remainingTime={150} onQuit={() => undefined} />
      )}
    </ClassroomBoardProvider>
  );
}
