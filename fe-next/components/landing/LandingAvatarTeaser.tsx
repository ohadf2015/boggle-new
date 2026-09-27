'use client';

import Link from 'next/link';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import AvatarLite from '@/components/AvatarLite';

const SAMPLE_AVATARS = [
  { bgColor: '#FF6B35', seed: 'teaser-spiky' },
  { bgColor: '#8B5CF6', seed: 'teaser-afro' },
  { bgColor: '#00897B', seed: 'teaser-ponytail' },
] as const;

const WOBBLES = [
  { rotate: [0, -5, 5, -3, 0], y: [0, -2, 0] },
  { rotate: [0, 4, -4, 2, 0], y: [0, -3, 0] },
  { rotate: [0, -3, 6, -2, 0], y: [0, -2, 0] },
];

/**
 * Marketing teaser. Must NOT import AvatarRenderer / AvatarBuilderModal —
 * those pull the 477 KiB SVG-parts chunk onto the homepage first-paint graph.
 * Builder lives on /profile; this is a link with colored-circle stand-ins.
 */
export function LandingAvatarTeaser() {
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
    >
      <Link
        href={`/${language}/profile`}
        prefetch={false}
        onClick={() => trackLandingCtaClick('avatar_builder_teaser')}
        className={cn(
          'flex items-center gap-4 sm:gap-5 px-5 py-4 sm:px-6 sm:py-5',
          'bg-linear-to-r from-neo-purple/25 to-neo-pink/15',
          'border-3 border-neo-black rounded-neo-lg shadow-hard',
          'max-w-lg mx-auto lg:max-w-none lg:h-full',
          'hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-y-[2px]',
          'transition-all duration-150',
          'group',
        )}
      >
        <div className="flex -space-x-3 rtl:space-x-reverse shrink-0">
          {SAMPLE_AVATARS.map((config, i) => (
            <AdaptiveMotion.div
              key={config.seed}
              className={cn(
                'border-3 border-neo-black rounded-full overflow-hidden shadow-hard-sm',
                'group-hover:border-neo-purple transition-colors',
              )}
              animate={WOBBLES[i]}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatDelay: 3 + i, ease: 'easeInOut' }}
            >
              <AvatarLite userId={config.seed} customAvatar={{ bgColor: config.bgColor }} size="lg" />
            </AdaptiveMotion.div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-neo-white text-sm sm:text-base uppercase">
            {t('landing.createAvatar')}
          </p>
          <p className="text-neo-white text-xs sm:text-sm font-medium flex items-center gap-1.5 mt-0.5">
            {t('landing.designYourLook')}
            <AdaptiveMotion.span
              animate={{ x: dir === 'rtl' ? [0, -5, 0] : [0, 5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowIcon className="w-3.5 h-3.5 text-neo-purple" />
            </AdaptiveMotion.span>
          </p>
        </div>
      </Link>
    </AdaptiveMotion.div>
  );
}
