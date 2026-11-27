'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { OilContent } from '@/lib/holidays/arcade/content';
import { wordPoints } from '@/lib/holidays/arcade/letters';
import { NIGHT_SECONDS, OIL_MAX, newOil, oilAccept, oilTick, type OilState } from '@/lib/holidays/arcade/oil';
import { cn } from '@/lib/utils';
import { useArcadeFx } from '../ArcadeShell';
import LetterRack, { type RackVerdict } from '../LetterRack';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import { useWordJudge } from '../useWordJudge';
import Hanukkiah from './Hanukkiah';
import styles from './oil.module.css';

interface Props {
  content: OilContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const LOW = 25;
const view = (s: OilState) => ({ night: s.night, miracle: s.miracle, over: s.over, low: s.oil < LOW });

export default function OilGame({ content, lang, onScore, onEnd }: Props) {
  const { t, language } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const judge = useWordJudge(lang);
  const sim = useRef<OilState>(newOil());
  const fill = useRef<HTMLDivElement>(null);
  const nightBar = useRef<HTMLDivElement>(null);
  const menorah = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState(() => view(sim.current));
  const [note, setNote] = useState<string | null>(null);

  const paint = useCallback(() => {
    const s = sim.current;
    if (fill.current) {
      fill.current.style.transform = `scaleX(${s.oil / OIL_MAX})`;
      fill.current.parentElement?.setAttribute('aria-valuenow', String(Math.round(s.oil)));
    }
    if (nightBar.current) nightBar.current.style.transform = `scaleX(${1 - s.nightT / NIGHT_SECONDS[s.night - 1]})`;
  }, []);

  const sync = useCallback(
    (prev: ReturnType<typeof view>, s: OilState) => {
      const next = view(s);
      if (next.night !== prev.night || next.miracle !== prev.miracle || next.over !== prev.over || next.low !== prev.low) setSnap(next);
    },
    [],
  );

  useArcadeLoop((dt) => {
    const before = sim.current;
    const after = oilTick(before, dt);
    const prev = view(before);
    if (after !== before) {
      sim.current = after;
      sync(prev, after);
      if (after.score !== before.score) onScore(after.score);
    }
    paint();
  }, !fx.paused && !snap.over);

  useEffect(() => {
    if (snap.night > 1) {
      sfx.playStreakFireSound();
      fx.burstAt(menorah.current?.querySelector(`[data-slot="${snap.night - 1}"]`) ?? null, 'coin', 10);
      fx.cheer(t('holiday.arcade.oil.nightLit', { night: snap.night }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.night]);

  useEffect(() => {
    if (snap.miracle === 'active') {
      sfx.playPowerUpSound();
      fx.cheer(t('holiday.arcade.oil.miracle'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.miracle]);

  useEffect(() => {
    if (snap.low && !snap.over && snap.miracle !== 'active') sfx.playTimerUrgentSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.low]);

  useEffect(() => {
    if (!snap.over) return;
    const s = sim.current;
    if (s.won) {
      sfx.playVictorySound();
      fx.burstAt(menorah.current, 'confetti', 24);
    } else sfx.playDefeatSound();
    onEnd({ score: s.score, plays: s.words.map((w) => ({ w })), won: s.won });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.over]);

  const submit = useCallback(
    async (raw: string, el: HTMLElement | null): Promise<RackVerdict> => {
      const res = await judge(raw, content.rack, new Set(sim.current.words));
      if (!res.ok) {
        setNote(t(`holiday.arcade.reject.${res.reason}`));
        return res.reason === 'offline' ? 'retry' : 'bad';
      }
      setNote(null);
      const prev = view(sim.current);
      const next = oilAccept(sim.current, res.word, res.len);
      sim.current = next;
      sync(prev, next);
      onScore(next.score);
      paint();
      fx.burstAt(el, 'coin', Math.min(14, 4 + res.len));
      fx.floatAt(el, `+${wordPoints(res.len)}`);
      if (res.len >= 6) fx.cheer(t('holiday.arcade.great'));
      return 'good';
    },
    [judge, content.rack, t, sync, onScore, paint, fx],
  );

  const lit = snap.over && sim.current.won ? 8 : snap.night;

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-3">
      <div className="relative flex flex-[1_0_auto] flex-col">
        <div ref={nightBar} className={styles.nightBar} aria-hidden="true" />
        <p className="mt-2 text-center font-neo-display text-sm font-bold text-neo-white/80" aria-live="polite">
          {t('holiday.arcade.oil.nightOf', { night: snap.night, total: 8 })}
        </p>
        <div className="flex flex-[1_0_auto] items-center px-4 pb-1 pt-6">
          <Hanukkiah ref={menorah} lit={lit} label={t(pluralKeyOf('holiday.arcade.oil.candlesLit', lit, language), { count: lit })} />
        </div>
        {snap.miracle === 'active' && (
          <div className={styles.miracle} role="status">
            <span className="rounded-2xl border-[3px] border-black bg-neo-holiday-gold px-4 py-2 font-neo-display text-3xl font-black text-neo-navy shadow-hard-lg">
              {t('holiday.arcade.oil.miracle')}
            </span>
          </div>
        )}
      </div>
      <div className="px-3">
        <div className={cn(styles.vessel, snap.low && styles.low)} role="meter" aria-label={t('holiday.arcade.oil.oilLevel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
          <div ref={fill} className={styles.fill} />
        </div>
      </div>
      <div className="px-3 pb-3">
        <p className="mb-2 min-h-5 text-center text-xs font-bold text-neo-holiday-gold" aria-live="assertive">
          {note ?? t('holiday.arcade.oil.hint')}
        </p>
        <LetterRack letters={content.rack} lang={lang} onSubmit={submit} disabled={snap.over} tone="gold" />
      </div>
    </div>
  );
}
