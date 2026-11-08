'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, type MouseEvent } from 'react';
import { ModeGlyph } from '@/components/quick-play/ModeGlyph';
import { RandomGlyph } from '@/components/quick-play/RandomGlyph';
import { QuickResultsRays, SparkleLoop } from '@/components/quick-play/QuickResultsFx';
import { NODE_COLORS } from '@/components/quick-play/modeColors';
import type { QuickMode } from '@/components/quick-play/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { setHeroAvatarProps, setHeroAvatarSlot } from './heroAvatarBridge';
import { HeroQuickLinks } from './HeroQuickLinks';
import { quickPlayHref } from '@/lib/quickPlay/startMode';
import { trackLandingCtaClick } from '@/utils/growthTracking';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const KEY_TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

interface PlayHeroProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  animate: boolean;
  avatar: { userId: string; customAvatar: CustomAvatarConfig | null } | null;
  greeting: string;
  streak: number;
  streakLoading: boolean;
  onAvatarSaved: (config: CustomAvatarConfig) => void;
  onPlay?: () => void;
}

function AvatarStage({ avatar, animate, t, onAvatarSaved }: Pick<PlayHeroProps, 'avatar' | 'animate' | 't' | 'onAvatarSaved'>) {
  // The avatar UI (Avatar.tsx → AvatarRenderer → avatar/parts, and the edit
  // button → AvatarBuilderModal) must stay OUT of the landing module graph —
  // LandingView.bundleGraph.test.ts. The stage publishes two bare slot <div>s
  // and the avatar props on heroAvatarBridge; HeroAvatarIsland (runtime
  // import() from HeroAvatarMount, outside LandingView's graph) portals the
  // avatar trio and the edit button in after first paint. The slots carry the
  // same fixed box the avatar fills, so the swap causes no CLS.
  const avatarSlotCallback = useCallback((el: HTMLDivElement | null) => {
    setHeroAvatarSlot('hero', el);
  }, []);
  const editSlotCallback = useCallback((el: HTMLDivElement | null) => {
    setHeroAvatarSlot('heroEdit', el);
  }, []);

  useEffect(() => {
    setHeroAvatarProps(avatar ? { userId: avatar.userId, customAvatar: avatar.customAvatar, t, onAvatarSaved } : null);
    return () => setHeroAvatarProps(null);
  }, [avatar, t, onAvatarSaved]);

  return (
    <div className="relative flex h-[176px] w-full items-center [@media(max-height:700px)]:h-[132px] justify-center lg:h-[440px] 2xl:h-[520px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 lg:opacity-60">
        <QuickResultsRays color={NODE_COLORS.classic.hex} spinning={animate} compact />
      </div>
      <SparkleLoop enabled={animate} />
      <div className="relative z-10">
      <div className={`relative [@media(max-height:700px)]:scale-[0.7] ${animate ? 'animate-[qp-avatar-pop_0.7s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}`}>
        <div className={animate ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
          <div className="relative">
            {!avatar && (
              // Signed-in profile still loading and no avatar from last time:
              // a neutral disc holds the spot instead of an id-generated face.
              <div
                data-testid="hp-avatar-skeleton"
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border-[3px] border-black/60 bg-neo-white/10 ${animate ? 'animate-pulse' : ''}`}
              />
            )}
            <div
              ref={avatar ? avatarSlotCallback : undefined}
              data-testid="hp-avatar-slot"
              className="h-[140px] w-[140px] lg:h-[260px] lg:w-[260px] 2xl:h-[300px] 2xl:w-[300px]"
            />
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`absolute -bottom-2 left-1/2 -z-10 h-3 w-24 -translate-x-1/2 rounded-[50%] bg-black/45 lg:w-48 ${
            animate ? 'animate-[qp-shadow-bob_2.8s_ease-in-out_0.9s_infinite]' : ''
          }`}
        />
        <span
          aria-hidden="true"
          className="absolute -start-[50px] bottom-0 -z-10 -rotate-12 lg:-start-[84px] lg:bottom-0 2xl:-start-[96px]"
        >
          <span className={`block ${animate ? 'animate-[qp-avatar-bob_2.2s_ease-in-out_0.4s_infinite]' : ''}`}>
            <Image
              src="/mascot/hello-nobg.webp"
              alt=""
              width={320}
              height={320}
              data-testid="hp-mascot"
              loading="eager"
              unoptimized
              className="h-[80px] w-[80px] drop-shadow-[0_3px_0_black] lg:h-[136px] lg:w-[136px] 2xl:h-[160px] 2xl:w-[160px]"
            />
          </span>
        </span>
      </div>
      {avatar && (
        <div className="absolute end-1 bottom-2 z-20 [@media(max-height:700px)]:end-7 [@media(max-height:700px)]:bottom-8 lg:-end-4 lg:bottom-6">
          <div ref={editSlotCallback} data-testid="hp-edit-avatar-slot" />
        </div>
      )}
      </div>
      <span
        aria-hidden="true"
        data-testid="hp-timer-badge"
        className="absolute end-[10%] top-2 z-20 rotate-6 whitespace-nowrap rounded-full border-2 border-black bg-neo-yellow px-2.5 py-1 font-neo-display text-sm font-bold leading-none text-black shadow-hard-sm lg:end-[12%] lg:top-[14%] lg:border-[3px] lg:px-4 lg:py-2 lg:text-2xl lg:shadow-hard"
      >
        {t('homePlay.timerBadge')}
      </span>
    </div>
  );
}

export function PlayHero({ lang, t, animate, avatar, greeting, streak, streakLoading, onAvatarSaved, onPlay }: PlayHeroProps) {
  // Funnel numerator for the landing PLAY→onboarding leak, restored: the
  // play-first redesign (#1706) replaced FreshHero — which fired
  // `fresh_hero_play` on this CTA — with this hero, and the event's main
  // contributor went silent (read as "mounted-gate telemetry dead"). Same cta
  // value as the old hero keeps before/after funnels comparable
  // (FreshPlayLink convention). `opens_ftue` splits the leak cohorts: false =
  // returning user navigating natively BY DESIGN (their clicks must not count
  // as gate fall-through); true − onboarding_open_requested = the real
  // mounted-gate loss. Fires on every click, handler or not — same
  // "tracking is not gated on onPlay" semantics as FreshPlayLink.
  const handlePlayClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackLandingCtaClick('fresh_hero_play', { opens_ftue: !!onPlay });
    if (!onPlay || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPlay();
  };

  return (
    <section
      aria-labelledby="hp-play-title"
      className="relative overflow-hidden border-b-[3px] border-black lg:rounded-[28px] lg:border-[3px] lg:bg-neo-navy-elevated lg:shadow-hard-xl"
      data-testid="hp-hero"
    >
      <div className="relative mx-auto grid w-full max-w-md gap-3 px-4 pb-5 lg:max-w-none lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-14 lg:py-10">
        <AvatarStage avatar={avatar} animate={animate} t={t} onAvatarSaved={onAvatarSaved} />

        <div className="relative z-10 flex flex-col gap-3 lg:gap-6">
          <div className="text-center lg:text-start">
            <p className="font-neo-display text-xs font-bold tracking-[0.14em] text-neo-lime/90 uppercase lg:text-lg">
              {greeting} · {t('quickPlay.solo.title')}
            </p>
            <h1
              id="hp-play-title"
              className="mt-1 font-neo-display text-[21px] font-bold [@media(max-height:700px)]:text-[19px] leading-[1.15] text-neo-cream [text-shadow:0_2px_0_black] lg:text-5xl 2xl:text-6xl"
            >
              {t('homePlay.heroLine')}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-snug text-neo-white/75 [@media(max-height:700px)]:text-xs lg:mx-0 lg:mt-4 lg:max-w-xl lg:text-lg">
              {t('homePlay.intro')}
            </p>
          </div>

          <Link
            href={quickPlayHref(lang, 'random')}
            data-testid="hp-play"
            onClick={handlePlayClick}
            className="group relative flex h-[58px] items-center justify-center gap-3 [@media(max-height:700px)]:h-[52px] overflow-hidden rounded-2xl border-[3px] border-black bg-neo-lime px-4 text-black shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:h-24 lg:rounded-3xl lg:shadow-hard-lg 2xl:h-28"
          >
            {animate && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/45 animate-[qp-shine_4s_ease-in-out_1.6s_infinite_both]"
              />
            )}
            <RandomGlyph size={28} className="relative shrink-0 lg:h-12 lg:w-12" />
            <span className="relative flex flex-col items-start leading-none">
              <span className="font-neo-display text-[24px] font-bold tracking-[0.1em] lg:text-4xl">
                {t('quickPlay.solo.play')}
              </span>
              <span className="mt-0.5 text-xs font-bold tracking-wide opacity-70 lg:text-base">{t('homePlay.playSub')}</span>
            </span>
          </Link>

          <div>
            <p className="mb-2 text-center text-xs font-bold text-neo-white/60 lg:text-start lg:text-base">{t('homePlay.pickMode')}</p>
            <ul className="grid grid-cols-4 gap-2.5 lg:gap-4" data-testid="hp-keycaps">
              {MODES.map((mode, i) => (
                <li key={mode}>
                  <Link
                    href={quickPlayHref(lang, mode)}
                    className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-black text-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${NODE_COLORS[mode].bg} ${KEY_TILT[i]} ${
                      animate ? 'animate-[qp-card-in_0.55s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''
                    }`}
                    style={animate ? { animationDelay: `${300 + i * 90}ms` } : undefined}
                  >
                    <ModeGlyph mode={mode} size={30} className="lg:h-14 lg:w-14" />
                    <span className="font-neo-display text-[13px] font-bold leading-none lg:text-xl">
                      {t(`quickPlay.solo.mode.${mode}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <HeroQuickLinks lang={lang} t={t} streak={streak} streakLoading={streakLoading} />
        </div>
      </div>
    </section>
  );
}
