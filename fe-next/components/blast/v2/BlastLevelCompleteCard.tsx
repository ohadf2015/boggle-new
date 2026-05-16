'use client';
import { useEffect, useRef } from 'react';
import type * as React from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  coins: number;
  cascadeCount: number;
  modeColor?: string;
  levelNumber?: number;
  wordsFound?: number;
  /** Actual words the player formed this level — rendered as chips. */
  wordsFoundList?: string[];
  timeSeconds?: number;
  gemsCollected?: number;
  bestChainDepth?: number;
  stars?: number;
  onNext: () => void;
};

// Pick a "story" line for the level result so the screen doesn't recite the
// same metrics every time. The first highlight that matches wins.
function pickHighlight(opts: {
  stars?: number;
  cascadeCount: number;
  bestChainDepth?: number;
  timeSeconds?: number;
  wordsFound?: number;
}): { label: string; tone: 'perfect' | 'chain' | 'speed' | 'scholar' | 'clean' } {
  if (opts.stars === 3) return { label: 'PERFECT RUN', tone: 'perfect' };
  if ((opts.bestChainDepth ?? 0) >= 3) return { label: 'CHAIN MASTER', tone: 'chain' };
  if ((opts.cascadeCount ?? 0) >= 2) return { label: 'CASCADE!', tone: 'chain' };
  if (typeof opts.timeSeconds === 'number' && opts.timeSeconds > 0 && opts.timeSeconds <= 25) {
    return { label: 'SPEEDRUN', tone: 'speed' };
  }
  if ((opts.wordsFound ?? 0) >= 8) return { label: 'WORDSMITH', tone: 'scholar' };
  return { label: 'LEVEL CLEAR', tone: 'clean' };
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Inline SVG icons — sized via currentColor so the tile's accent tint drives
// stroke/fill. 24px viewBox, stroke 2px throughout for a unified weight that
// the previous emoji-icons set (🪙⚡📖⏱️💎🔥) lacked. Each icon is a single
// component so the stat tile renders identically across themes/locales.
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

function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2 4 13.5h6L9 22l11-13.5h-6L13 2z" />
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

function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GemIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 3h12l3 6-9 12L3 9l3-6z" opacity="0.95" />
      <path d="M6 3l3 6h6l3-6" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} fill="none" />
      <path d="M9 9l3 12 3-12" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} fill="none" />
    </svg>
  );
}

function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c2 4 6 5 6 10a6 6 0 1 1-12 0c0-3 2-5 3-7 1 2 2 2 3 0z" />
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

type TileDef = { key: string; Icon: (p: IconProps) => React.ReactElement; value: string; label: string };

// Bigger, theme-tinted result card. Spring entrance + staggered stat reveal
// so the moment feels earned. Theme color drives the title, border accent,
// and the primary CTA — keeping each mode visually distinct.
export function BlastLevelCompleteCard({
  coins,
  cascadeCount,
  modeColor = '#BFFF00',
  levelNumber,
  wordsFound,
  wordsFoundList,
  timeSeconds,
  gemsCollected,
  bestChainDepth,
  stars,
  onNext,
}: Props) {
  const { t } = useLanguage();
  const showWords = typeof wordsFound === 'number' && wordsFound > 0;
  const showTime = typeof timeSeconds === 'number' && timeSeconds > 0;
  const showGems = typeof gemsCollected === 'number' && gemsCollected > 0;
  const showChain = typeof bestChainDepth === 'number' && bestChainDepth > 0 && cascadeCount > 0;
  const showCascades = cascadeCount > 0;
  const showStars = typeof stars === 'number' && stars > 0;

  const highlight = pickHighlight({ stars, cascadeCount, bestChainDepth, timeSeconds, wordsFound });

  // Build the stat tile list — only include metrics that actually moved this
  // run, so the card doesn't recite the same six tiles every time.
  const tiles: TileDef[] = [
    { key: 'coins', Icon: CoinIcon, value: `+${coins}`, label: t('blast.complete.coins', 'Coins') },
  ];
  if (showCascades) tiles.push({ key: 'cascades', Icon: BoltIcon, value: String(cascadeCount), label: t('blast.complete.cascadesLabel', 'Cascades') });
  if (showWords) tiles.push({ key: 'words', Icon: BookIcon, value: String(wordsFound), label: t('blast.complete.wordsLabel', 'Words') });
  if (showTime) tiles.push({ key: 'time', Icon: ClockIcon, value: formatTime(timeSeconds!), label: t('blast.complete.timeLabel', 'Time') });
  if (showGems) tiles.push({ key: 'gems', Icon: GemIcon, value: String(gemsCollected), label: t('blast.complete.gemsLabel', 'Gems') });
  if (showChain) tiles.push({ key: 'chain', Icon: FlameIcon, value: `x${bestChainDepth}`, label: t('blast.complete.chainLabel', 'Best Chain') });

  // GSAP timeline driving the entire reveal — card slam, title scale-pop with
  // glow, star cascade, stat counter-up, words list chip pour, button bounce.
  // Replaced framer-motion variants because the prior pass read as "one stagger
  // wave" — same easing, same delay, same vibe across every tile. GSAP lets
  // each beat hit a different ease + a synced confetti burst.
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const card = cardRef.current;
    if (!card || reduce) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // Card slam-in with a dramatic over-rotate + scale punch.
    tl.fromTo(
      card,
      { scale: 0.45, opacity: 0, rotation: -6, y: 40 },
      { scale: 1.05, opacity: 1, rotation: 0, y: 0, duration: 0.55, ease: 'back.out(1.8)' },
    ).to(card, { scale: 1, duration: 0.18, ease: 'power2.out' });

    // Title scale-pop with a quick yoyo glow flash.
    if (titleRef.current) {
      tl.fromTo(
        titleRef.current,
        { scale: 0.3, opacity: 0, letterSpacing: '0.4em' },
        { scale: 1, opacity: 1, letterSpacing: '0em', duration: 0.45, ease: 'back.out(2.2)' },
        '-=0.25',
      ).fromTo(
        titleRef.current,
        { filter: 'brightness(2.6) drop-shadow(0 0 28px currentColor)' },
        { filter: 'brightness(1) drop-shadow(0 0 0px currentColor)', duration: 0.5, ease: 'power2.out' },
        '<',
      );
    }

    // Stars cascade from above, one by one with a bounce.
    if (starsRef.current) {
      const stars = starsRef.current.querySelectorAll<HTMLElement>('[data-star-index]');
      tl.fromTo(
        stars,
        { y: -60, scale: 0, opacity: 0, rotation: -180 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.55,
          stagger: 0.12,
          ease: 'back.out(2.4)',
        },
        '-=0.2',
      );
    }

    // Words found chips pour in with a stagger from below.
    if (wordsRef.current) {
      const chips = wordsRef.current.querySelectorAll<HTMLElement>('[data-word-chip]');
      tl.fromTo(
        chips,
        { y: 22, scale: 0.5, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.45, stagger: 0.035, ease: 'back.out(2)' },
        '-=0.3',
      );
    }

    // Stat tiles pop up, then each value counter-ups from 0 to its real number.
    if (tilesRef.current) {
      const tileEls = tilesRef.current.querySelectorAll<HTMLElement>('[data-stat]');
      tl.fromTo(
        tileEls,
        { y: 30, scale: 0.5, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'back.out(2)',
        },
        '-=0.15',
      );

      // Counter-up: numeric values tick from 0 to their final number for
      // dramatic effect. Non-numeric values (like "1:23" time) are left as-is.
      tileEls.forEach((tile, idx) => {
        const valueEl = tile.querySelector<HTMLElement>('[data-stat-value]');
        if (!valueEl) return;
        const raw = valueEl.dataset.statValue ?? valueEl.textContent ?? '';
        const numMatch = raw.match(/^([+x]?)(\d+)$/);
        if (!numMatch) return;
        const prefix = numMatch[1] ?? '';
        const final = parseInt(numMatch[2] ?? '0', 10);
        const obj = { n: 0 };
        tl.to(
          obj,
          {
            n: final,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => {
              valueEl.textContent = `${prefix}${Math.round(obj.n)}`;
            },
          },
          `-=${0.5 - idx * 0.08}`,
        );
      });
    }

    // Button bounces in with a soft spring at the very end.
    if (buttonRef.current) {
      tl.fromTo(
        buttonRef.current,
        { y: 32, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' },
        '-=0.1',
      ).to(
        buttonRef.current,
        { scale: 1.04, duration: 0.35, repeat: -1, yoyo: true, ease: 'sine.inOut' },
      );
    }

    // Confetti burst from the card centre — DOM-based so it doesn't depend on
    // any Pixi initialization to render.
    const container = containerRef.current;
    if (container) {
      const colors = [modeColor, '#ffffff', '#fbbf24', '#ec4899', '#00ffff', '#a855f7'];
      const rect = card.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const cx = rect.left - containerRect.left + rect.width / 2;
      const cy = rect.top - containerRect.top + rect.height / 3;
      for (let i = 0; i < 36; i++) {
        const piece = document.createElement('span');
        const tint = colors[i % colors.length]!;
        const angle = Math.random() * Math.PI * 2;
        const speed = 180 + Math.random() * 220;
        Object.assign(piece.style, {
          position: 'absolute',
          left: `${cx}px`,
          top: `${cy}px`,
          width: '8px',
          height: '12px',
          marginLeft: '-4px',
          marginTop: '-6px',
          background: tint,
          borderRadius: '2px',
          boxShadow: `0 0 6px ${tint}`,
          willChange: 'transform, opacity',
          pointerEvents: 'none',
        });
        container.appendChild(piece);
        gsap.to(piece, {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed + 220,
          rotation: (Math.random() - 0.5) * 720,
          opacity: 0,
          duration: 1.3 + Math.random() * 0.6,
          ease: 'power2.in',
          delay: 0.25 + (i % 12) * 0.02,
          onComplete: () => piece.remove(),
        });
      }
    }

    return () => {
      tl.kill();
    };
  }, [modeColor]);

  return (
    <div
      ref={containerRef}
      data-testid="complete-card"
      className="relative grid place-items-center min-h-dvh overflow-hidden text-white"
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in srgb, ${modeColor} 22%, #0b1530) 0%, #0b1530 70%)`,
      }}
    >
      <div
        ref={cardRef}
        className="relative max-w-md w-[92%] px-6 py-8 rounded-2xl text-center"
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
        <div
          ref={titleRef}
          className="text-4xl font-black mt-2"
          style={{ color: modeColor, textShadow: `3px 3px 0 #0b1530` }}
        >
          {t('blast.complete.title', 'Level Complete!')}
        </div>
        {showStars && (
          <div
            ref={starsRef}
            data-testid="complete-stars"
            className="mt-3 flex justify-center gap-1.5"
            aria-label={`${stars} stars`}
            style={{ color: modeColor }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                data-star-index={i}
                data-star-filled={i < stars!}
                style={{ opacity: i < stars! ? 1 : 0.28, display: 'inline-block' }}
              >
                <StarIcon className="w-7 h-7" filled={i < stars!} />
              </span>
            ))}
          </div>
        )}
        <div
          data-testid="complete-highlight"
          data-highlight-tone={highlight.tone}
          className="mt-3 inline-block text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full"
          style={{
            background: `color-mix(in srgb, ${modeColor} 22%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${modeColor} 70%, transparent)`,
            color: modeColor,
            textShadow: `1px 1px 0 #0b1530`,
          }}
        >
          {highlight.label}
        </div>
        {wordsFoundList && wordsFoundList.length > 0 && (
          <div
            ref={wordsRef}
            data-testid="complete-words-list"
            className="mt-4 flex flex-wrap justify-center gap-1.5"
          >
            {wordsFoundList.map((w, i) => (
              <span
                key={`${w}-${i}`}
                data-word-chip
                className="text-[11px] font-black uppercase tracking-wider rounded-md px-2 py-0.5"
                style={{
                  background: modeColor,
                  color: '#0b1530',
                  boxShadow: `0 0 8px color-mix(in srgb, ${modeColor} 50%, transparent)`,
                  display: 'inline-block',
                }}
              >
                {w}
              </span>
            ))}
          </div>
        )}
        <div ref={tilesRef} className="mt-5 grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              data-stat={tile.key}
              className="rounded-xl p-3 flex flex-col items-center"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${modeColor} 14%, #0b1530) 0%, #0b1530 100%)`,
                border: `1px solid color-mix(in srgb, ${modeColor} 35%, transparent)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 2px 2px 0 rgba(0,0,0,0.35)`,
              }}
            >
              <div
                data-stat-icon
                className="w-7 h-7 flex items-center justify-center"
                style={{ color: modeColor }}
              >
                <tile.Icon className="w-7 h-7" />
              </div>
              <div
                data-stat-value={tile.value}
                className="text-xl font-bold tabular-nums mt-1.5"
              >
                {tile.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider opacity-65 mt-0.5">
                {tile.label}
              </div>
            </div>
          ))}
        </div>
        <button
          ref={buttonRef}
          onClick={onNext}
          className="mt-7 px-8 py-3 w-full rounded-lg font-black text-lg uppercase tracking-wide"
          style={{
            background: modeColor,
            color: '#0b1530',
            boxShadow: `4px 4px 0 #0b1530`,
          }}
          data-testid="next-btn"
        >
          {t('blast.complete.next', 'Next Level')} →
        </button>
      </div>
    </div>
  );
}
