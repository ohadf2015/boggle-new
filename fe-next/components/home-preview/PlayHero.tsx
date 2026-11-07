'use client';

import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { ModeGlyph } from '@/components/quick-play/ModeGlyph';
import { RandomGlyph } from '@/components/quick-play/RandomGlyph';
import { QuickResultsRays, SparkleLoop } from '@/components/quick-play/QuickResultsFx';
import { NODE_COLORS } from '@/components/quick-play/modeColors';
import type { QuickMode } from '@/components/quick-play/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { HOME_PREVIEW_COPY as C } from './copy';
import { EditAvatarButton } from './EditAvatarButton';
import { HeroQuickLinks } from './HeroQuickLinks';

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
}

function AvatarStage({ avatar, animate, t, onAvatarSaved }: Pick<PlayHeroProps, 'avatar' | 'animate' | 't' | 'onAvatarSaved'>) {
  return (
    <div className="relative flex h-[224px] w-full items-center [@media(max-height:700px)]:h-[150px] justify-center lg:h-[520px] 2xl:h-[600px]">
      <QuickResultsRays color={NODE_COLORS.classic.hex} spinning={animate} />
      <SparkleLoop enabled={animate} />
      <div className="relative z-10">
      <div className={`relative [@media(max-height:700px)]:scale-[0.7] ${animate ? 'animate-[qp-avatar-pop_0.7s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}`}>
        <div className={animate ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
          {avatar ? (
            <>
              <div className="lg:hidden">
                <Avatar userId={avatar.userId} customAvatar={avatar.customAvatar ?? undefined} pixelSize={180} mood="idle" />
              </div>
              <div className="hidden lg:block 2xl:hidden">
                <Avatar userId={avatar.userId} customAvatar={avatar.customAvatar ?? undefined} pixelSize={300} mood="idle" />
              </div>
              <div className="hidden 2xl:block">
                <Avatar userId={avatar.userId} customAvatar={avatar.customAvatar ?? undefined} pixelSize={360} mood="idle" />
              </div>
            </>
          ) : (
            <div className="h-[180px] w-[180px] lg:h-[300px] lg:w-[300px] 2xl:h-[360px] 2xl:w-[360px]" />
          )}
        </div>
        <span
          aria-hidden="true"
          className={`absolute -bottom-3 left-1/2 -z-10 h-3.5 w-28 -translate-x-1/2 rounded-[50%] bg-black/45 lg:w-48 ${
            animate ? 'animate-[qp-shadow-bob_2.8s_ease-in-out_0.9s_infinite]' : ''
          }`}
        />
        <span
          aria-hidden="true"
          className="absolute -start-[64px] bottom-0 -z-10 -rotate-12 lg:-start-[96px] lg:bottom-0 2xl:-start-[110px]"
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
              className="h-[108px] w-[108px] drop-shadow-[0_3px_0_black] lg:h-[160px] lg:w-[160px] 2xl:h-[190px] 2xl:w-[190px]"
            />
          </span>
        </span>
      </div>
      {avatar && (
        <div className="absolute end-1 bottom-2 z-20 [@media(max-height:700px)]:end-7 [@media(max-height:700px)]:bottom-8 lg:-end-4 lg:bottom-6">
          <EditAvatarButton t={t} config={avatar.customAvatar} onSaved={onAvatarSaved} />
        </div>
      )}
      </div>
      <span
        aria-hidden="true"
        className="absolute end-[14%] top-3 z-20 flex h-14 w-14 rotate-12 items-center justify-center rounded-full border-[3px] border-black bg-neo-yellow font-neo-display text-lg font-bold text-black shadow-hard lg:end-[16%] lg:top-[16%] lg:h-24 lg:w-24 lg:text-3xl"
      >
        {C.timerBadge}
      </span>
    </div>
  );
}

export function PlayHero({ lang, t, animate, avatar, greeting, streak, streakLoading, onAvatarSaved }: PlayHeroProps) {
  const href = `/${lang}/quick-play`;
  return (
    <section
      aria-labelledby="hp-play-title"
      className="relative overflow-hidden border-b-[3px] border-black lg:rounded-[28px] lg:border-[3px] lg:bg-neo-navy-elevated lg:shadow-hard-xl"
      data-testid="hp-hero"
    >
      <div className="relative mx-auto grid w-full max-w-md gap-3 px-4 pb-5 lg:max-w-none lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:px-14 lg:py-12">
        <AvatarStage avatar={avatar} animate={animate} t={t} onAvatarSaved={onAvatarSaved} />

        <div className="relative z-10 flex flex-col gap-3 lg:gap-6">
          <div className="text-center lg:text-start">
            <p className="font-neo-display text-sm font-bold tracking-[0.18em] text-neo-lime uppercase lg:text-xl">
              {greeting} · {t('quickPlay.solo.title')}
            </p>
            <h1
              id="hp-play-title"
              className="mt-1 font-neo-display text-[26px] font-bold [@media(max-height:700px)]:text-[21px] leading-[1.1] text-neo-cream [text-shadow:0_3px_0_black] lg:text-6xl 2xl:text-7xl"
            >
              {C.heroLine}
            </h1>
          </div>

          <Link
            href={href}
            data-testid="hp-play"
            className="group relative flex h-[68px] items-center justify-center gap-3 [@media(max-height:700px)]:h-[58px] overflow-hidden rounded-2xl border-[3px] border-black bg-neo-lime px-4 text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:h-28 lg:rounded-3xl 2xl:h-32"
          >
            {animate && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/45 animate-[qp-shine_4s_ease-in-out_1.6s_infinite_both]"
              />
            )}
            <RandomGlyph size={34} className="relative shrink-0 lg:h-14 lg:w-14" />
            <span className="relative flex flex-col items-start leading-none">
              <span className="font-neo-display text-[28px] font-bold tracking-[0.14em] lg:text-5xl">
                {t('quickPlay.solo.play')}
              </span>
              <span className="mt-0.5 text-xs font-bold tracking-wide opacity-70 lg:text-base">{C.playSub}</span>
            </span>
          </Link>

          <div>
            <p className="mb-2 text-center text-xs font-bold text-neo-white/60 lg:text-start lg:text-base">{C.pickMode}</p>
            <ul className="grid grid-cols-4 gap-2.5 lg:gap-4" data-testid="hp-keycaps">
              {MODES.map((mode, i) => (
                <li key={mode}>
                  <Link
                    href={href}
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

          <HeroQuickLinks lang={lang} streak={streak} streakLoading={streakLoading} />
        </div>
      </div>
    </section>
  );
}
