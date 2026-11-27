'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUp, MoveHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { SnowballContent } from '@/lib/holidays/arcade/content';
import { SNOW_SECONDS, comboMult, flightFor, newSnow, snowAnswer, snowTick, type SnowState } from '@/lib/holidays/arcade/snowball';
import { displayWord } from '@/lib/holidays/arcade/letters';
import { cn } from '@/lib/utils';
import arcade from '../arcade.module.css';
import { useArcadeFx } from '../ArcadeShell';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import styles from './snowball.module.css';

interface Props {
  content: SnowballContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const SWIPE = 36;
type Exit = { id: number; text: string; kind: 'catch' | 'toss' | 'splat'; tx: number };

export default function SnowballGame({ content, lang, onScore, onEnd }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const sim = useRef<SnowState>(newSnow());
  const ball = useRef<HTMLDivElement>(null);
  const timeBar = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [snap, setSnap] = useState({ i: 0, combo: 0, frost: false, over: false });
  const [exits, setExits] = useState<Exit[]>([]);
  const balls = content.balls;

  const paint = useCallback(() => {
    const s = sim.current;
    const k = Math.min(1, s.t / flightFor(s.i));
    if (ball.current) ball.current.style.transform = `translateY(${-70 + k * 90}px) scale(${0.3 + k * 0.85})`;
    if (timeBar.current) timeBar.current.style.transform = `scaleX(${Math.max(0, 1 - s.elapsed / SNOW_SECONDS)})`;
  }, []);

  const commit = useCallback(
    (next: SnowState) => {
      const prev = sim.current;
      sim.current = next;
      if (next.score !== prev.score) onScore(next.score);
      const frost = next.frost > 0;
      if (next.i !== prev.i || next.combo !== prev.combo || frost !== prev.frost > 0 || next.over !== prev.over) {
        setSnap({ i: next.i, combo: next.combo, frost, over: next.over });
      }
      if (next.i !== prev.i && next.last === 'hit') {
        sfx.playComboBreakSound(Math.max(1, prev.combo));
        setExits((e) => [...e.slice(-2), { id: Date.now(), text: balls[prev.i].text, kind: 'splat', tx: 0 }]);
      }
    },
    [onScore, sfx, balls],
  );

  useArcadeLoop((dt) => {
    commit(snowTick(sim.current, dt, balls.length));
    paint();
  }, !fx.paused && !snap.over);

  useEffect(() => {
    if (!snap.over) return;
    const s = sim.current;
    sfx.playTimesUpSound();
    onEnd({ score: s.score, plays: s.plays, won: s.best >= 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.over]);

  const answer = useCallback(
    (action: 'catch' | 'toss', dir = 1) => {
      const prev = sim.current;
      if (prev.over || fx.paused) return;
      const next = snowAnswer(prev, action, balls);
      const el = ball.current;
      if (next.last === 'wrong') {
        sfx.playWordRejectedSound();
        fx.cheer(t('holiday.arcade.snowball.oops'));
      } else {
        if (action === 'catch') sfx.playWordAcceptedSound();
        else sfx.playTileSelectSound();
        fx.burstAt(el, action === 'catch' ? 'confetti' : 'coin', action === 'catch' ? 12 : 6);
        fx.floatAt(el, `+${next.lastPoints}`);
        if (next.combo > 0 && next.combo % 5 === 0) {
          sfx.playComboMilestoneSound(Math.min(15, next.combo));
          fx.cheer(t('holiday.arcade.snowball.combo', { count: next.combo }));
        }
      }
      setExits((e) => [...e.slice(-2), { id: Date.now(), text: balls[prev.i].text, kind: action, tx: dir * 260 }]);
      commit(next);
      paint();
    },
    [balls, commit, paint, fx, sfx, t],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        answer('catch');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'x') {
        e.preventDefault();
        answer('toss', e.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  const down = (e: ReactPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const up = (e: ReactPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (dy < -SWIPE && Math.abs(dy) > Math.abs(dx)) answer('catch');
    else if (Math.abs(dx) > SWIPE) answer('toss', Math.sign(dx));
  };

  const current = balls[snap.i];
  const mult = comboMult(snap.combo);

  return (
    <div className="flex flex-[1_0_auto] flex-col">
      <div ref={timeBar} className="h-1.5 origin-left bg-neo-holiday-pine will-change-transform rtl:origin-right" aria-hidden="true" />
      <div className="flex items-center gap-2 px-3 pt-2">
        <span className="font-neo-display text-sm font-black tabular-nums text-neo-holiday-snow">x{mult.toFixed(1)}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full border-2 border-black bg-neo-navy-light">
          <div className={styles.comboBar} style={{ transform: `scaleX(${(mult - 1) / 2})` }} />
        </div>
      </div>
      <div className={styles.field} onPointerDown={down} onPointerUp={up} onPointerCancel={() => (start.current = null)}>
        <div className={styles.ground} aria-hidden="true" />
        {current && !snap.over && (
          <div key={snap.i} ref={ball} className={styles.ball} aria-live="polite">
            <span dir="auto" className={cn(styles.word, 'font-neo-display')}>{displayWord(current.text, lang)}</span>
          </div>
        )}
        {exits.map((x) => (
          <div
            key={x.id}
            aria-hidden="true"
            className={cn(styles.ball, x.kind === 'catch' ? styles.catchOut : x.kind === 'toss' ? styles.tossOut : styles.splat)}
            style={{ ['--tx' as string]: `${x.tx}px` }}
            onAnimationEnd={() => setExits((all) => all.filter((y) => y.id !== x.id))}
          >
            <span dir="auto" className={cn(styles.word, 'font-neo-display')}>{displayWord(x.text, lang)}</span>
          </div>
        ))}
        <div className={cn(arcade.frost, snap.frost && arcade.frostOn)} aria-hidden="true" />
      </div>
      <p className="px-3 pt-2 text-center text-xs font-bold text-neo-holiday-gold">{t('holiday.arcade.snowball.hint')}</p>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => answer('toss')}
          disabled={snap.over}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-neo-pink font-neo-display text-lg font-black text-neo-navy shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
        >
          <MoveHorizontal className="size-5" aria-hidden="true" />
          {t('holiday.arcade.snowball.toss')}
        </button>
        <button
          type="button"
          onClick={() => answer('catch')}
          disabled={snap.over}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-lg font-black text-neo-navy shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
          {t('holiday.arcade.snowball.catch')}
        </button>
      </div>
    </div>
  );
}
