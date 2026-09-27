'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { locales } from '@/i18n/config';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '@/shared/constants/gameConstants';
import {
  defaultPartySetup,
  makePlayer,
  validatePartySetup,
  PARTY_BOARD_SIZES,
  PARTY_MAX_PLAYERS,
  PARTY_MAX_ROUNDS,
  PARTY_MAX_TIMER,
  PARTY_MIN_PLAYERS,
  PARTY_MIN_ROUNDS,
  PARTY_MIN_TIMER,
  type PartySetup as Setup,
  type SetupError,
} from '@/lib/party';

interface PartySetupProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
  saved: boolean;
  onStart: (setup: Setup) => void;
  onResume: () => void;
  onDiscard: () => void;
}

function langLabel(t: PartySetupProps['t'], loc: string): string {
  if (loc === 'he') return t('passAndPlay.langHe');
  if (loc === 'sv') return t('passAndPlay.langSv');
  if (loc === 'ja') return t('passAndPlay.langJa');
  if (loc === 'es') return t('passAndPlay.langEs');
  if (loc === 'ru') return t('passAndPlay.langRu');
  return t('passAndPlay.langEn');
}

export function PartySetupScreen({
  t,
  language,
  saved,
  onStart,
  onResume,
  onDiscard,
}: PartySetupProps): ReactElement {
  const [setup, setSetup] = useState<Setup>(() => {
    const base = defaultPartySetup(language);
    return {
      ...base,
      players: base.players.map((p, i) => ({
        ...p,
        name: t('passAndPlay.playerNameDefault', { n: i + 1 }),
      })),
    };
  });
  const [errors, setErrors] = useState<SetupError[]>([]);

  const errorText = useMemo(() => {
    const map: Record<SetupError, string> = {
      minPlayers: t('passAndPlay.minPlayers'),
      maxPlayers: t('passAndPlay.maxPlayers'),
      emptyName: t('passAndPlay.emptyName'),
      nameTaken: t('passAndPlay.nameTaken'),
      rounds: t('passAndPlay.rounds'),
      timer: t('passAndPlay.timer'),
      boardSize: t('passAndPlay.boardSize'),
    };
    return errors.map((e) => map[e]);
  }, [errors, t]);

  const updatePlayer = (index: number, patch: Partial<Setup['players'][number]>) => {
    setSetup((prev) => ({
      ...prev,
      players: prev.players.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };

  const handleStart = () => {
    const result = validatePartySetup(setup);
    setErrors(result.errors);
    if (result.ok) onStart(setup);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="text-center">
        <h1 className="font-neo-display text-3xl font-bold text-neo-lime">{t('passAndPlay.title')}</h1>
        <p className="mt-1 text-neo-cream/80">{t('passAndPlay.subtitle')}</p>
      </header>

      {saved && (
        <div className="rounded-neo border-neo border-black bg-neo-navy-light p-3 shadow-hard">
          <p className="mb-2 text-sm">{t('passAndPlay.resumePrompt')}</p>
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-neo border-neo border-black bg-neo-lime px-3 py-2 font-bold text-black shadow-hard" onClick={onResume}>
              {t('passAndPlay.resume')}
            </button>
            <button type="button" className="flex-1 rounded-neo border-neo border-black bg-neo-cream px-3 py-2 font-bold text-black shadow-hard" onClick={onDiscard}>
              {t('passAndPlay.discard')}
            </button>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-neo-display text-lg">{t('passAndPlay.playerCount')}</h2>
          <span>{setup.players.length}</span>
        </div>
        {setup.players.map((player, index) => (
          <div key={player.id} className="flex items-center gap-2 rounded-neo border-neo border-black bg-neo-navy-light p-2">
            <button
              type="button"
              aria-label={t('passAndPlay.avatar')}
              className="flex h-10 w-10 items-center justify-center rounded-full border-neo border-black text-xl"
              style={{ background: player.color }}
              onClick={() =>
                updatePlayer(index, {
                  emoji: AVATAR_EMOJIS[(AVATAR_EMOJIS.indexOf(player.emoji) + 1) % AVATAR_EMOJIS.length] ?? player.emoji,
                  color: AVATAR_COLORS[(AVATAR_COLORS.indexOf(player.color) + 1) % AVATAR_COLORS.length] ?? player.color,
                })
              }
            >
              {player.emoji}
            </button>
            <input
              className="min-w-0 flex-1 rounded-neo border-neo border-black bg-neo-cream px-2 py-1 text-black"
              value={player.name}
              aria-label={t('passAndPlay.playerName')}
              onChange={(e) => updatePlayer(index, { name: e.target.value })}
            />
            {setup.players.length > PARTY_MIN_PLAYERS && (
              <button type="button" className="text-sm underline" onClick={() => setSetup((p) => ({ ...p, players: p.players.filter((_, i) => i !== index) }))}>
                {t('passAndPlay.removePlayer')}
              </button>
            )}
          </div>
        ))}
        {setup.players.length < PARTY_MAX_PLAYERS && (
          <button
            type="button"
            className="rounded-neo border-neo border-black bg-neo-cyan px-3 py-2 font-bold text-black shadow-hard"
            onClick={() =>
              setSetup((p) => {
                const used = new Set(p.players.map((x) => x.id));
                let i = p.players.length;
                while (used.has(`p${i + 1}`)) i += 1;
                return {
                  ...p,
                  players: [
                    ...p.players,
                    makePlayer(i, t('passAndPlay.playerNameDefault', { n: p.players.length + 1 })),
                  ],
                };
              })
            }
          >
            {t('passAndPlay.addPlayer')}
          </button>
        )}
      </section>

      <label className="flex items-center justify-between gap-2">
        <span>{t('passAndPlay.rounds')}</span>
        <input
          type="number"
          min={PARTY_MIN_ROUNDS}
          max={PARTY_MAX_ROUNDS}
          className="w-20 rounded-neo border-neo border-black bg-neo-cream px-2 py-1 text-black"
          value={setup.roundCount}
          onChange={(e) => setSetup((p) => ({ ...p, roundCount: Number(e.target.value) }))}
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t('passAndPlay.boardSize')}</span>
        <select
          className="rounded-neo border-neo border-black bg-neo-cream px-2 py-1 text-black"
          value={setup.rows}
          onChange={(e) => {
            const n = Number(e.target.value);
            setSetup((p) => ({ ...p, rows: n, cols: n }));
          }}
        >
          {PARTY_BOARD_SIZES.map((n) => (
            <option key={n} value={n}>{`${n}×${n}`}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t('passAndPlay.language')}</span>
        <select
          className="rounded-neo border-neo border-black bg-neo-cream px-2 py-1 text-black"
          value={setup.language}
          onChange={(e) => setSetup((p) => ({ ...p, language: e.target.value }))}
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {langLabel(t, loc)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t('passAndPlay.timer')}</span>
        <select
          className="rounded-neo border-neo border-black bg-neo-cream px-2 py-1 text-black"
          value={setup.timerSeconds}
          onChange={(e) => setSetup((p) => ({ ...p, timerSeconds: Number(e.target.value) }))}
        >
          {[30, 45, 60, 90, 120, 180]
            .filter((n) => n >= PARTY_MIN_TIMER && n <= PARTY_MAX_TIMER)
            .map((n) => (
              <option key={n} value={n}>
                {t('passAndPlay.seconds', { n })}
              </option>
            ))}
        </select>
      </label>

      {errorText.length > 0 && (
        <ul className="text-sm text-neo-orange">
          {errorText.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleStart}
        className="rounded-neo border-neo border-black bg-neo-lime px-4 py-3 font-neo-display text-lg font-bold uppercase text-black shadow-hard"
      >
        {t('passAndPlay.start')}
      </button>
    </div>
  );
}
