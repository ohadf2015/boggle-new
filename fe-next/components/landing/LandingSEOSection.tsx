'use client';

import { useParams } from 'next/navigation';
import { type Variants } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { ChevronDown, MousePointerClick, Layers, Trophy, Target } from 'lucide-react';
import { Mascot } from '@/components/ui/Mascot';
import { cn } from '@/lib/utils';
import { contentByLocale, type LandingSEOContent } from './landingSEOContent';
import { ModeShowcase } from './seo/ModeShowcase';
import { WhoPlays } from './seo/WhoPlays';
import { CommunityBand } from './seo/CommunityBand';

/* ── Animation variants (visible-by-default — must never gate SSR content) ─── */

const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const sectionReveal: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: easeOut } },
};

/* ── Scroll indicator (bouncing chevron — consumed by LandingView) ─────────── */

export function ScrollIndicator() {
  return (
    <AdaptiveMotion.div
      className="flex flex-col items-center gap-1 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
    >
      <AdaptiveMotion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-5 h-5 text-neo-black/30 dark:text-neo-white" />
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
  );
}

/* ── How to Play steps ─────────────────────────────────────────────────────── */

const STEP_ICONS = [MousePointerClick, Layers, Target, Trophy];
const STEP_BG = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-purple'] as const;
const STEP_COLORS = ['text-neo-pink', 'text-neo-cyan', 'text-neo-lime', 'text-neo-purple'] as const;
const STEP_GLOW = [
  'shadow-[0_0_20px_rgba(255,20,147,0.3)]',
  'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
  'shadow-[0_0_20px_rgba(191,255,0,0.3)]',
  'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
] as const;

/* "Play free now" CTA label — static per-locale (button copy, not SEO prose). */
const PLAY_LABEL: Record<string, string> = {
  en: 'Play free now',
  he: 'שחקו בחינם',
  sv: 'Spela gratis nu',
  ja: '今すぐ無料でプレイ',
  es: 'Juega gratis ya',
};

/* ── Main component ────────────────────────────────────────────────────────── */

interface LandingSEOSectionProps {
  className?: string;
}

export function LandingSEOSection({ className }: LandingSEOSectionProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const c: LandingSEOContent = contentByLocale[locale] || contentByLocale.en;

  return (
    <section
      className={cn(
        'w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 sm:pb-16 relative z-20',
        'space-y-16 sm:space-y-24',
        className
      )}
    >
      {/* ── §1 · What is LexiClash — identity hook with the mascot ───────────── */}
      <AdaptiveMotion.div
        className="flex flex-col items-center text-center gap-4"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <Mascot variant="waving" size="xl" animated priority={false} />
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-neo-white neo-title">
          {c.whatIsTitle}
        </h2>
        <p className="text-base sm:text-xl text-neo-cream font-semibold leading-snug max-w-2xl text-balance">
          {c.whatIsShort}
        </p>
      </AdaptiveMotion.div>

      {/* ── §2 · How to Play — connected timeline flow ───────────────────────── */}
      <AdaptiveMotion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-10 neo-title">
          {c.howToPlayTitle}
        </h2>
        <AdaptiveMotion.div
          className="relative grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-linear-to-r from-neo-pink/40 via-neo-cyan/40 via-50% to-neo-purple/40" aria-hidden="true" />
          {c.steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            return (
              <AdaptiveMotion.div
                key={step}
                variants={staggerItem}
                className="flex flex-col items-center text-center gap-3 relative"
              >
                <div className={cn(
                  'relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full',
                  'flex items-center justify-center border-3 border-neo-black',
                  STEP_BG[i], STEP_GLOW[i], 'transition-shadow duration-300'
                )}>
                  <span className="font-black text-neo-black text-xl sm:text-2xl">{i + 1}</span>
                </div>
                <div className={cn('p-2', STEP_COLORS[i])}>
                  <StepIcon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-neo-white leading-tight max-w-[140px]">
                  {step}
                </span>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </AdaptiveMotion.div>

      {/* ── §3 · Mode Showcase — what you can actually play ──────────────────── */}
      <ModeShowcase modes={c.gameModes} heading={c.featuresTitle} />

      {/* ── §4 · Who Plays — made for whoever's in the room ──────────────────── */}
      <WhoPlays cards={c.whoCanPlayCards} heading={c.whoCanPlayTitle} />

      {/* ── §5 · Community — you're joining thousands ────────────────────────── */}
      <CommunityBand
        heading={c.communityTitle}
        body={c.communityContent}
        stats={c.communityStats}
        ctaLabel={PLAY_LABEL[locale] || PLAY_LABEL.en}
        ctaHref={`/${locale}`}
        instagramHandle="@lexi.clash"
      />
    </section>
  );
}
