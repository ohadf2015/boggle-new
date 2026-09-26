'use client';

/**
 * The new modes (Adventure, Word Tower) as a featured pair: key art, a NEW
 * sticker, one line each, and the LootPeek chest below. Shared by the fresh
 * "Pick your game" section and the returning-home NewModesAnnouncement, so the
 * two placements never drift. Side by side at every width: the pair reads as
 * one offer, and at 390px it costs one screen of scroll, not two.
 */
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { modeRoute } from '@/lib/landing/modeMeta';
import { trackGrowthEvent, trackLandingCtaClick, trackModeSelected } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import { LootPeek } from './LootPeek';

type SpotlightMode = 'adventure' | 'wordTowerV2';

/** Literal class strings per card (Tailwind v4 only sees literals). Tones match the hub cubes. */
const CARDS: ReadonlyArray<{
  mode: SpotlightMode;
  art: string;
  title: string;
  line: string;
  cta: string;
  tone: string;
  sticker: string;
  tilt: string;
}> = [
  {
    mode: 'adventure', art: '/home/new-adventure.webp',
    title: 'newModes.adventureTitle', line: 'newModes.adventureLine', cta: 'newModes.playAdventure',
    tone: 'bg-neo-lime', sticker: 'bg-neo-pink -rotate-6', tilt: '-rotate-1',
  },
  {
    mode: 'wordTowerV2', art: '/home/new-wordtower.webp',
    title: 'newModes.wordTowerTitle', line: 'newModes.wordTowerLine', cta: 'newModes.playWordTower',
    tone: 'bg-neo-purple', sticker: 'bg-neo-yellow rotate-6', tilt: 'rotate-1',
  },
];

export interface NewModesSpotlightProps {
  /** Where it renders; tags the CTA event so funnels can compare placements. */
  surface: 'fresh' | 'returning';
  onModeClick?: (mode: SpotlightMode) => void;
}

export function NewModesSpotlight({ surface, onModeClick }: NewModesSpotlightProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-8">
        {CARDS.map((card) => {
          const href = modeRoute(card.mode, language);
          if (!href) return null;
          return (
            <Link
              key={card.mode}
              href={href}
              data-spotlight-mode={card.mode}
              onClick={() => {
                trackModeSelected(card.mode, 'home');
                trackLandingCtaClick('new_modes_spotlight', { mode: card.mode, surface });
                trackGrowthEvent('featured_mode_card_clicked', { mode: card.mode, surface });
                onModeClick?.(card.mode);
              }}
              className={cn(
                'group relative flex flex-col rounded-neo border-3 border-neo-black p-2 text-neo-black shadow-hard-xl sm:p-3',
                card.tone,
                card.tilt,
                'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out',
                'hover:rotate-0 motion-safe:hover:-translate-y-1',
                'active:translate-y-[3px] active:scale-[0.98] active:shadow-hard-pressed',
                'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cream'
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden lg:aspect-[16/10] rounded-[6px] border-3 border-neo-black bg-neo-navy">
                <Image
                  src={card.art}
                  alt=""
                  fill
                  // Returning home: the pair is above the fold and often the LCP element.
                  loading={surface === 'returning' ? 'eager' : 'lazy'}
                  sizes="(min-width: 1024px) 560px, 48vw"
                  className="select-none object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.05]"
                />
              </div>
              <span
                className={cn(
                  'absolute -top-3 end-2 z-10 rounded-full border-3 border-neo-black px-2.5 py-0.5 shadow-hard sm:-top-4 sm:px-4 sm:py-1',
                  'font-neo-display text-xs font-black uppercase tracking-wider sm:text-base',
                  card.sticker
                )}
              >
                {t('landing.badge.new')}
              </span>
              <div className="flex flex-1 flex-col gap-1 px-1 pb-1 pt-2.5 sm:gap-2 sm:px-2 sm:pt-4">
                <h3 className="font-neo-display text-lg font-bold leading-tight sm:text-3xl">{t(card.title)}</h3>
                <p className="font-neo-body text-sm leading-snug sm:text-base">{t(card.line)}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 self-start pt-2 font-neo-display text-xs font-black uppercase tracking-wide sm:text-base">
                  {t(card.cta)}
                  <DirectionalIcon
                    icon={ArrowRight}
                    className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1 rtl:motion-safe:group-hover:-translate-x-1"
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <LootPeek />
    </div>
  );
}
