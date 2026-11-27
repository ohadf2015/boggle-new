'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { WrapContent } from '@/lib/holidays/arcade/content';
import { wordLength } from '@/lib/holidays/arcade/letters';
import { WRAP_MISSES, WRAP_SECONDS, newWrap, travelFor, wrapAccept, wrapTick, type WrapState } from '@/lib/holidays/arcade/wrap';
import { cn } from '@/lib/utils';
import { useArcadeFx } from '../ArcadeShell';
import LetterRack, { type RackVerdict } from '../LetterRack';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import { useWordJudge } from '../useWordJudge';
import styles from './wrap.module.css';

interface Props {
  content: WrapContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const BOX_W = 88;
const art = (i: number, mystery: boolean) => (mystery ? '/holidays/gift-tier-9.webp' : i % 2 ? '/holidays/props-gift-blue.webp' : '/holidays/props-gift-red.webp');

export default function WrapGame({ content, lang, onScore, onEnd }: Props) {
  const { t, language } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const judge = useWordJudge(lang);
  const sim = useRef<WrapState>(newWrap(content.gifts.length));
  const floor = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const timeBar = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState({ i: 0, lives: WRAP_MISSES, over: false });
  const [solved, setSolved] = useState<{ id: number; x: number; src: string }[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const boxX = useCallback(() => {
    const s = sim.current;
    const host = floor.current;
    if (!host) return 0;
    const rtl = getComputedStyle(host).direction === 'rtl' ? -1 : 1;
    return rtl * Math.min(1, s.t / travelFor(s.i)) * (host.clientWidth - BOX_W - 18);
  }, []);

  const paint = useCallback(() => {
    if (box.current) box.current.style.transform = `translateX(${boxX()}px)`;
    if (timeBar.current) timeBar.current.style.transform = `scaleX(${Math.max(0, 1 - sim.current.elapsed / WRAP_SECONDS)})`;
  }, [boxX]);

  const commit = useCallback(
    (next: WrapState) => {
      const prev = sim.current;
      sim.current = next;
      if (next.score !== prev.score) onScore(next.score);
      if (next.i !== prev.i || next.lives !== prev.lives || next.over !== prev.over) setSnap({ i: next.i, lives: next.lives, over: next.over });
      if (next.lives < prev.lives) {
        sfx.playComboBreakSound(3);
        setNote(t('holiday.arcade.wrap.missed'));
      }
    },
    [onScore, sfx, t],
  );

  useArcadeLoop((dt) => {
    commit(wrapTick(sim.current, dt));
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
      const gift = content.gifts[at];
      if (!gift) return 'bad';
      if (wordLength(raw, lang) !== gift.letters.length) {
        sfx.playWordRejectedSound();
        setNote(t('holiday.arcade.reject.all'));
        return 'bad';
      }
      const res = await judge(raw, gift.letters, new Set());
      if (sim.current.i !== at || sim.current.over) return 'bad';
      if (!res.ok) {
        setNote(t(`holiday.arcade.reject.${res.reason}`));
        return res.reason === 'offline' ? 'retry' : 'bad';
      }
      const x = boxX();
      const next = wrapAccept(sim.current, res.word, res.len, gift.mystery);
      fx.burstAt(box.current, gift.mystery ? 'confetti' : 'ribbon', gift.mystery ? 22 : 12);
      fx.floatAt(box.current, `+${next.lastPoints}`);
      setSolved((all) => [...all.slice(-2), { id: Date.now(), x, src: art(at, gift.mystery) }]);
      if (gift.mystery) {
        sfx.playChestOpenSound();
        fx.cheer(t('holiday.arcade.wrap.mystery'));
      } else sfx.playGiftReceivedSound();
      setNote(null);
      commit(next);
      paint();
      return 'good';
    },
    [content.gifts, lang, judge, boxX, fx, sfx, t, commit, paint],
  );

  const gift = content.gifts[snap.i];

  return (
    <div className={cn('flex flex-[1_0_auto] flex-col', fx.paused && styles.paused)}>
      <div ref={timeBar} className="h-1.5 origin-left bg-neo-holiday-pine will-change-transform rtl:origin-right" aria-hidden="true" />
      <div ref={floor} className={styles.floor}>
        <div className="absolute start-2 top-2 z-10 flex gap-1" role="img" aria-label={t(pluralKeyOf('holiday.arcade.wrap.misses', snap.lives, language), { count: snap.lives })}>
          {Array.from({ length: WRAP_MISSES }, (_, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src="/holidays/props-holly.webp" alt="" width={26} height={26} className={cn('size-6', k >= snap.lives && 'opacity-25 grayscale')} />
          ))}
        </div>
        {gift?.mystery && !snap.over && (
          <p className="absolute inset-x-0 top-10 text-center font-neo-display text-sm font-black text-neo-holiday-gold" role="status">
            {t('holiday.arcade.wrap.mysteryHint')}
          </p>
        )}
        <div className={styles.belt} aria-hidden="true">
          <div className={styles.stripes} />
        </div>
        <div className={styles.end} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {content.gifts[snap.i + 1] && <img src={art(snap.i + 1, content.gifts[snap.i + 1].mystery)} alt="" aria-hidden="true" className={styles.queued} />}
        {gift && !snap.over && (
          <div key={snap.i} ref={box} className={cn(styles.box, gift.mystery && styles.mystery)} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art(snap.i, gift.mystery)} alt="" className="w-full" />
          </div>
        )}
        {solved.map((s) => (
          <div
            key={s.id}
            aria-hidden="true"
            className={styles.solved}
            style={{ ['--x' as string]: `${s.x}px`, insetInlineStart: 0 }}
            onAnimationEnd={() => setSolved((all) => all.filter((x) => x.id !== s.id))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt="" className="w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/holidays/props-holly.webp" alt="" className={styles.bow} />
          </div>
        ))}
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="mb-2 min-h-5 text-center text-xs font-bold text-neo-holiday-gold" aria-live="assertive">
          {note ?? t('holiday.arcade.wrap.hint')}
        </p>
        {gift && <LetterRack key={snap.i} letters={gift.letters} lang={lang} onSubmit={submit} disabled={snap.over} tone={gift.mystery ? 'gold' : 'snow'} />}
      </div>
    </div>
  );
}
