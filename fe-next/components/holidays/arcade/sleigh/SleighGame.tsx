'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SleighContent } from '@/lib/holidays/arcade/content';
import { SLEIGH_BELLS, SLEIGH_SECONDS, newSleigh, passFor, sleighAccept, sleighTick, type SleighState } from '@/lib/holidays/arcade/sleigh';
import { cn } from '@/lib/utils';
import { useArcadeFx } from '../ArcadeShell';
import LetterRack, { type RackVerdict } from '../LetterRack';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import { useWordJudge } from '../useWordJudge';
import styles from './sleigh.module.css';

interface Props {
  content: SleighContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const SLEIGH_X = 0.06;
const CHIMNEY_W = 46;

export default function SleighGame({ content, lang, onScore, onEnd }: Props) {
  const { t, language } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const judge = useWordJudge(lang);
  const sim = useRef<SleighState>(newSleigh(content.chimneys.length));
  const sky = useRef<HTMLDivElement>(null);
  const chimney = useRef<HTMLDivElement>(null);
  const timeBar = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState({ i: 0, bells: SLEIGH_BELLS, over: false });
  const [drops, setDrops] = useState<{ id: number; gx: number }[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const paint = useCallback(() => {
    const s = sim.current;
    const host = sky.current;
    if (host && chimney.current) {
      const w = host.clientWidth;
      const rtl = getComputedStyle(host).direction === 'rtl' ? -1 : 1;
      const start = w * SLEIGH_X + 24;
      const x = start + Math.max(0, 1 - s.t / passFor(s.i)) * (w - start - CHIMNEY_W);
      chimney.current.style.transform = `translateX(${rtl * x}px)`;
    }
    if (timeBar.current) timeBar.current.style.transform = `scaleX(${Math.max(0, 1 - s.elapsed / SLEIGH_SECONDS)})`;
  }, []);

  const commit = useCallback(
    (next: SleighState) => {
      const prev = sim.current;
      sim.current = next;
      if (next.score !== prev.score) onScore(next.score);
      if (next.i !== prev.i || next.lives !== prev.lives || next.over !== prev.over) setSnap({ i: next.i, bells: next.lives, over: next.over });
      if (next.lives < prev.lives) {
        sfx.playComboBreakSound(3);
        setNote(t('holiday.arcade.sleigh.missed'));
      }
    },
    [onScore, sfx, t],
  );

  useArcadeLoop((dt) => {
    commit(sleighTick(sim.current, dt));
    paint();
  }, !fx.paused && !snap.over);

  useEffect(() => {
    if (!snap.over) return;
    const s = sim.current;
    if (s.won) sfx.playVictorySound();
    else sfx.playTimesUpSound();
    onEnd({ score: s.score, plays: s.plays, won: s.won });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.over]);

  const submit = useCallback(
    async (raw: string): Promise<RackVerdict> => {
      const at = sim.current.i;
      const res = await judge(raw, content.chimneys[at] ?? [], new Set());
      if (sim.current.i !== at || sim.current.over) return 'bad';
      if (!res.ok) {
        setNote(t(`holiday.arcade.reject.${res.reason}`));
        return res.reason === 'offline' ? 'retry' : 'bad';
      }
      const host = sky.current;
      const gx = host && chimney.current ? Math.abs(chimney.current.getBoundingClientRect().left - host.getBoundingClientRect().left - host.clientWidth * SLEIGH_X - 30) : 40;
      const rtl = host && getComputedStyle(host).direction === 'rtl' ? -1 : 1;
      const next = sleighAccept(sim.current, res.word, res.len);
      fx.burstAt(chimney.current, 'ribbon', 10);
      fx.floatAt(chimney.current, `+${next.lastPoints}`);
      setDrops((d) => [...d.slice(-3), { id: Date.now(), gx: rtl * gx }]);
      sfx.playGiftReceivedSound();
      if (res.len >= 5) fx.cheer(t('holiday.arcade.great'));
      setNote(null);
      commit(next);
      paint();
      return 'good';
    },
    [judge, content.chimneys, t, fx, sfx, commit, paint],
  );

  const letters = content.chimneys[snap.i] ?? [];

  return (
    <div className={cn('flex flex-[1_0_auto] flex-col', fx.paused && styles.paused)}>
      <div ref={timeBar} className={styles.timeBar} aria-hidden="true" />
      <div ref={sky} className={styles.sky}>
        <div className="absolute end-2 top-2 z-10 flex gap-1" role="img" aria-label={t(pluralKeyOf('holiday.arcade.sleigh.bells', snap.bells, language), { count: snap.bells })}>
          {Array.from({ length: SLEIGH_BELLS }, (_, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src="/holidays/gold-bell.webp" alt="" width={28} height={28} className={cn('size-7', k >= snap.bells && styles.bellLost)} />
          ))}
        </div>
        <div ref={chimney} className={styles.chimney} aria-hidden="true" />
        <div className={styles.sleigh} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/holidays/m-christmas.webp" alt="" width={60} height={52} className="relative z-10 mx-auto h-12 w-auto" />
          <div className={styles.sleighBody} />
          <div className={styles.runner} />
        </div>
        {drops.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={d.id}
            src="/holidays/props-gift-red.webp"
            alt=""
            aria-hidden="true"
            className={styles.gift}
            style={{ ['--gx' as string]: `${d.gx}px` }}
            onAnimationEnd={() => setDrops((all) => all.filter((x) => x.id !== d.id))}
          />
        ))}
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="mb-2 min-h-5 text-center text-xs font-bold text-neo-holiday-gold" aria-live="assertive">
          {note ?? t('holiday.arcade.sleigh.hint')}
        </p>
        <LetterRack key={snap.i} letters={letters} lang={lang} onSubmit={submit} disabled={snap.over} tone="red" />
      </div>
    </div>
  );
}
