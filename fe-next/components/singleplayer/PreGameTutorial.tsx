'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Pointer, Star, Zap, Play, Mouse, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Mascot } from '@/components/ui/Mascot';
import { NeoPanel } from '@/components/ui/panel';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAuth } from '@/contexts/AuthContext';
import { BoostButton } from '@/components/boosts/BoostButton';

interface PreGameTutorialProps {
  onComplete: () => void;
  sessionId: string;
}

/** Shared spring configs */
const SPRING_POP = { type: 'spring' as const, stiffness: 500, damping: 22 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 26 };

/**
 * Pre-game CTA screen: quick tips + avatar-builder prompt + boost + start.
 * The "how to play" teaching this used to lead with now happens via
 * ModeCoach's in-game overlay (mounted in SinglePlayerGame) — this is just
 * the gate before a singleplayer round begins.
 */
const PreGameTutorial: React.FC<PreGameTutorialProps> = ({ onComplete, sessionId }) => {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const { profile } = useAuth();

  const tips = [
    { icon: isDesktop ? Mouse : Pointer, titleKey: isDesktop ? 'onboarding.quickTips.tip1TitleDesktop' : 'onboarding.quickTips.tip1Title', textKey: isDesktop ? 'onboarding.quickTips.tip1TextDesktop' : 'onboarding.quickTips.tip1Text' },
    { icon: Star, titleKey: 'onboarding.quickTips.tip2Title', textKey: 'onboarding.quickTips.tip2Text' },
    { icon: Zap, titleKey: 'onboarding.quickTips.tip3Title', textKey: 'onboarding.quickTips.tip3Text' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Subtle radial gradient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center relative">
        <div className="flex flex-col items-center text-center space-y-4 w-full">
          <Mascot variant="celebration" size="lg" clipBorder="none" />

          <NeoPanel asChild tone="cream" className="relative p-4 max-w-sm">
            <m.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, ...SPRING_POP }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-12 border-b-neo-black" />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-b-10 border-b-neo-cream" />

              <h2 className="text-lg font-black text-neo-black">
                {t('preGameTutorial.tips.title')}
              </h2>
              <p className="text-xs text-neo-black/60 mt-0.5">
                {t('preGameTutorial.tips.subtitle')}
              </p>
            </m.div>
          </NeoPanel>

          {/* Tip cards — staggered entrance */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <m.div
                  key={tip.titleKey}
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, ...SPRING_POP }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cream"
                >
                  <m.div
                    className="w-8 h-8 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                    initial={{ rotate: -20 }}
                    animate={{ rotate: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, ...SPRING_POP }}
                  >
                    <Icon className="w-4 h-4" />
                  </m.div>
                  <div className="font-black text-[10px] text-neo-black leading-tight">
                    {t(tip.titleKey)}
                  </div>
                  <div className="text-[9px] text-neo-black/60 leading-snug">
                    {t(tip.textKey)}
                  </div>
                </m.div>
              );
            })}
          </div>

          {/* Avatar prompt — opens modal instead of navigating */}
          <m.button
            onClick={() => setIsAvatarBuilderOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, ...SPRING_SOFT }}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(139,92,246,0.2)' }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-white/20 bg-neo-white/5 hover:border-neo-purple/50 transition-colors text-neo-white hover:text-neo-white"
          >
            <Palette className="w-4 h-4" />
            <span className="text-xs font-bold">{t('preGameTutorial.buildAvatar')}</span>
          </m.button>
          <AvatarBuilderModal
            isOpen={isAvatarBuilderOpen}
            onClose={() => setIsAvatarBuilderOpen(false)}
            onSave={() => setIsAvatarBuilderOpen(false)}
            initialConfig={profile?.avatar_config ?? undefined}
            premium={null}
          />

          {/* Boost button and Let's Play CTA */}
          <div className="flex flex-col gap-2 items-center">
            <BoostButton mode="sp" sessionId={sessionId} />
            {/* v1: SP boosts apply client-side via useBoostClaim's cached token. */}
            {/* Server-side score multiplier deferred to v2 (per spec). */}
            <m.button
              onClick={onComplete}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, ...SPRING_POP }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, y: 2 }}
              className="bg-neo-lime border-3 border-neo-black rounded-neo px-8 py-3.5 font-black text-lg text-neo-black shadow-hard transition-shadow flex items-center gap-2"
            >
              <m.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
              </m.div>
              {t('preGameTutorial.letsPlay')}
            </m.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreGameTutorial;
