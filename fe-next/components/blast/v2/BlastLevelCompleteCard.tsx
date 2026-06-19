'use client';
import { useEffect, useRef } from 'react';
import type * as React from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { resultCelebration } from '@/lib/blast/v2/celebration';
import { themeEmoji } from '@/lib/blast/v2/themeEmoji';

type Props = {
  coins: number;
  modeColor?: string;
  /** Level theme id (e.g. "animals") — drives the result's theme emoji. */
  theme?: string;
  levelNumber?: number;
  /** Total theme words in the level (all are found by the time this shows). */
  themeWordCount?: number;
  /** Theme words found — equals themeWordCount at completion. */
  wordsFound?: number;
  /** Off-theme dictionary words the player discovered this run. */
  bonusWordsFound?: number;
  /** Best star rating previously earned on this level, if replaying. */
  bestStars?: number;
  /** True when THIS run beat the stored star best. */
  isNewBest?: boolean;
  /** Personal-best bonus-word count for this level. */
  bestBonus?: number;
  /** Pretty-printed fastest time (e.g. "32s" or "1:08") for this level. */
  fastestLabel?: string;
  /** True when THIS run set a new fastest time. */
  isNewFast?: boolean;
  /** True when THIS run set a new bonus-word record. */
  isNewBonus?: boolean;
  stars?: number;
  /** Replay THIS level (re-mount fresh). Omitted = no Replay button. */
  onReplay?: () => void;
  /** Escape to the home screen. Omitted = no Home button. */
  onHome?: () => void;
  /**
   * Why the level ended. 'mastered' = every theme word found (the clean win).
   * 'partial' = the board was cleared / soft-locked without every target — the
   * "finish but fewer stars" path. Framed as a positive ("Board cleared!"),
   * never as a miss; the star count carries the nuance. Defaults to 'mastered'
   * so existing call sites read unchanged.
   */
  completionReason?: 'mastered' | 'partial';
  onNext: () => void;
  // Kept for the highlight-line heuristic; no longer rendered as tiles.
  cascadeCount?: number;
  timeSeconds?: number;
  bestChainDepth?: number;
  // Deprecated: the full found-words chip list is no longer rendered (it just
  // repeated the board). Accepted so existing call sites don't break.
  wordsFoundList?: string[];
  gemsCollected?: number;
  /** Chest fill 0..1 AFTER this level (server-known progress + in-game gain). */
  chestProgress?: number;
  /** Chest fill gained THIS level (0..1) — surfaced as "+N%" so the reward
   *  loop is visible at the moment the player earned it. */
  chestProgressGain?: number;
  /** Current chest number being filled. */
  chestNumber?: number;
};

// Pick a single "story" line so the screen doesn't recite the same metrics
// every time. First match wins — order encodes priority.
function pickHighlight(opts: {
  stars?: number;
  bonusWordsFound?: number;
  cascadeCount?: number;
  bestChainDepth?: number;
  timeSeconds?: number;
  completionReason?: 'mastered' | 'partial';
}): { label: string; key: string } {
  // A partial finish gets its own upbeat badge — never a "perfect run" claim,
  // and never a scolding "you missed words". It's still a cleared board.
  if (opts.completionReason === 'partial') return { label: 'BOARD CLEARED', key: 'partial' };
  if (opts.stars === 3) return { label: 'PERFECT RUN', key: 'perfect' };
  if ((opts.bonusWordsFound ?? 0) >= 2) return { label: 'TREASURE HUNTER', key: 'treasure' };
  if ((opts.bestChainDepth ?? 0) >= 3) return { label: 'CHAIN MASTER', key: 'chain' };
  if ((opts.cascadeCount ?? 0) >= 2) return { label: 'CASCADE!', key: 'cascade' };
  if (typeof opts.timeSeconds === 'number' && opts.timeSeconds > 0 && opts.timeSeconds <= 25) {
    return { label: 'SPEEDRUN', key: 'speed' };
  }
  return { label: 'LEVEL CLEAR', key: 'clean' };
}

type IconProps = { className?: string };

function CoinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5c.5-1 1.6-1.5 3-1.5s2.5.7 2.5 1.8c0 2.2-5 1.5-5 4 0 1.1 1.1 1.8 2.5 1.8s2.5-.5 3-1.5" />
      <path d="M12 6v2M12 16v2" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M8 7h6M8 11h6" />
    </svg>
  );
}

function StarIcon({ className, filled }: IconProps & { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={1.8} strokeLinejoin="round" className={className} aria-hidden>
      <path d="m12 2 3 6.5 7 .9-5 4.9 1.3 7L12 17.8 5.7 21.3 7 14.4 2 9.4l7-.9L12 2z" />
    </svg>
  );
}

/**
 * Level-complete card — trimmed 2026-05-24.
 *
 * Old version stacked level + 3 stars + highlight + a chip for EVERY found word
 * + a 3-col grid of up to 6 stat tiles. With everything firing it read as a
 * data dump. The reward moment only needs three beats:
 *   1. Stars  — did I do well?   (hero)
 *   2. Coins  — what did I earn?  (hero)
 *   3. Words / Bonus — one compact line of context.
 * Everything else (cascades, time, gems, chain depth, the word list) is cut
 * from the surface; the cascade/time/chain values still feed the one highlight
 * line so the screen keeps a little variety.
 */
export function BlastLevelCompleteCard({
  coins,
  modeColor = '#BFFF00',
  theme,
  levelNumber,
  themeWordCount,
  wordsFound,
  bonusWordsFound = 0,
  bestStars,
  isNewBest = false,
  bestBonus,
  fastestLabel,
  isNewFast = false,
  isNewBonus = false,
  stars,
  completionReason = 'mastered',
  onNext,
  onReplay,
  onHome,
  cascadeCount,
  timeSeconds,
  bestChainDepth,
  chestProgress,
  chestProgressGain = 0,
  chestNumber,
}: Props) {
  const { t } = useLanguage();
  const emoji = themeEmoji(theme);
  const showStars = typeof stars === 'number' && stars > 0;
  const showBonus = bonusWordsFound > 0;
  const wordCount = wordsFound ?? themeWordCount ?? 0;
  const showWords = wordCount > 0;
  const showBest = typeof bestStars === 'number' && bestStars > 0;
  // Chest progression — the core reward loop. Surfacing it on the result screen
  // (with the "+N% this level" delta and a near-full nudge) turns each clear
  // into visible progress toward the next chest, the strongest replay pull.
  const showChest = typeof chestProgress === 'number';
  const chestPct = Math.round(Math.min(1, Math.max(0, chestProgress ?? 0)) * 100);
  const chestGainPct = Math.round(Math.min(1, Math.max(0, chestProgressGain)) * 100);
  const chestReady = (chestProgress ?? 0) >= 1;
  const chestAlmost = !chestReady && (chestProgress ?? 0) >= 0.85;

  const highlight = pickHighlight({ stars, bonusWordsFound, cascadeCount, bestChainDepth, timeSeconds, completionReason });
  // Celebration intensity scales to the outcome — soft partial / standard win /
  // epic 3-star. Drives confetti volume, per-star bursts, and the finale flash.
  const celebration = resultCelebration({ completionReason, stars });
  const isPartial = completionReason === 'partial';
  const titleText = isPartial
    ? t('blast.complete.titlePartial', 'Board Cleared!')
    : t('blast.complete.title', 'Level Complete!');

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const coinsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const card = cardRef.current;
    if (!card || reduce) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      card,
      { scale: 0.45, opacity: 0, rotation: -6, y: 40 },
      { scale: 1.05, opacity: 1, rotation: 0, y: 0, duration: 0.55, ease: 'back.out(1.8)' },
    ).to(card, { scale: 1, duration: 0.18, ease: 'power2.out' });

    // Stars cascade from above first — the headline beat.
    if (starsRef.current) {
      const starEls = starsRef.current.querySelectorAll<HTMLElement>('[data-star-index]');
      tl.fromTo(
        starEls,
        { y: -60, scale: 0, opacity: 0, rotation: -180 },
        { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.55, stagger: 0.14, ease: 'back.out(2.6)' },
        '-=0.15',
      );
    }

    if (titleRef.current) {
      tl.fromTo(
        titleRef.current,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
        '-=0.25',
      );
    }

    // Coin reward counts up from 0 → final for a satisfying tick.
    if (coinsRef.current) {
      const valueEl = coinsRef.current.querySelector<HTMLElement>('[data-coin-value]');
      tl.fromTo(coinsRef.current, { y: 24, opacity: 0, scale: 0.7 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, '-=0.15');
      if (valueEl) {
        const obj = { n: 0 };
        tl.to(obj, {
          n: coins,
          duration: 0.7,
          ease: 'power2.out',
          onUpdate: () => { valueEl.textContent = `+${Math.round(obj.n)}`; },
        }, '-=0.35');
      }
    }

    if (buttonRef.current) {
      const btn = tl.fromTo(
        buttonRef.current,
        { y: 32, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' },
        '-=0.1',
      );
      // The idle "press me" pulse is for real wins only — a softer partial
      // shouldn't nag with a looping animation.
      if (celebration.tier !== 'soft') {
        btn.to(buttonRef.current, { scale: 1.04, duration: 0.35, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      }
    }

    // Confetti — DOM-based so it never depends on Pixi. Count + extras scale to
    // the outcome (resultCelebration): soft partial < standard win < epic 3★.
    const container = containerRef.current;
    const colors = [modeColor, '#ffffff', '#fbbf24', '#ec4899', '#00ffff', '#a855f7'];
    const containerRect = container?.getBoundingClientRect();
    const burst = (cx: number, cy: number, count: number, delay: number, spread = 220) => {
      if (!container) return;
      for (let i = 0; i < count; i++) {
        const piece = document.createElement('span');
        const tint = colors[i % colors.length]!;
        const angle = Math.random() * Math.PI * 2;
        const speed = 140 + Math.random() * spread;
        Object.assign(piece.style, {
          position: 'absolute', left: `${cx}px`, top: `${cy}px`,
          width: '8px', height: '12px', marginLeft: '-4px', marginTop: '-6px',
          background: tint, borderRadius: '2px', boxShadow: `0 0 6px ${tint}`,
          willChange: 'transform, opacity', pointerEvents: 'none',
        });
        container.appendChild(piece);
        gsap.to(piece, {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed + 220,
          rotation: (Math.random() - 0.5) * 720,
          opacity: 0,
          duration: 1.3 + Math.random() * 0.6,
          ease: 'power2.in',
          delay,
          onComplete: () => piece.remove(),
        });
      }
    };

    if (container && containerRect) {
      const rect = card.getBoundingClientRect();
      const cx = rect.left - containerRect.left + rect.width / 2;
      const cy = rect.top - containerRect.top + rect.height / 3;
      burst(cx, cy, celebration.confettiCount, 0.25);

      // Epic only: a small pop as each star lands, timed to the cascade stagger.
      if (celebration.perStarBurst && starsRef.current) {
        const starEls = starsRef.current.querySelectorAll<HTMLElement>('[data-star-filled="true"]');
        starEls.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          burst(
            r.left - containerRect.left + r.width / 2,
            r.top - containerRect.top + r.height / 2,
            8,
            0.55 + i * 0.14,
            110,
          );
        });
      }

      // Epic finale: a brief screen-wide flash once the beats have landed.
      if (celebration.finale) {
        const flash = document.createElement('div');
        Object.assign(flash.style, {
          position: 'absolute', inset: '0', pointerEvents: 'none',
          background: `radial-gradient(circle at 50% 40%, ${modeColor}, transparent 60%)`,
          opacity: '0', willChange: 'opacity',
        });
        container.appendChild(flash);
        gsap.to(flash, { opacity: 0.5, duration: 0.12, delay: 1.0, ease: 'power2.out',
          onComplete: () => {
            gsap.to(flash, { opacity: 0, duration: 0.5, ease: 'power2.in', onComplete: () => flash.remove() });
          },
        });
        burst(containerRect.width / 2, containerRect.height / 3, 24, 1.05, 300);
      }
    }

    return () => { tl.kill(); };
  }, [modeColor, coins, celebration.confettiCount, celebration.perStarBurst, celebration.finale, celebration.tier]);

  return (
    <div
      ref={containerRef}
      data-testid="complete-card"
      className="relative grid place-items-center min-h-dvh overflow-hidden text-white"
      style={{ background: `radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 0%, #0b1530 70%)` }}
    >
      <div
        ref={cardRef}
        className="relative max-w-sm w-[90%] px-6 py-8 rounded-2xl text-center"
        style={{
          opacity: 0,
          background: '#16213e',
          border: `3px solid ${modeColor}`,
          boxShadow: `6px 6px 0 #0b1530, 0 0 60px color-mix(in srgb, ${modeColor} 35%, transparent)`,
        }}
      >
        {levelNumber !== undefined && (
          <div className="text-xs uppercase tracking-[0.2em] opacity-70">
            {t('blast.level', `Level ${levelNumber}`, { n: String(levelNumber) })}
          </div>
        )}

        {/* Theme emoji — gives each level its own visual identity at a glance. */}
        <div
          data-testid="complete-theme-emoji"
          className="mt-1 text-5xl leading-none"
          aria-hidden
          style={{ filter: `drop-shadow(0 0 12px color-mix(in srgb, ${modeColor} 70%, transparent))` }}
        >
          {emoji}
        </div>

        {/* HERO 1 — stars */}
        {showStars && (
          <div
            ref={starsRef}
            data-testid="complete-stars"
            className="mt-3 flex justify-center gap-2"
            aria-label={`${stars} ${t('blast.complete.stars', 'stars')}`}
            style={{ color: modeColor }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                data-star-index={i}
                data-star-filled={i < stars!}
                style={{ opacity: i < stars! ? 1 : 0.25, display: 'inline-block' }}
              >
                <StarIcon className="w-9 h-9" filled={i < stars!} />
              </span>
            ))}
          </div>
        )}

        {/* Best / new-best — quiet line under the stars */}
        {isNewBest ? (
          <div
            data-testid="complete-newbest"
            className="mt-1.5 text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: '#FFE135', textShadow: '1px 1px 0 #0b1530' }}
          >
            {t('blast.complete.newBest', 'NEW BEST!')}
          </div>
        ) : showBest ? (
          <div data-testid="complete-best" className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-60">
            {t('blast.complete.best', 'Best')} {'★'.repeat(bestStars!)}
          </div>
        ) : null}

        {/* Multi-axis personal-best subline — fastest time + bonus-word best.
            Flashes yellow on a new record; quiet otherwise. Drives replay
            on TWO extra axes beyond stars. */}
        {(isNewFast || isNewBonus || (fastestLabel && fastestLabel !== '—') || (typeof bestBonus === 'number' && bestBonus > 0)) && (
          <div
            data-testid="complete-records"
            className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.16em] font-bold"
          >
            {fastestLabel && fastestLabel !== '—' && (
              <span
                data-testid="complete-fastest"
                data-new={isNewFast ? 'true' : 'false'}
                style={{
                  color: isNewFast ? '#FFE135' : 'rgba(255,255,255,0.55)',
                  textShadow: isNewFast ? '1px 1px 0 #0b1530' : 'none',
                }}
              >
                {isNewFast
                  ? t('blast.completeExtras.newFast', 'NEW FASTEST!')
                  : t('blast.completeExtras.bestFast', 'Fastest {time}', { time: fastestLabel })}
              </span>
            )}
            {typeof bestBonus === 'number' && bestBonus > 0 && (
              <span
                data-testid="complete-bestbonus"
                data-new={isNewBonus ? 'true' : 'false'}
                style={{
                  color: isNewBonus ? '#FFE135' : 'rgba(255,255,255,0.55)',
                  textShadow: isNewBonus ? '1px 1px 0 #0b1530' : 'none',
                }}
              >
                {isNewBonus
                  ? t('blast.completeExtras.newBonus', 'NEW BONUS RECORD!')
                  : t('blast.completeExtras.bestBonus', 'Best ⭐ {count}', { count: String(bestBonus) })}
              </span>
            )}
          </div>
        )}

        <div
          ref={titleRef}
          data-testid="complete-title"
          className="text-2xl font-black mt-2"
          style={{ color: modeColor, textShadow: `2px 2px 0 #0b1530` }}
        >
          {titleText}
        </div>

        <div
          data-testid="complete-highlight"
          data-highlight={highlight.key}
          className="mt-2 inline-block text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full"
          style={{
            background: `color-mix(in srgb, ${modeColor} 22%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${modeColor} 70%, transparent)`,
            color: modeColor,
            textShadow: `1px 1px 0 #0b1530`,
          }}
        >
          {highlight.label}
        </div>

        {/* HERO 2 — coin reward */}
        <div
          ref={coinsRef}
          data-testid="complete-coins"
          className="mt-5 flex items-center justify-center gap-2"
          style={{ color: modeColor }}
        >
          <CoinIcon className="w-8 h-8" />
          <span data-coin-value className="text-4xl font-black tabular-nums" style={{ textShadow: `2px 2px 0 #0b1530` }}>
            +{coins}
          </span>
        </div>

        {/* Compact context line — words + bonus only */}
        {(showWords || showBonus) && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {showWords && (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid color-mix(in srgb, ${modeColor} 30%, transparent)` }}
              >
                <BookIcon className="w-4 h-4" />
                {wordCount} {t('blast.complete.wordsLabel', 'Words')}
              </span>
            )}
            {showBonus && (
              <span
                data-testid="complete-bonus"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-black"
                style={{ background: modeColor, color: '#0b1530', boxShadow: `2px 2px 0 #0b1530` }}
              >
                ⭐ {bonusWordsFound} {t('blast.complete.bonusLabel', 'Bonus')}
              </span>
            )}
          </div>
        )}

        {/* Chest progression — the reward loop made visible. */}
        {showChest && (
          <div data-testid="complete-chest" data-chest-pct={chestPct} className="mt-4 text-left">
            <div className="flex items-center justify-between mb-1 text-[10px] font-bold uppercase tracking-[0.16em]">
              <span className="opacity-80">
                🎁 {t('blast.complete.chestLabel', 'Chest')}{chestNumber ? ` ${chestNumber}` : ''}
              </span>
              <span style={{ color: modeColor }}>
                {chestPct}%{chestGainPct > 0 ? ` (+${chestGainPct}%)` : ''}
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)', border: `1px solid color-mix(in srgb, ${modeColor} 40%, transparent)` }}
            >
              <div style={{ width: `${chestPct}%`, height: '100%', background: modeColor, boxShadow: `0 0 8px ${modeColor}` }} />
            </div>
            {chestReady ? (
              <div data-testid="complete-chest-ready" className="mt-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: '#FFE135', textShadow: '1px 1px 0 #0b1530' }}>
                {t('blast.complete.chestReady', 'Chest ready to open!')}
              </div>
            ) : chestAlmost ? (
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider opacity-75">
                {t('blast.complete.chestAlmost', 'Almost full — one more level!')}
              </div>
            ) : null}
          </div>
        )}

        <button
          ref={buttonRef}
          onClick={onNext}
          className="mt-7 px-8 py-3 w-full rounded-lg font-black text-lg uppercase tracking-wide"
          style={{ background: modeColor, color: '#0b1530', boxShadow: `4px 4px 0 #0b1530` }}
          data-testid="next-btn"
        >
          {t('blast.complete.next', 'Next Level')} →
        </button>

        {(onReplay || onHome) && (
          <div className="mt-3 flex items-center justify-center gap-3">
            {onReplay && (
              <button
                onClick={onReplay}
                data-testid="complete-replay-btn"
                className="flex-1 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide transition-transform active:scale-95"
                style={{ background: 'transparent', color: modeColor, border: `2px solid color-mix(in srgb, ${modeColor} 55%, transparent)` }}
              >
                ↺ {t('blast.complete.replay', 'Replay')}
              </button>
            )}
            {onHome && (
              <button
                onClick={onHome}
                data-testid="complete-home-btn"
                className="flex-1 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide transition-transform active:scale-95"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '2px solid rgba(255,255,255,0.25)' }}
              >
                ⌂ {t('blast.complete.home', 'Home')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
