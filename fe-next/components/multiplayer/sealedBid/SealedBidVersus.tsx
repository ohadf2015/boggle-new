'use client';

/**
 * Sealed Bid — Versus mount. Wires the tested useSealedBidGame brain to a real
 * socket inside an MP room. Players build a secret bid from the shared rack and
 * lock it; the server resolves across players (unique=double, clash=half) and
 * pushes the reveal. Mirrors WordTowerVersus / ShiritoriVersus mount glue.
 */
import { useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import ExitRoomButton from '@/components/ExitRoomButton';
import { useSealedBidGame, type SealedBidSocketLike } from './useSealedBidGame';

interface SealedBidVersusProps {
  socket: Socket | null;
  username: string;
  onQuit?: () => void;
}

export function SealedBidVersus({ socket, username, onQuit }: SealedBidVersusProps) {
  const { t, dir } = useLanguage();
  const versusSocket = socket as unknown as SealedBidSocketLike | null;
  const game = useSealedBidGame(versusSocket, username);
  const [picks, setPicks] = useState<number[]>([]);

  const rack = game.rack ?? '';
  const word = useMemo(() => picks.map((i) => rack[i]).join(''), [picks, rack]);
  const locked = game.myLock !== null;

  const tapTile = (i: number) => {
    if (locked || game.phase !== 'bidding') return;
    setPicks((p) => (p.includes(i) ? p : [...p, i]));
  };
  const backspace = () => setPicks((p) => p.slice(0, -1));
  const lockBid = () => { game.submitBid(word); };
  const pass = () => { game.submitBid(''); };

  // New round → clear local picks (myLock resets to null on sealedBidNextRound).
  const roundKey = `${game.index}-${game.phase}`;
  const [seenRound, setSeenRound] = useState(roundKey);
  if (roundKey !== seenRound) {
    setSeenRound(roundKey);
    if (game.phase === 'bidding' && picks.length) setPicks([]);
  }

  const sortedScores = useMemo(
    () => Object.entries(game.scores).sort((a, b) => b[1] - a[1]),
    [game.scores],
  );

  if (!game.ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy" dir={dir}>
        <p className="animate-pulse font-neo-display text-xl text-neo-pink">{t('sealedBidMp.waiting')}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-neo-navy p-4" dir={dir}>
      {onQuit && (
        <div className="absolute left-3 top-3 z-10">
          <ExitRoomButton onClick={onQuit} label={t('common.backToHome')} />
        </div>
      )}

      <div className="mx-auto flex max-w-xl flex-col gap-4 pt-12">
        {/* Round + scoreboard */}
        <div className="flex items-center justify-between">
          <span className="font-neo-display text-sm font-bold text-neo-cream/70">
            {t('sealedBidMp.round', { n: game.index + 1, total: game.totalRounds })}
          </span>
          <ul className="flex flex-wrap gap-2" aria-label={t('sealedBidMp.scores')}>
            {sortedScores.map(([u, s]) => (
              <li key={u} className={`rounded-neo border-neo border-black px-2.5 py-1 font-neo-display text-xs shadow-hard ${u === username ? 'bg-neo-pink text-black' : 'bg-neo-navy-light text-neo-white'}`}>
                {u} <span className="tabular-nums">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Game over */}
        {game.phase === 'done' ? (
          <div className="rounded-neo border-neo-thick border-black bg-neo-yellow p-5 text-center font-neo-display text-2xl font-bold text-black shadow-hard" role="status">
            {game.winner === username ? t('sealedBidMp.youWin') : `${game.winner ?? ''} ${t('sealedBidMp.wins')}`}
          </div>
        ) : (
          <>
            {/* Rack */}
            <div className="text-center">
              <p className="font-neo-body text-sm text-neo-white/80">{t('sealedBidMp.bidPrompt')}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {rack.split('').map((letter, i) => {
                  const used = picks.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={locked || game.phase !== 'bidding'}
                      onClick={() => tapTile(i)}
                      aria-label={letter}
                      className={`flex h-12 w-12 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-2xl font-bold shadow-hard active:translate-y-0.5 disabled:opacity-50 ${used ? 'bg-neo-navy-light text-neo-white/30' : 'bg-neo-cyan text-black'}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current bid */}
            <div className="flex min-h-[3rem] items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-cream px-3 py-2">
              <span className="font-neo-display text-2xl font-bold tracking-widest text-black">{word || '—'}</span>
            </div>

            {/* Reveal */}
            {game.phase === 'revealed' && game.results && (
              <ol className="flex flex-col gap-1.5" aria-label={t('sealedBidMp.results')}>
                {[...game.results].sort((a, b) => b.points - a.points).map((r) => (
                  <li key={r.username} className={`flex items-center justify-between rounded-neo border-neo border-black px-3 py-1.5 font-neo-body text-sm shadow-hard ${
                    r.outcome === 'unique' ? 'bg-neo-lime text-black' : r.outcome === 'clash' ? 'bg-neo-orange text-black' : 'bg-neo-navy-light text-neo-white/70'
                  }`}>
                    <span className="font-bold">{r.username}</span>
                    <span className="tabular-nums">{r.word ?? '—'} · {t(`sealedBidMp.outcome.${r.outcome}`)} · +{r.points}</span>
                  </li>
                ))}
              </ol>
            )}

            {/* Bid controls */}
            {game.phase === 'bidding' && (
              <div className="flex flex-col gap-2">
                {locked ? (
                  <p className="text-center font-neo-display font-bold text-neo-cyan" role="status">
                    {t('sealedBidMp.locked')}
                    {game.lockProgress && <span className="ml-2 text-neo-cream/60">{t('sealedBidMp.lockProgress', { locked: game.lockProgress.locked, total: game.lockProgress.total })}</span>}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={backspace} disabled={picks.length === 0} aria-label={t('sealedBidMp.clear')} className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-3 text-neo-white shadow-hard disabled:opacity-40">
                      <Delete className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={pass} className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-4 py-3 font-neo-display font-bold text-neo-white shadow-hard">
                      {t('sealedBidMp.pass')}
                    </button>
                    <button type="button" onClick={lockBid} disabled={word.length < 3} className="flex flex-1 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-pink py-3 font-neo-display text-lg font-bold text-black shadow-hard disabled:opacity-40">
                      {t('sealedBidMp.lock')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SealedBidVersus;
