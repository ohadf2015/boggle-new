'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Play } from 'lucide-react';
import { QuickResultsRays, SparkleLoop } from '@/components/quick-play/QuickResultsFx';
import { NODE_COLORS } from '@/components/quick-play/modeColors';
import { HeroQuickLinks } from './HeroQuickLinks';
import { ModeRail } from './ModeRail';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { setHeroAvatarProps, setHeroAvatarSlot } from './heroAvatarBridge';
import { quickPlayHref } from '@/lib/quickPlay/startMode';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { quickRoundsPlayed } from '@/lib/quickPlay/guestProgress';
import { firstGameRoute } from '@/lib/onboarding/firstGameRoute';
import { PressSurface } from '@/components/motion/PressSurface';
import { MascotRig } from '@/components/motion/MascotRig';
import HolidayMascot from '@/components/holidays/HolidayMascot';

const EASE_OUT = 'cubic-bezier(0.22,1,0.36,1)';
const BREATH: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.035)', offset: 0.12 },
  { transform: 'scale(1)', offset: 0.24 },
  { transform: 'scale(1)' },
];

interface PlayHeroProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  animate: boolean;
  avatar: { userId: string; customAvatar: CustomAvatarConfig | null } | null;
  /** The mascot's line; null until every input it depends on has resolved. */
  bubble: string | null;
  streak: number;
  streakLoading: boolean;
  atRisk?: boolean;
  playedToday?: boolean;
  onAvatarSaved: (config: CustomAvatarConfig) => void;
  onPlay?: () => void;
}

const EASE_POP = 'cubic-bezier(0.34,1.56,0.64,1)';

function AvatarStage({ avatar, animate, loop, t, onAvatarSaved }: Pick<PlayHeroProps, 'avatar' | 'animate' | 't' | 'onAvatarSaved'> & { loop: boolean }) {
  // The avatar UI (Avatar.tsx → AvatarRenderer → avatar/parts, and the edit
  // button → AvatarBuilderModal) must stay OUT of the landing module graph —
  // LandingView.bundleGraph.test.ts. This publishes bare slot <div>s and the
  // avatar props on heroAvatarBridge; HeroAvatarIsland portals the face and the
  // edit pencil in after first paint, into a fixed box (no CLS).
  const avatarSlotCallback = useCallback((el: HTMLDivElement | null) => setHeroAvatarSlot('hero', el), []);
  const editSlotCallback = useCallback((el: HTMLDivElement | null) => setHeroAvatarSlot('heroEdit', el), []);

  useEffect(() => {
    setHeroAvatarProps(avatar ? { userId: avatar.userId, customAvatar: avatar.customAvatar, t, onAvatarSaved } : null);
    return () => setHeroAvatarProps(null);
  }, [avatar, t, onAvatarSaved]);

  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(closest-side,black_55%,transparent)]">
        <QuickResultsRays color={NODE_COLORS.classic.hex} spinning={loop} compact />
      </div>
      <SparkleLoop enabled={loop} />
      <div className="relative z-10">
        <div className={loop ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
          <div className="relative">
            {!avatar && (
              <div data-testid="hp-avatar-skeleton" aria-hidden="true" className="absolute inset-0 rounded-full border-[3px] border-black/60 bg-neo-white/10" />
            )}
            <div ref={avatar ? avatarSlotCallback : undefined} data-testid="hp-avatar-slot" className="h-[104px] w-[104px] lg:h-[136px] lg:w-[136px]" />
          </div>
        </div>
        <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 -z-10 h-3 w-20 -translate-x-1/2 rounded-[50%] bg-black/45" />
        <span aria-hidden="true" className="absolute -start-[46px] bottom-0 -rotate-12 lg:-start-[60px]">
          <MascotRig state={animate ? 'hop' : 'idle'}>
            <span data-testid="hp-mascot" className="block">
              <HolidayMascot
                defaultSrc="/mascot/hello-nobg.webp"
                defaultWidth={320}
                defaultHeight={320}
                sizes="80px"
                className="h-[60px] w-auto drop-shadow-[0_3px_0_black] lg:h-[80px]"
              />
            </span>
          </MascotRig>
        </span>
        {avatar && (
          <div className="absolute -bottom-2 -end-2 z-20">
            <div ref={editSlotCallback} data-testid="hp-edit-avatar-slot" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayHero({ lang, t, animate, avatar, bubble, streak, streakLoading, atRisk = false, playedToday = false, onAvatarSaved, onPlay }: PlayHeroProps) {
  const [coarse, setCoarse] = useState(true);
  useEffect(() => setCoarse(window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false), []);
  const loop = animate && !coarse;
  const heroRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) return;
    const hero = heroRef.current;
    hero?.querySelectorAll('[data-hero-row]').forEach((row, i) => {
      row.animate?.([{ transform: 'translateY(18px) scale(0.96)' }, { transform: 'none' }], { duration: 420, delay: i * 70, easing: EASE_POP, fill: 'backwards' });
    });
    // A touch phone gets a few breaths, not a loop for as long as the home sits open.
    const touch = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
    const breath = hero
      ?.querySelector('[data-hero-breathe]')
      ?.animate?.(BREATH, { duration: 3200, delay: 1400, iterations: touch ? 3 : Infinity, easing: 'ease-in-out' });
    return () => breath?.cancel?.();
  }, [animate]);

  useEffect(() => {
    if (!animate || !bubble) return;
    bubbleRef.current?.animate?.([{ transform: 'scale(0.6)' }, { transform: 'none' }], { duration: 280, easing: EASE_POP });
  }, [animate, bubble]);

  // `fresh_hero_play` is the landing PLAY→onboarding funnel numerator; `opens_ftue`
  // false = a returning user navigating natively, true − onboarding_open_requested =
  // the mounted-gate loss. First-timers on this device get the coached first round,
  // decided after mount so server HTML and hydration agree on the default href.
  const [playHref, setPlayHref] = useState(() => quickPlayHref(lang, 'classic'));
  useEffect(() => {
    let first = false;
    try {
      first = quickRoundsPlayed() === 0;
    } catch {
      /* storage blocked: keep the plain round */
    }
    setPlayHref(first ? firstGameRoute(lang) : quickPlayHref(lang, 'classic'));
  }, [lang]);

  const handlePlayClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackLandingCtaClick('fresh_hero_play', { opens_ftue: !!onPlay });
    if (!onPlay || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPlay();
  };

  return (
    <section
      ref={heroRef}
      aria-labelledby="hp-play-title"
      data-testid="hp-hero"
      className="holiday-hero-glow relative mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pb-2 pt-6 lg:max-w-[560px] lg:pt-10"
    >
      <div data-hero-row className="flex flex-col items-center gap-3">
        <div className="relative flex w-full justify-center pt-2">
          <AvatarStage avatar={avatar} animate={animate} loop={loop} t={t} onAvatarSaved={onAvatarSaved} />
          <div
            ref={bubbleRef}
            className={`absolute start-[calc(50%+62px)] top-0 z-20 max-w-[136px] origin-bottom-left rounded-2xl border-[3px] border-black bg-neo-cream px-3 py-2 shadow-[0_3px_0_0] shadow-neo-black rtl:origin-bottom-right lg:start-[calc(50%+80px)] lg:max-w-[180px] ${bubble ? '' : 'invisible'}`}
          >
            <span aria-hidden="true" className="absolute -start-[8px] bottom-3 h-3.5 w-3.5 rotate-45 border-b-[3px] border-s-[3px] border-black bg-neo-cream rtl:-rotate-45" />
            <p data-testid="hp-bubble" aria-live="polite" className="relative font-neo-display text-sm font-bold leading-snug text-black lg:text-base">
              {bubble ?? ''}
            </p>
          </div>
        </div>
        <div className="text-center">
          <h1 id="hp-play-title" className="text-balance font-neo-display text-[19px] font-bold leading-tight text-neo-cream lg:text-2xl">
            {t('homePlay.heroLine')}
          </h1>
          <p className="mt-0.5 text-xs text-neo-white/60 lg:text-sm">{t('homePlay.intro')}</p>
        </div>
      </div>

      <div data-hero-row>
        <div data-hero-breathe>
          <PressSurface asChild lip={6}>
            <Link
              href={playHref}
              data-testid="hp-play-now"
              data-hero-primary
              onClick={handlePlayClick}
              className="flex h-[72px] w-full items-center justify-center gap-3 rounded-3xl border-[3px] border-black bg-neo-lime px-4 font-neo-display text-[28px] font-bold tracking-wide text-black uppercase [@media(max-height:700px)]:h-[64px] lg:h-[84px] lg:text-4xl"
            >
              <Play className="h-8 w-8 shrink-0 fill-current" strokeWidth={2.75} aria-hidden="true" />
              <span className="truncate">{t('homePlay.playNow')}</span>
            </Link>
          </PressSurface>
        </div>
      </div>

      <div data-hero-row>
        <HeroQuickLinks lang={lang} t={t} animate={animate} streak={streak} streakLoading={streakLoading} atRisk={atRisk} playedToday={playedToday} />
      </div>

      <div data-hero-row>
        <ModeRail lang={lang} t={t} />
      </div>
    </section>
  );
}
