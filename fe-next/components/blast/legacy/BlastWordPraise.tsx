'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Zap, Star, Flame, Crown, type LucideIcon } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

interface BlastWordPraiseProps {
  /** Length of the last submitted word (0 = hidden) */
  wordLength: number;
  /** Incremented each time a word is submitted to retrigger animation */
  submitCount: number;
  /** Translation function */
  t: (key: string) => string | undefined;
}

interface PraiseTier {
  key: string;
  /** Bright fill for the stamp (bold neo-brutalist face) */
  fill: string;
  /** Tier accent hex — drives glow + burst rays */
  hex: string;
  icon: LucideIcon;
  /** Relative badge scale (word length → intensity) */
  scale: number;
  /** Burst rays behind the stamp (tier 6+) */
  rays: boolean;
  /** Confetti sparks (tier 8+) */
  sparks: boolean;
}

/** Praise tiers by word length — visual intensity ramps with length. */
const PRAISE_TIERS: (PraiseTier | null)[] = [
  null, null, null, null, // 0-3: no praise
  { key: 'blast.praise.nice',      fill: 'bg-neo-cyan',   hex: '#00FFFF', icon: Sparkles, scale: 0.78, rays: false, sparks: false }, // 4
  { key: 'blast.praise.great',     fill: 'bg-neo-lime',   hex: '#BFFF00', icon: Zap,      scale: 0.9,  rays: false, sparks: false }, // 5
  { key: 'blast.praise.brilliant', fill: 'bg-yellow-300', hex: '#FDE047', icon: Star,     scale: 1.05, rays: true,  sparks: false }, // 6
  { key: 'blast.praise.amazing',   fill: 'bg-neo-pink',   hex: '#FF1493', icon: Flame,    scale: 1.18, rays: true,  sparks: false }, // 7
  { key: 'blast.praise.legendary', fill: 'bg-neo-purple', hex: '#C084FC', icon: Crown,    scale: 1.34, rays: true,  sparks: true  }, // 8+
];

function getPraiseTier(wordLength: number): PraiseTier | null {
  if (wordLength < 4) return null;
  return PRAISE_TIERS[Math.min(wordLength, 8)];
}

// Fixed spark offsets (deterministic — no Math.random in render).
const SPARKS = [
  { x: -70, y: -10, d: 0 }, { x: 68, y: -22, d: 40 }, { x: -46, y: 30, d: 80 },
  { x: 52, y: 34, d: 120 }, { x: 0, y: -44, d: 60 }, { x: 12, y: 46, d: 100 },
];

/**
 * BlastWordPraise — a bold neo-brutalist "seal" that stamps in after a good word
 * ("Nice!" … "LEGENDARY!"). Distinct visual register from the numeric score-fly:
 * a solid tier-colored face, thick ink border, hard shadow, per-tier icon, plus
 * burst rays + sparks for the big tiers so a long word FEELS like an event.
 */
export default function BlastWordPraise({ wordLength, submitCount, t }: BlastWordPraiseProps) {
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const prevSubmitRef = useRef(submitCount);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    // Only trigger on new submissions
    if (submitCount === prevSubmitRef.current) return;
    prevSubmitRef.current = submitCount;

    const tier = getPraiseTier(wordLength);
    if (!tier) { setVisible(false); return; }

    setVisible(true);
    setAnimKey(k => k + 1);
    // Savor the rare tiers a little longer.
    const holdMs = tier.sparks ? 1250 : tier.rays ? 1050 : 900;
    const id = setTimeout(dismiss, holdMs);
    return () => clearTimeout(id);
  }, [submitCount, wordLength, dismiss]);

  const tier = getPraiseTier(wordLength);

  return (
    <div className="absolute inset-x-0 top-[14%] pointer-events-none z-50 flex items-start justify-center">
      <AdaptiveAnimatePresence mode="wait">
        {visible && tier && (
          <AdaptiveMotion.div
            key={animKey}
            className="relative"
            style={{ transform: `scale(${tier.scale})` }}
            initial={{ scale: 0.2, opacity: 0, y: 26, rotate: -7 }}
            animate={{
              scale: [0.2, 1.28, 0.94, 1.06, 1],
              opacity: [0, 1, 1, 1, 1],
              y: [26, -8, 0, -2, 0],
              rotate: [-7, 4, -1.5, 1, 0],
            }}
            exit={{ scale: 1.45, opacity: 0, y: -22, rotate: 5, transition: { duration: 0.28, ease: 'easeIn' } }}
            transition={{ duration: 0.58, times: [0, 0.35, 0.6, 0.8, 1], ease: 'easeOut' }}
          >
            {/* Burst rays behind the stamp (big tiers) */}
            {tier.rays && (
              <AdaptiveMotion.span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background: `repeating-conic-gradient(${tier.hex}55 0deg 11deg, transparent 11deg 26deg)`,
                  WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 62%)',
                  maskImage: 'radial-gradient(circle, #000 12%, transparent 62%)',
                }}
                initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
                animate={{ scale: [0.3, 1.15, 1], opacity: [0, 0.9, 0.7], rotate: 26 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}

            {/* The stamp */}
            <span
              className={`${tier.fill} relative flex items-center gap-2 rounded-neo border-3 border-neo-black px-5 py-1.5 shadow-hard-lg`}
              style={{ filter: `drop-shadow(0 0 14px ${tier.hex}88)` }}
            >
              <tier.icon className="w-[1.35em] h-[1.35em] text-neo-navy" strokeWidth={2.75} aria-hidden="true" />
              <span
                className="font-neo-display font-black uppercase tracking-wider text-neo-navy text-[2rem] leading-none"
                style={{ textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}
              >
                {t(tier.key)}
              </span>
            </span>

            {/* Sparks — legendary only */}
            {tier.sparks && SPARKS.map((s, i) => (
              <AdaptiveMotion.span
                key={i}
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                style={{ background: tier.hex, boxShadow: `0 0 8px ${tier.hex}` }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                animate={{ x: s.x, y: s.y, scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.85, delay: s.d / 1000, ease: 'easeOut' }}
              />
            ))}
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
