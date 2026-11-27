'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import type { DreidelContent } from '@/lib/holidays/arcade/content';
import { WORD_SECONDS, applySpin, botSucceeds, duelTick, finalScore, longWord, newDuel, ruleFits, sideOf, type DuelState, type Side } from '@/lib/holidays/arcade/dreidel';
import { displayWord, fold, wordPoints } from '@/lib/holidays/arcade/letters';
import { cn } from '@/lib/utils';
import { useArcadeFx } from '../ArcadeShell';
import LetterRack, { type RackVerdict } from '../LetterRack';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import { useWordJudge } from '../useWordJudge';
import styles from './dreidel.module.css';

interface Props {
  content: DreidelContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

type Phase = 'spin' | 'word' | 'think' | 'show';
const SPIN_S = 1.4;
const THINK_S = 1.3;
const SHOW_S = 1.3;

interface Sim {
  duel: DuelState;
  phase: Phase;
  t: number;
  success: boolean;
  botWord: string | null;
}

const LETTER: Record<Side, string> = { nun: 'נ', gimel: 'ג', hei: 'ה', shin: 'ש' };

export default function DreidelGame({ content, lang, onScore, onEnd }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const { region } = useHoliday();
  const judge = useWordJudge(lang);
  const sim = useRef<Sim>({ duel: newDuel(), phase: 'spin', t: 0, success: false, botWord: null });
  const wordBar = useRef<HTMLDivElement>(null);
  const pot = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLDivElement>(null);
  const bot = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState(() => ({ ...sim.current }));
  const [used] = useState(() => new Set<string>());
  const [note, setNote] = useState<string | null>(null);

  const slot = (k: number) => k % content.racks.length;
  const sideAt = (k: number) => sideOf(content.spins[k % content.spins.length]);
  const needAt = (k: number) => [...fold(content.botWords[slot(k)] ?? '', lang)][0] ?? null;
  const face = (s: Side) => (s === 'shin' && region === 'IL' ? 'פ' : LETTER[s]);

  const publish = useCallback(() => setSnap({ ...sim.current }), []);

  const resolve = useCallback(() => {
    const s = sim.current;
    const side = sideAt(s.duel.k);
    const before = s.duel;
    const after = applySpin(before, side, s.success);
    const who = before.turn;
    if (after[who] > before[who]) {
      sfx.playCoinCascadeSound();
      fx.burstAt(who === 'you' ? you.current : bot.current, 'coin', 10);
    } else if (after.pot > before.pot) sfx.playCoinCollectSound({ rate: 0.8 });
    sim.current = { duel: after, phase: 'spin', t: 0, success: false, botWord: null };
    onScore(finalScore(after));
    if (!after.over) sfx.playTileSelectSound();
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfx, fx, onScore, publish]);

  useArcadeLoop((dt) => {
    const s = sim.current;
    const duel = duelTick(s.duel, dt);
    s.duel = duel;
    s.t += dt;
    if (duel.over) return publish();
    const side = sideAt(duel.k);
    if (s.phase === 'spin' && s.t >= SPIN_S) {
      s.t = 0;
      if (duel.turn === 'bot') s.phase = 'think';
      else s.phase = side === 'nun' ? 'show' : 'word';
      publish();
    } else if (s.phase === 'think' && s.t >= THINK_S) {
      const ok = botSucceeds(side, duel.k);
      const w = content.botWords[slot(duel.k)];
      s.success = ok && (side !== 'gimel' || [...w].length >= longWord(lang));
      s.botWord = s.success && side !== 'nun' ? w : null;
      s.phase = 'show';
      s.t = 0;
      publish();
    } else if (s.phase === 'word' && s.t >= WORD_SECONDS) {
      s.success = false;
      s.phase = 'show';
      s.t = 0;
      sfx.playTimesUpSound();
      publish();
    } else if (s.phase === 'show' && s.t >= SHOW_S) resolve();
    if (wordBar.current) wordBar.current.style.transform = `scaleX(${s.phase === 'word' ? Math.max(0, 1 - s.t / WORD_SECONDS) : 0})`;
  }, !fx.paused && !snap.duel.over);

  useEffect(() => {
    if (snap.phase === 'spin' && !snap.duel.over) sfx.playBoardShuffleSound();
    if (snap.phase === 'show' && snap.duel.turn === 'you' && snap.success) fx.cheer(t('holiday.arcade.great'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.phase, snap.duel.k]);

  useEffect(() => {
    if (!snap.duel.over) return;
    const d = sim.current.duel;
    if (d.won) {
      sfx.playVictorySound();
      fx.burstAt(you.current, 'confetti', 24);
    } else sfx.playDefeatSound();
    onEnd({ score: finalScore(d), plays: d.plays, won: d.won });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.duel.over]);

  const submit = useCallback(
    async (raw: string, el: HTMLElement | null): Promise<RackVerdict> => {
      const s = sim.current;
      if (s.phase !== 'word') return 'bad';
      const k = s.duel.k;
      const res = await judge(raw, content.racks[slot(k)], used);
      if (sim.current.phase !== 'word' || sim.current.duel.k !== k) return 'bad';
      if (!res.ok) {
        setNote(t(`holiday.arcade.reject.${res.reason}`));
        return res.reason === 'offline' ? 'retry' : 'bad';
      }
      const side = sideAt(k);
      if (!ruleFits(side, res.word, res.len, needAt(k), lang)) {
        setNote(side === 'gimel' ? t('holiday.arcade.dreidel.needLong', { count: longWord(lang) }) : t('holiday.arcade.dreidel.needLetter', { letter: needAt(k) ?? '' }));
        return 'bad';
      }
      used.add(res.word);
      const points = wordPoints(res.len);
      s.duel = { ...s.duel, wordScore: s.duel.wordScore + points, plays: [...s.duel.plays, { w: res.word, i: slot(k) }] };
      s.success = true;
      s.phase = 'show';
      s.t = 0;
      fx.floatAt(el, `+${points}`);
      setNote(null);
      onScore(finalScore(s.duel));
      publish();
      return 'good';
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [judge, content.racks, used, t, lang, fx, onScore, publish],
  );

  const giveUp = () => {
    const s = sim.current;
    if (s.phase !== 'word') return;
    s.success = false;
    s.phase = 'show';
    s.t = 0;
    publish();
  };

  const d = snap.duel;
  const side = sideAt(d.k);
  const mine = d.turn === 'you';
  const rule =
    snap.phase === 'spin'
      ? t(mine ? 'holiday.arcade.dreidel.yourSpin' : 'holiday.arcade.dreidel.botSpin')
      : snap.phase === 'think'
        ? t('holiday.arcade.dreidel.botThinking')
        : snap.phase === 'show'
          ? !mine && snap.botWord
            ? t('holiday.arcade.dreidel.botFound', { word: displayWord(snap.botWord, lang) })
            : t(`holiday.arcade.dreidel.result.${side}.${snap.success ? 'win' : 'miss'}`)
          : t(`holiday.arcade.dreidel.rule.${side}`, { count: longWord(lang), letter: needAt(d.k) ?? '' });

  const purse = (who: 'you' | 'bot', ref: typeof you) => (
    <div ref={ref} className={cn(styles.purse, d.turn === who && !d.over && styles.active, 'p-1')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={who === 'you' ? '/holidays/m-hanukkah.webp' : '/holidays/peek-dreidel.webp'} alt="" className="h-12 w-auto" />
      <span className="text-xs text-neo-white/70">{t(`holiday.arcade.dreidel.${who}`)}</span>
      <span className="flex items-center gap-1 font-neo-display text-xl tabular-nums">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/props-gelt.webp" alt="" className="size-6" />
        {d[who]}
      </span>
    </div>
  );

  return (
    <div className="flex flex-[1_0_auto] flex-col">
      <div className={styles.table}>
        {purse('you', you)}
        <div className="flex flex-col items-center gap-2">
          <div className={styles.spinner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${d.k}-${snap.phase === 'spin'}`}
              src="/holidays/props-dreidel.webp"
              alt=""
              className={cn('h-full w-full object-contain', snap.phase === 'spin' ? styles.spinning : styles.wobble)}
            />
            {snap.phase !== 'spin' && !d.over && (
              <span className={styles.face} role="img" aria-label={t(`holiday.arcade.dreidel.side.${side}`)}>
                {face(side)}
              </span>
            )}
          </div>
          <div ref={pot} key={d.pot} className={cn(styles.pot, 'flex items-center gap-1 rounded-xl border-2 border-black bg-neo-holiday-gold px-2 py-0.5 font-neo-display font-black text-neo-navy')}>
            {t('holiday.arcade.dreidel.pot', { count: d.pot })}
          </div>
        </div>
        {purse('bot', bot)}
      </div>
      <div ref={wordBar} className={styles.wordBar} aria-hidden="true" />
      <p className="min-h-10 px-3 pt-2 text-center font-neo-display text-sm font-bold" aria-live="polite">
        {rule}
      </p>
      <div className="px-3 pb-3">
        <p className="mb-2 min-h-5 text-center text-xs font-bold text-neo-holiday-gold" aria-live="assertive">
          {note ?? t('holiday.arcade.dreidel.goal', { count: 10 })}
        </p>
        <LetterRack key={d.k} letters={content.racks[slot(d.k)]} lang={lang} onSubmit={submit} disabled={snap.phase !== 'word' || d.over} tone="blue" />
        {snap.phase === 'word' && (
          <button type="button" onClick={giveUp} className="mt-2 flex w-full items-center justify-center gap-2 text-xs font-bold text-neo-white/70 underline">
            <Flag className="size-4" aria-hidden="true" />
            {t('holiday.arcade.dreidel.giveUp')}
          </button>
        )}
      </div>
    </div>
  );
}
