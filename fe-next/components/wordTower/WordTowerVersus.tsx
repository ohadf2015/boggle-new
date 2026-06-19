'use client';

/**
 * Word Tower — Versus shell. Wires the tested useWordTowerVersus brain to the
 * Pixi scene + rival rail + tray control over a real socket.
 *
 * NOTE: this is the integration mount and is UNVERIFIED — it needs a live
 * 2-client match to validate (selfId source, socket lifecycle, where it mounts
 * in the MP flow). The brain (hook + handler + match manager) is unit-tested;
 * this is presentational glue over it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Delete, Shuffle, ArrowUp } from 'lucide-react';
import ExitRoomButton from '@/components/ExitRoomButton';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { biomeForHeight } from '@/lib/wordTower/wordTowerManager';
import { bankedBombs } from '@/lib/wordTower/versus';
import { useWordTowerVersus, type VersusSocket } from '@/lib/wordTower/useWordTowerVersus';
import { WordTowerScene } from './WordTowerScene';
import { WordTowerVersusRail } from './WordTowerVersusRail';

interface WordTowerVersusProps {
  socket: Socket | null;
  /** Authoritative per-player key (server keys match state by this username). */
  username: string;
  onQuit?: () => void;
}

export function WordTowerVersus({ socket, username, onQuit }: WordTowerVersusProps) {
  const { t, dir } = useLanguage();
  const selfId = username;

  const versusSocket = socket as unknown as VersusSocket | null;
  const tower = useWordTowerVersus({ socket: versusSocket, selfId });
  const { you } = tower.state;

  const biomeId = useMemo(() => biomeForHeight(you?.heightM ?? 0), [you?.heightM]);
  // Versus client knows floor COUNT, not the word list — synthesize blocks.
  const floors = useMemo(
    () => Array.from({ length: Math.min(you?.floors ?? 0, 60) }, () => ({ word: '', len: 0, meters: 0 })),
    [you?.floors],
  );

  // Countdown to match end.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondsLeft = tower.state.endsAtMs > 0 ? Math.max(0, Math.round((tower.state.endsAtMs - now) / 1000)) : null;

  const canSubmit = tower.word.length >= 3;
  const banked = bankedBombs(you?.bombCharge ?? 0);

  if (!you) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy" dir={dir}>
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('wordTower.versus.waiting')}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-neo-navy" dir={dir}>
      <WordTowerScene floors={floors} biomeId={biomeId} heightM={you?.heightM ?? 0} pendingWord="" resultKey={tower.state.resultKey} errorKey={tower.state.errorKey} lastResult={null} />

      {/* Incoming-bomb red flash */}
      {tower.state.bombKey > 0 && (
        <div key={`bomb-${tower.state.bombKey}`} className="pointer-events-none absolute inset-0 z-20 animate-[fadeInUp_0.5s_ease-out] bg-neo-red/30" aria-hidden />
      )}

      {/* Top: timer + rival rail */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          {onQuit && (
            <ExitRoomButton onClick={onQuit} label={t('common.backToHome')} />
          )}
          <div className="rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 shadow-hard backdrop-blur-sm">
            <div className="font-neo-display text-2xl font-bold text-neo-white tabular-nums">{Math.round(you.heightM)}<span className="text-sm text-neo-cyan"> m</span></div>
            {secondsLeft !== null && <div className="font-neo-body text-xs font-bold text-neo-orange tabular-nums">{secondsLeft}s</div>}
          </div>
        </div>
        <div className="w-44 max-w-[45%]">
          <WordTowerVersusRail
            standings={tower.state.standings}
            selfId={selfId}
            banked={banked}
            yourHeightM={you.heightM}
            onBomb={tower.sendBomb}
            t={t}
          />
        </div>
      </div>

      {/* Bottom: tray control */}
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-4">
        <div className="flex items-center justify-center gap-1.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-yellow font-neo-display text-2xl font-bold text-black shadow-hard ring-2 ring-neo-yellow ring-offset-2 ring-offset-neo-navy">
            {you.anchorLetter}
          </span>
          {tower.state.selected.map((idx, k) => (
            <span key={`${idx}-${k}`} className="flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cyan font-neo-display text-2xl font-bold text-black shadow-hard">
              {you.tray[idx]}
            </span>
          ))}
        </div>

        <div className="mx-auto grid max-w-md grid-cols-6 gap-2">
          {you.tray.map((letter, i) => {
            const isSel = tower.state.selected.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={isSel}
                onClick={() => tower.selectTile(i)}
                aria-label={t('wordTower.a11y.tile', { letter })}
                className={`flex aspect-square min-h-[44px] items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-2xl font-bold shadow-hard active:translate-y-0.5 ${
                  isSel ? 'bg-neo-navy-light text-neo-white/30' : 'bg-neo-lime text-black'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <div className="mx-auto flex max-w-md items-center gap-2">
          <button type="button" onClick={tower.scramble} disabled={you.scramblesLeft <= 0} aria-label={t('wordTower.hud.scramble')} className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-purple px-3 py-3 font-neo-display font-bold text-neo-white shadow-hard disabled:opacity-40">
            <Shuffle className="h-5 w-5" /> <span className="tabular-nums">{you.scramblesLeft}</span>
          </button>
          <button type="button" onClick={tower.backspace} disabled={tower.state.selected.length === 0} aria-label={t('wordTower.hud.backspace')} className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-3 text-neo-white shadow-hard disabled:opacity-40">
            <Delete className="h-5 w-5" />
          </button>
          <button type="button" onClick={tower.submit} disabled={!canSubmit} className="flex flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan py-3 font-neo-display text-lg font-bold text-black shadow-hard disabled:opacity-40">
            <ArrowUp className="h-5 w-5" /> {t('wordTower.hud.build')}
          </button>
        </div>
        {tower.state.lastError && (
          <p key={`err-${tower.state.errorKey}`} className="text-center font-neo-body text-sm font-bold text-neo-red">{t(`wordTower.error.${tower.state.lastError}`)}</p>
        )}
      </div>
    </div>
  );
}
