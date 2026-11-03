'use client';

/**
 * DEV-ONLY visual QA harness for big-room lobbies and the full standings sheet, with mock rooms (no backend).
 * /en/dev/lobby?view=host|tv|standings&players=15&me=12&bots=1
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import HostPreGameView from '@/host/components/HostPreGameView';
import TvLobbyView from '@/host/components/tv-broadcast/TvLobbyView';
import { MpStandingsSection } from '@/components/multiplayer/results/MpFullStandings';
import { MpMyCard } from '@/components/multiplayer/results/MpMyCard';
import { buildMpStandings } from '@/components/multiplayer/results/mpStandings';
import { pickVisibleRows } from '@/components/multiplayer/results/mpResultsView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { SocketContext, type SocketContextValue } from '@/utils/SocketContext';
import type { Player } from '@/components/results/types';
import type { DifficultyLevel, Language } from '@/shared/types/game';

const NO_SOCKET: SocketContextValue = {
  socket: null, isConnected: false, isReconnecting: false, connectionError: null,
  getReconnectAttempt: () => 0, maxReconnectAttempts: 0, manualReconnect: () => {},
};

const NAMES = [
  'Maya', 'Leo', 'Priya', 'AlexandraTheGreat', 'Noor', 'Kai', 'נועה', 'Otto', 'Ibrahim', 'Sofía', 'Hiro', 'Astrid',
  'Daniel_2009', 'ליאור', 'Zara', 'Mateo', 'Ines', 'Rafael', 'Ava', 'Omer', 'Yuki', 'Bruno', 'Chloe', 'Dmitri',
  'Elif', 'Farah', 'Gus', 'Hana', 'Ivo', 'Jonas',
];

type T = (path: string, params?: Record<string, string | number>) => string;

function mockPlayers(count: number, me: string, botsOnly: boolean) {
  return [
    { username: me, isHost: true },
    ...NAMES.slice(0, Math.max(0, count - 1)).map((username, i) => ({ username, isBot: botsOnly || i === 2 })),
  ];
}

export default function DevLobbyPage() {
  return (
    <SocketContext.Provider value={NO_SOCKET}>
      <Suspense>
        <DevLobby />
      </Suspense>
    </SocketContext.Provider>
  );
}

function DevLobby() {
  const q = useSearchParams();
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  const view = q.get('view') ?? 'host';
  const players = Number(q.get('players') ?? 8);
  if (process.env.NODE_ENV === 'production') return null;
  if (view === 'standings') return <StandingsPreview players={players} mePos={Number(q.get("me") ?? players)} />;
  return <LobbyPreview players={players} tv={view === "tv"} botsOnly={q.get("bots") === "1"} />;
}

function LobbyPreview({ players, tv, botsOnly }: { players: number; tv: boolean; botsOnly: boolean }) {
  const { t, language } = useLanguage();
  const me = 'You';
  const roster = useMemo(() => mockPlayers(players, me, botsOnly), [players, botsOnly]);
  const ready = useMemo(() => botsOnly ? [] : roster.slice(1).filter((_, i) => i % 3 === 0).map((p) => p.username), [roster, botsOnly]);
  const [timerValue, setTimerValue] = useState(1);
  const [timerDirection, setTimerDirection] = useState(-1);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM' as DifficultyLevel);
  const [minWordLength, setMinWordLength] = useState(3);
  const [gameType, setGameType] = useState<'regular' | 'tournament'>('regular');
  const [tournamentRounds, setTournamentRounds] = useState(3);
  const [hostPlaying, setHostPlaying] = useState(true);
  const noop = () => {};
  const lang = (language ?? 'en') as Language;

  if (tv) {
    return (
      <div className="h-dvh bg-neo-navy">
        <TvLobbyView
          gameCode="4821"
          roomLanguage={lang}
          username={me}
          t={t as T}
          playersReady={roster}
          timerValue={timerValue}
          difficulty={difficulty}
          onStartGame={noop}
          onExitRoom={noop}
          tournamentCreating={false}
          readyUsernames={ready}
        />
      </div>
    );
  }
  return (
    <div className="h-dvh bg-neo-navy">
      <HostPreGameView
        gameCode="4821"
        roomLanguage={lang}
        language={lang}
        username={me}
        t={t as never}
        timerValue={timerValue}
        setTimerValue={setTimerValue}
        timerDirection={timerDirection}
        setTimerDirection={setTimerDirection}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        minWordLength={minWordLength}
        setMinWordLength={setMinWordLength}
        gameType={gameType}
        setGameType={setGameType}
        tournamentRounds={tournamentRounds}
        setTournamentRounds={setTournamentRounds}
        tournamentData={null}
        hostPlaying={hostPlaying}
        setHostPlaying={setHostPlaying}
        playersReady={roster}
        readyUsernames={ready}
        readyTotal={botsOnly ? 0 : Math.max(0, roster.length - 1)}
        playerWordCounts={{}}
        shufflingGrid={null}
        highlightedCells={[]}
        tableData={[]}
        onStartGame={noop}
        onExitRoom={noop}
        onCancelTournament={noop}
        tournamentCreating={false}
      />
    </div>
  );
}

function StandingsPreview({ players, mePos }: { players: number; mePos: number }) {
  const { t } = useLanguage();
  const scores = useMemo(() => {
    const names = NAMES.slice(0, players - 1);
    names.splice(Math.min(Math.max(mePos, 1), players) - 1, 0, 'You');
    return names.map((username, i) => ({ username, score: 480 - i * 14 - (i % 2) * 3, allWords: [] }) as unknown as Player);
  }, [players, mePos]);
  const rows = useMemo(() => buildMpStandings({ sortedScores: scores, username: 'You', normalizeUsername: (n) => n || '' }), [scores]);
  const visible = useMemo(() => pickVisibleRows(rows, 8), [rows]);
  const myRow = rows.find((r) => r.isMe);

  return (
    <div className="h-dvh flex flex-col bg-neo-navy text-neo-white">
      <div className="relative isolate flex-1 min-h-0 w-full max-w-6xl tv:max-w-[1600px] mx-auto flex flex-col lg:[--mp-u:1.3] tv:[--mp-u:1.8] gap-[calc(10px*var(--mp-u,1))] p-[calc(12px*var(--mp-u,1))] lg:p-[calc(24px*var(--mp-u,1))] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-[calc(28px*var(--mp-u,1))] lg:items-center">
        <div className="min-h-0 flex-1 flex flex-col justify-center gap-[calc(8px*var(--mp-u,1))] lg:h-full">
          <MpStandingsSection
            allRows={rows}
            rows={visible.rows}
            hiddenCount={visible.hiddenCount}
            gapBeforeLast={visible.gapBeforeLast}
            isRevealed={() => true}
            t={t as T}
            className="min-h-0 flex-1 lg:max-h-[calc(560px*var(--mp-u,1))]"
          />
        </div>
        <div className="shrink-0 flex flex-col gap-[calc(10px*var(--mp-u,1))] lg:justify-center">
          <MpMyCard rank={myRow?.rank ?? 1} winner={myRow?.rank === 1} total={rows.length} score={myRow?.score ?? 0} bestWord={null} xp={45} coins={30} callout={null} revealed t={t as T} />
        </div>
      </div>
    </div>
  );
}
