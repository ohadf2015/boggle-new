'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Target, Grid3X3, Share2, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { Language } from '@/types';

interface UnauthenticatedCreateChallengeSectionProps {
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onAuthRequired: () => void;
}

/**
 * Feature sales section for unauthenticated users to promote custom challenge creation
 * Neo-Brutalist design with mascot, benefits, and strong CTA
 */
export const UnauthenticatedCreateChallengeSection: React.FC<UnauthenticatedCreateChallengeSectionProps> = ({
  language,
  t,
  onAuthRequired,
}) => {
  const benefits = [
    { icon: Target, key: 'customPuzzles' },
    { icon: Grid3X3, key: 'chooseDifficulty' },
    { icon: Share2, key: 'shareInstantly' },
    { icon: Trophy, key: 'trackResults' },
  ];

  const handleSignUpClick = () => {
    onAuthRequired();
  };

  return (
    <m.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.35, type: 'spring' }}
      className="relative w-full"
    >
      {/* Main Card - Neo-Brutalist Style */}
      <div className="relative overflow-hidden rounded-neo border-3 border-neo-black bg-linear-to-br from-neo-lime via-neo-pink to-neo-lime shadow-hard-lg">
        {/* Sparkle Decoration */}
        <div className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2 z-10">
          <m.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-7 h-7 text-neo-pink drop-shadow-lg" fill="currentColor" />
          </m.div>
        </div>

        {/* Content Container */}
        <div className="p-5 space-y-4">
          {/* Header with Mascot */}
          <div className="flex items-start gap-4">
            {/* Mascot */}
            <m.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className="shrink-0"
            >
              <InteractiveMascot
                variant="excited"
                size="lg"
                enableHover
                enableClick
                clickAnimation="bounce"
                tooltip={t('daily.createChallengeFeature.title')}
              />
            </m.div>

            {/* Title & Subtitle */}
            <m.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex-1"
            >
              <h3 className="text-xl font-black text-neo-black uppercase tracking-tight leading-tight mb-1">
                {t('daily.createChallengeFeature.title')}
              </h3>
              <p className="text-sm font-bold text-neo-black/80">
                {t('daily.createChallengeFeature.subtitle')}
              </p>
            </m.div>
          </div>

          {/* Benefits Grid */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {benefits.map((benefit, idx) => (
              <m.div
                key={benefit.key}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.55 + idx * 0.05 }}
                className="flex items-start gap-2 bg-neo-black/10 rounded-lg p-2.5 backdrop-blur-xs"
              >
                <benefit.icon className="w-5 h-5 text-neo-black shrink-0 mt-0.5" strokeWidth={2.5} />
                <span className="text-sm font-bold text-neo-black leading-snug">
                  {t(`daily.createChallengeFeature.benefits.${benefit.key}`)}
                </span>
              </m.div>
            ))}
          </m.div>

          {/* CTA Button */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Button
              onClick={handleSignUpClick}
              className="w-full max-w-btn py-4 text-base font-black uppercase bg-neo-black text-neo-lime border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-black/90 hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm transition-all tracking-wide"
            >
              {t('daily.createChallengeFeature.ctaButton')}
            </Button>
          </m.div>

          {/* Social Proof */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="text-center"
          >
            <p className="text-xs font-bold text-neo-black/70 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-neo-lime animate-pulse" />
              {t('daily.createChallengeFeature.socialProof')}
            </p>
          </m.div>
        </div>

        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-4 left-4 w-16 h-16 border-3 border-neo-black rounded-full" />
          <div className="absolute bottom-6 right-8 w-12 h-12 border-3 border-neo-black rotate-45" />
          <div className="absolute top-1/2 right-6 w-8 h-8 bg-neo-black rounded-full" />
        </div>
      </div>
    </m.div>
  );
};

export default UnauthenticatedCreateChallengeSection;
