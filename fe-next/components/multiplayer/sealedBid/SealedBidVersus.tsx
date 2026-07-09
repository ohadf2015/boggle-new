'use client';

/**
 * Sealed Bid — Versus mount. Same casino table language as solo
 * (wood rail + felt), MP mechanics unchanged.
 */
import { useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import ExitRoomButton from '@/components/ExitRoomButton';
import SealedBidFeltShell from '@/components/sealedBid/SealedBidFeltShell';
import { SEALED_BID_ASSETS } from '@/components/sealedBid/sealedBidAssets';
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
  const lockBid = () => {
    game.submitBid(word);
  };
  const pass = () => {
    game.submitBid('');
  };

  const roundKey = `${game.index}-${game.phase}`;
  const [seenRound, setSeenRound] = useState(roundKey);
  if (roundKey !== seenRound) {
    setSeenRound(roundKey);
    if (game.phase === 'bidding' && picks.length) setPicks([]);
  }

  const sortedScores = useMemo(
    () => Object.entries(game.scores).sort((a, b) => b[1] - a[1]),
    [game.scores]
  );

  if (!game.ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy" dir={dir}>
        <p className="animate-pulse font-neo-display text-xl text-neo-pink">
          {t('sealedBidMp.waiting')}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="sb-versus"
      className="relative flex min-h-[100dvh] w-full flex-col bg-neo-navy p-3 sm:p-4"
      dir={dir}
    >
      {onQuit && (
        <div className="absolute left-3 top-3 z-20">
          <ExitRoomButton onClick={onQuit} label={t('common.backToHome')} />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 pt-12">
        {/* HUD: round + scores */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-neo border-2 border-black bg-neo-navy-light px-3 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white shadow-hard-sm">
            {t('sealedBidMp.round', { n: game.index + 1, total: game.totalRounds })}
          </span>
          <ul
            className="flex flex-wrap justify-end gap-1.5"
            aria-label={t('sealedBidMp.scores')}
          >
            {sortedScores.map(([u, s]) => (
              <li
                key={u}
                className={`rounded-full border-2 border-black px-2.5 py-1 font-neo-display text-xs font-bold shadow-hard-sm ${
                  u === username
                    ? 'bg-neo-pink text-black'
                    : 'bg-neo-navy-light text-neo-white'
                }`}
              >
                {u} <span className="tabular-nums">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {game.phase === 'done' ? (
          <div
            className="rounded-neo border-3 border-black bg-neo-yellow p-5 text-center font-neo-display text-2xl font-bold text-black shadow-hard"
            role="status"
          >
            {game.winner === username
              ? t('sealedBidMp.youWin')
              : `${game.winner ?? ''} ${t('sealedBidMp.wins')}`}
          </div>
        ) : (
          <>
            <SealedBidFeltShell className="min-h-[min(48dvh,380px)]" testId="sb-versus-felt">
              <div className="flex flex-col gap-3 p-3 sm:p-4">
                <p className="text-center font-neo-body text-sm font-medium text-white/85">
                  {t('sealedBidMp.bidPrompt')}
                </p>

                {/* Word pot */}
                <div className="mx-auto flex min-h-12 w-full max-w-xs items-center justify-center rounded-neo border-2 border-black bg-black/45 px-3 py-2 shadow-hard-sm">
                  <span className="font-neo-display text-2xl font-black tracking-[0.2em] text-neo-yellow">
                    {word || '—'}
                  </span>
                </div>

                {/* Rack tiles on felt */}
                <div className="flex flex-wrap justify-center gap-2">
                  {rack.split('').map((letter, i) => {
                    const used = picks.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={locked || game.phase !== 'bidding'}
                        onClick={() => tapTile(i)}
                        aria-label={letter}
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black font-neo-display text-xl font-black shadow-hard active:translate-y-0.5 disabled:opacity-50 sm:h-14 sm:w-14 sm:text-2xl ${
                          used
                            ? 'bg-neo-navy text-white/35'
                            : 'bg-neo-cream text-neo-navy'
                        }`}
                      >
                        {!used && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full bg-center bg-no-repeat opacity-40"
                            style={{
                              backgroundImage: `url(${SEALED_BID_ASSETS.chipRing})`,
                              backgroundSize: '100% 100%',
                            }}
                          />
                        )}
                        <span className="relative z-10">{letter}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SealedBidFeltShell>

            {game.phase === 'revealed' && game.results && (
              <ol
                className="flex flex-col gap-1.5"
                aria-label={t('sealedBidMp.results')}
              >
                {[...game.results]
                  .sort((a, b) => b.points - a.points)
                  .map((r) => (
                    <li
                      key={r.username}
                      className={`flex items-center justify-between rounded-neo border-2 border-black px-3 py-2 font-neo-body text-sm shadow-hard-sm ${
                        r.outcome === 'unique'
                          ? 'bg-neo-lime text-black'
                          : r.outcome === 'clash'
                            ? 'bg-neo-orange text-black'
                            : 'bg-neo-navy-light text-neo-white/70'
                      }`}
                    >
                      <span className="font-bold">{r.username}</span>
                      <span className="tabular-nums">
                        {r.word ?? '—'} · {t(`sealedBidMp.outcome.${r.outcome}`)} · +
                        {r.points}
                      </span>
                    </li>
                  ))}
              </ol>
            )}

            {game.phase === 'bidding' && (
              <div className="flex flex-col gap-2">
                {locked ? (
                  <p
                    className="text-center font-neo-display font-bold text-neo-cyan"
                    role="status"
                  >
                    {t('sealedBidMp.locked')}
                    {game.lockProgress && (
                      <span className="ml-2 text-neo-cream/60">
                        {t('sealedBidMp.lockProgress', {
                          locked: game.lockProgress.locked,
                          total: game.lockProgress.total,
                        })}
                      </span>
                    )}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={backspace}
                      disabled={picks.length === 0}
                      aria-label={t('sealedBidMp.clear')}
                      className="min-h-12 rounded-neo border-3 border-black bg-neo-navy-light px-3 py-3 text-neo-white shadow-hard disabled:opacity-40"
                    >
                      <Delete className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={pass}
                      className="min-h-12 min-w-[5.25rem] rounded-neo border-3 border-black bg-neo-navy-light px-4 py-3 font-neo-display text-xs font-black uppercase text-neo-white shadow-hard-sm"
                    >
                      {t('sealedBidMp.pass')}
                    </button>
                    <button
                      type="button"
                      onClick={lockBid}
                      disabled={word.length < 3}
                      className="flex min-h-12 flex-1 items-center justify-center rounded-neo border-3 border-black bg-neo-lime py-3 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard disabled:opacity-40"
                    >
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
