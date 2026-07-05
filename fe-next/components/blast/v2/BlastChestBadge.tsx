'use client';
import { useEffect, useRef } from 'react';
import { m, useMotionValue, animate } from 'framer-motion';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  chestNumber: number;
  progress: number; // 0-1
  contents: ChestContents | null;
  onPreview: () => void;
  modeColor?: string;
};

// Tier-color map drives the rim glow + progress fill so chests visibly
// telegraph their value (wood = neutral, gold = warm, legendary = rainbow).
const TIER_COLORS: Record<string, { rim: string; fill: string }> = {
  wood:       { rim: '#a16207', fill: '#fbbf24' },
  bronze:     { rim: '#9a3412', fill: '#fb923c' },
  silver:     { rim: '#94a3b8', fill: '#e2e8f0' },
  gold:       { rim: '#facc15', fill: '#fde047' },
  legendary:  { rim: '#a855f7', fill: '#f472b6' },
};

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function BlastChestBadge({
  chestNumber,
  progress,
  contents,
  onPreview,
  modeColor = '#BFFF00',
}: Props) {
  const { t, language } = useLanguage();
  const tier = contents?.tier ?? 'wood';
  const tierColors = TIER_COLORS[tier] ?? TIER_COLORS.wood!;
  const fillColor = tierColors.fill;
  const rimColor = tierColors.rim;

  // Animate the progress bar fill so percent updates after a word commit
  // visibly tick forward instead of jumping. Tracked via motionValue +
  // width transform on the inner fill div.
  const widthMv = useMotionValue(progress);
  const prev = useRef(progress);
  useEffect(() => {
    if (prev.current === progress) return;
    const ctrl = animate(widthMv, progress, { duration: 0.6, ease: 'easeOut' });
    prev.current = progress;
    return () => ctrl.stop();
  }, [progress, widthMv]);
  const percent = Math.round(progress * 100);

  // GSAP celebratory bounce + glow flash when the chest crosses to full.
  // Separate from the framer fill tween so the two reactions don't fight
  // for the same property surface. clearProps so the inline glow doesn't
  // stick after the flash.
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const completedPrevRef = useRef(progress);
  useEffect(() => {
    const completedBefore = completedPrevRef.current >= 1;
    const completedNow = progress >= 1;
    completedPrevRef.current = progress;
    if (!buttonRef.current || completedBefore || !completedNow) return;
    if (reducedMotion()) return;
    const el = buttonRef.current;
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { scale: 1 },
      { scale: 1.14, duration: 0.18, ease: 'back.out(2)' },
    ).to(el, {
      scale: 1,
      duration: 0.32,
      ease: 'elastic.out(1, 0.5)',
    });
    tl.fromTo(
      el,
      { boxShadow: `2px 2px 0 0 #0b1530, 0 0 14px color-mix(in srgb, ${rimColor} 40%, transparent)` },
      {
        boxShadow: `2px 2px 0 0 #0b1530, 0 0 32px ${rimColor}`,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        clearProps: 'boxShadow',
      },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [progress, rimColor]);

  // Anticipation shimmer — slow diagonal sweep across the fill bar once
  // progress is near full (>=85%). Pulls the eye to "soon" without
  // overlapping the completion flash.
  const shimmerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = shimmerRef.current;
    if (!el) return;
    if (progress < 0.85 || progress >= 1 || reducedMotion()) {
      gsap.set(el, { opacity: 0 });
      return;
    }
    gsap.set(el, { opacity: 0, x: '-100%' });
    const tween = gsap.to(el, {
      x: '100%',
      opacity: 1,
      duration: 1.1,
      ease: 'sine.inOut',
      repeat: -1,
      repeatDelay: 0.4,
      onRepeat: () => {
        gsap.set(el, { x: '-100%' });
      },
    });
    return () => {
      tween.kill();
    };
  }, [progress]);

  return (
    <button type="button"
      ref={buttonRef}
      onClick={onPreview}
      data-testid="chest-badge"
      className="rounded-xl px-3 py-1.5 text-xs space-y-1.5 text-white transition-transform active:scale-95"
      style={{
        background: 'rgba(0,0,0,0.45)',
        border: `2px solid ${rimColor}`,
        boxShadow: `2px 2px 0 0 #0b1530, 0 0 14px color-mix(in srgb, ${rimColor} 40%, transparent)`,
      }}
    >
      <div className="flex items-center gap-1.5 leading-none">
        <span aria-hidden style={{ filter: `drop-shadow(0 0 4px ${rimColor})` }}>📦</span>
        <span
          className="font-neo-display font-black text-sm tracking-wide"
          style={{ color: '#fff', textShadow: `1px 1px 0 #0b1530` }}
        >
          {t(`blast.chest.tier.${tier}`, tier.toUpperCase())}
        </span>
      </div>
      <div
        className="relative w-24 h-2.5 rounded-full overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: `1px solid color-mix(in srgb, ${rimColor} 60%, transparent)`,
        }}
      >
        <m.div
          className="h-full rounded-full"
          style={{
            scaleX: widthMv,
            transformOrigin: 'left center',
            background: `linear-gradient(90deg, ${fillColor}, ${modeColor})`,
            boxShadow: `0 0 8px ${fillColor}`,
            width: '100%',
          }}
        />
        <div
          ref={shimmerRef}
          aria-hidden
          className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
            opacity: 0,
            mixBlendMode: 'screen',
          }}
        />
      </div>
      <div
        className="text-[10px] font-bold tabular-nums opacity-90 leading-none"
        style={{ textShadow: `1px 1px 0 #0b1530` }}
      >
        {t('blast.chest.title', `Chest #${chestNumber}`, { n: String(chestNumber) })} · {percent}%
      </div>
      {contents && (
        <div className="text-[10px] space-y-0.5 leading-tight opacity-95">
          <div>+{safeToLocaleString(contents.coins, language)} {t('blast.chest.coinsSuffix', 'coins')}</div>
          {contents.boosts.length > 0 && (
            <div>+{safeToLocaleString(contents.boosts.length, language)} {t('blast.chest.boostSuffix', 'boost')}</div>
          )}
          {contents.avatarPart && <div>+1 {t('blast.chest.avatarSuffix', 'avatar part')}</div>}
        </div>
      )}
    </button>
  );
}
