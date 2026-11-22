'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useState, type MouseEvent } from 'react';
import { Users } from 'lucide-react';
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
import { quickRoundsPlayed } from '@/lib/quickPlay/guestProgress';
import { firstGameRoute } from '@/lib/onboarding/firstGameRoute';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const KEY_TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

/** Touch phone: ornamental loops must not run for the whole time the home sits open. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return coarse;
}

interface PlayHeroProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  animate: boolean;
  avatar: { userId: string; customAvatar: CustomAvatarConfig | null } | null;
  greeting: string;
  streak: number;
  streakLoading: boolean;
  /** Streak alive but today not played: the daily chip warns. */
  atRisk?: boolean;
  /** Banked streak freezes, shown on the daily chip. */
  freezes?: number;
  onAvatarSaved: (config: CustomAvatarConfig) => void;
  onPlay?: () => void;
}

function AvatarStage({ avatar, animate, loop, t, onAvatarSaved }: Pick<PlayHeroProps, 'avatar' | 'animate' | 't' | 'onAvatarSaved'> & { loop: boolean }) {
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
    <div className="relative flex h-[132px] w-full items-center [@media(max-height:700px)]:h-[112px] justify-center lg:h-[300px] 2xl:h-[340px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 lg:opacity-60">
        <QuickResultsRays color={NODE_COLORS.classic.hex} spinning={loop} compact />
      </div>
      <SparkleLoop enabled={loop} />
      <div className="relative z-10">
      <div className={`relative [@media(max-height:700px)]:scale-[0.7] ${animate ? 'animate-[qp-avatar-pop_0.7s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}`}>
        <div className={loop ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
          <div className="relative">
            {!avatar && (
              // Signed-in profile still loading and no avatar from last time:
              // a neutral disc holds the spot instead of an id-generated face.
              <div
                data-testid="hp-avatar-skeleton"
                aria-hidden="true"
                className={`absolute inset-0 rounded-full border-[3px] border-black/60 bg-neo-white/10 ${loop ? 'animate-pulse' : ''}`}
              />
            )}
            <div
              ref={avatar ? avatarSlotCallback : undefined}
              data-testid="hp-avatar-slot"
              className="h-[108px] w-[108px] lg:h-[190px] lg:w-[190px] 2xl:h-[220px] 2xl:w-[220px]"
            />
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`absolute -bottom-2 left-1/2 -z-10 h-3 w-20 -translate-x-1/2 rounded-[50%] bg-black/45 lg:w-36 ${
            loop ? 'animate-[qp-shadow-bob_2.8s_ease-in-out_0.9s_infinite]' : ''
          }`}
        />
        <span
          aria-hidden="true"
          className="absolute -start-[40px] bottom-0 -z-10 -rotate-12 lg:-start-[60px] lg:bottom-0 2xl:-start-[70px]"
        >
          <span className={`block ${loop ? 'animate-[qp-avatar-bob_2.2s_ease-in-out_0.4s_infinite]' : ''}`}>
            <Image
              src="/mascot/hello-nobg.webp"
              alt=""
              width={320}
              height={320}
              data-testid="hp-mascot"
              loading="eager"
              unoptimized
              className="h-[64px] w-[64px] drop-shadow-[0_3px_0_black] lg:h-[96px] lg:w-[96px] 2xl:h-[112px] 2xl:w-[112px]"
            />
          </span>
        </span>
      </div>
      {avatar && (
        // The pencil sits just outside the face's lower-end rim, never on it. On a
        // short phone the avatar renders at 0.7 (its circle is inset ~16px in the
        // unscaled box), so the badge steps in with it, still outside the circle.
        <div className="absolute -end-3 -bottom-3 z-20 [@media(max-height:700px)]:end-0 [@media(max-height:700px)]:bottom-0 lg:-end-24 lg:-bottom-7">
          <div ref={editSlotCallback} data-testid="hp-edit-avatar-slot" />
        </div>
      )}
      </div>
      <span
        aria-hidden="true"
        data-testid="hp-timer-badge"
        className="absolute end-[10%] top-2 z-20 rotate-6 whitespace-nowrap rounded-full border-2 border-black bg-neo-yellow px-2.5 py-1 font-neo-display text-sm font-bold leading-none text-black shadow-hard-sm lg:end-[14%] lg:top-[10%] lg:border-[3px] lg:px-3 lg:py-1.5 lg:text-xl lg:shadow-hard"
      >
        {t('homePlay.timerBadge')}
      </span>
    </div>
  );
}

export function PlayHero({ lang, t, animate, avatar, greeting, streak, streakLoading, atRisk = false, freezes = 0, onAvatarSaved, onPlay }: PlayHeroProps) {
  const coarse = useCoarsePointer();
  const loop = animate && !coarse;
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
  // First-timers (no finished Quick Play round on this device) get the coached
  // first game; everyone else keeps the instant random round. Decided after
  // mount so server HTML and hydration agree on the default href.
  const [playHref, setPlayHref] = useState(() => quickPlayHref(lang, 'random'));
  useEffect(() => {
    let first = false;
    try {
      first = quickRoundsPlayed() === 0;
    } catch {
      /* storage blocked: keep the plain round */
    }
    setPlayHref(first ? firstGameRoute(lang) : quickPlayHref(lang, 'random'));
  }, [lang]);

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
      <div className="relative mx-auto grid w-full max-w-md grid-cols-1 gap-3 px-4 pb-5 lg:max-w-none lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:px-12 lg:py-7">
        <AvatarStage avatar={avatar} animate={animate} loop={loop} t={t} onAvatarSaved={onAvatarSaved} />

        <div className="relative z-10 flex min-w-0 flex-col gap-3 lg:gap-4">
          <div className="text-center lg:text-start">
            <p className="font-neo-display text-xs font-bold tracking-[0.14em] text-neo-lime/90 uppercase lg:text-base">
              {greeting}
            </p>
            <h1
              id="hp-play-title"
              className="mt-0.5 font-neo-display text-[21px] font-bold [@media(max-height:700px)]:text-[19px] leading-[1.15] text-neo-cream [text-shadow:0_2px_0_black] lg:text-4xl 2xl:text-5xl"
            >
              {t('homePlay.heroLine')}
            </h1>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-snug text-neo-white/70 [@media(max-height:700px)]:text-xs lg:mx-0 lg:mt-2 lg:max-w-xl lg:text-base">
              {t('homePlay.intro')}
            </p>
          </div>

          {/* Today's puzzle leads: the daily habit is the one tap we want most. */}
          <HeroQuickLinks lang={lang} t={t} streak={streak} streakLoading={streakLoading} atRisk={atRisk} freezes={freezes} shine={loop} />

          <div className="grid grid-cols-2 gap-2.5 lg:gap-4">
            <Link
              href={playHref}
              data-testid="hp-play"
              onClick={handlePlayClick}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border-[3px] border-neo-lime bg-neo-navy-elevated px-3 text-neo-lime shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed [@media(max-height:700px)]:h-[46px] lg:h-16 lg:gap-3 lg:shadow-hard"
            >
              <RandomGlyph size={22} className="shrink-0 lg:h-8 lg:w-8" />
              <span className="truncate font-neo-display text-[17px] font-bold tracking-[0.06em] lg:text-2xl">
                {t('quickPlay.solo.play')}
              </span>
            </Link>

            <Link
              href={`/${lang}/multiplayer`}
              data-testid="hp-play-friends"
              onClick={() => trackLandingCtaClick('home_play_friends')}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-neo-pink px-3 text-black shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed [@media(max-height:700px)]:h-[46px] lg:h-16 lg:gap-3 lg:shadow-hard"
            >
              <Users className="h-5 w-5 shrink-0 lg:h-8 lg:w-8" strokeWidth={2.75} aria-hidden="true" />
              <span className="text-center font-neo-display text-[15px] font-bold leading-tight lg:text-2xl">
                {t('homePlay.friendsPlay')}
              </span>
            </Link>
          </div>

          <div>
            <p className="mb-2 text-center text-xs font-bold text-neo-white/60 lg:text-start lg:text-base">{t('homePlay.pickMode')}</p>
            <ul className="grid grid-cols-4 gap-2.5 lg:gap-3" data-testid="hp-keycaps">
              {MODES.map((mode, i) => (
                <li key={mode}>
                  <Link
                    href={quickPlayHref(lang, mode)}
                    className={`flex aspect-square flex-col items-center lg:aspect-auto lg:h-24 justify-center gap-1 rounded-2xl border-[3px] border-black text-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${NODE_COLORS[mode].bg} ${KEY_TILT[i]} ${
                      animate ? 'animate-[qp-card-in_0.55s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''
                    }`}
                    style={animate ? { animationDelay: `${300 + i * 90}ms` } : undefined}
                  >
                    <ModeGlyph mode={mode} size={30} className="lg:h-10 lg:w-10" />
                    <span className="font-neo-display text-[13px] font-bold leading-none lg:text-base">
                      {t(`quickPlay.solo.mode.${mode}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
