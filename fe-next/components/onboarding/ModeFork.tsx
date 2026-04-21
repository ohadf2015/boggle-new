'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireOnboardingBurst } from '@/utils/confettiUtils';
import { cn } from '@/lib/utils';
import { Mascot, type MascotVariant } from '@/components/ui/Mascot';

interface ModeForkProps {
  onSelectMode: (mode: 'daily' | 'practice' | 'home' | 'joinRoom') => void;
  hasPendingInvite?: boolean;
}

interface ModeOptionProps {
  icon: React.ReactNode;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  title: string;
  description?: string;
  delay: number;
  onClick: () => void;
  testId?: string;
  featured?: boolean;
  dark?: boolean;
  mascot?: MascotVariant;
}

const ModeOption: React.FC<ModeOptionProps> = ({
  icon,
  glowColor,
  gradientFrom,
  gradientTo,
  iconBg,
  title,
  description,
  delay,
  onClick,
  testId,
  featured,
  dark,
  mascot,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      data-testid={testId}
      initial={{ y: 30, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97, y: 2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'w-full relative overflow-hidden rounded-neo-lg border-3',
        'shadow-hard-lg active:shadow-hard-pressed active:translate-y-[2px]',
        'transition-shadow duration-200',
        'flex items-center text-start gap-4 py-5 ps-5 pe-28 min-h-[104px]',
        dark
          ? 'border-neo-white/20 bg-neo-navy-light'
          : 'border-neo-black',
        featured && 'ring-2 ring-neo-lime/60 ring-offset-2 ring-offset-neo-navy'
      )}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        filter: hovered
          ? `drop-shadow(0 0 20px ${glowColor})`
          : undefined,
      }}
    >
      {/* Shine sweep on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={hovered ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: '-100%' }}
          animate={hovered ? { x: '200%' } : { x: '-100%' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Decorative corner sparkle for featured */}
      {featured && (
        <motion.div
          className="absolute top-2 start-2 z-10"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ type: 'tween', duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-4 h-4 text-neo-black/50" />
        </motion.div>
      )}

      {/* Icon with glow halo */}
      <div className="relative shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: glowColor }}
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={cn(
            'relative w-14 h-14 rounded-neo border-2 border-neo-black',
            'flex items-center justify-center shadow-hard-sm',
            iconBg
          )}
          animate={featured ? { rotate: [0, -4, 4, 0] } : { scale: [1, 1.08, 1] }}
          transition={{ delay: delay + 0.8, duration: 0.6, ease: 'easeInOut' }}
        >
          {icon}
        </motion.div>
      </div>

      {/* Text block */}
      <div className="flex flex-col gap-1 relative z-10 min-w-0 flex-1">
        <span
          className={cn(
            'font-black text-xl lg:text-2xl uppercase tracking-tight drop-shadow-md',
            dark ? 'text-neo-white' : 'text-neo-black'
          )}
        >
          {title}
        </span>
        {description && (
          <span
            className={cn(
              'text-sm font-semibold leading-snug',
              dark ? 'text-neo-white/60' : 'text-neo-black/70'
            )}
          >
            {description}
          </span>
        )}
      </div>

      {/* Mascot peeking from trailing edge */}
      {mascot && (
        <motion.div
          className="absolute inset-e-2 bottom-0 pointer-events-none z-10"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + 0.25, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <motion.div
            animate={hovered ? { y: -4, rotate: [-3, 3, -3] } : { y: 0 }}
            transition={{ duration: 0.6, repeat: hovered ? Infinity : 0, ease: 'easeInOut' }}
          >
            <Mascot variant={mascot} size="md" clipShape="none" />
          </motion.div>
        </motion.div>
      )}
    </motion.button>
  );
};

/**
 * ModeFork - Mode selection cards in the FTUE.
 * Step 5: The Fork. Vertical cards with gradient backgrounds,
 * glow halos, shine sweeps, and spring entrance animations.
 */
/** Confetti palette per mode — picked to match each card's gradient accent */
const MODE_CONFETTI_COLORS: Record<'daily' | 'practice' | 'home' | 'joinRoom', string[]> = {
  daily: ['#BFFF00', '#FFE135', '#00FFFF'],
  practice: ['#00FFFF', '#BFFF00', '#FF1493'],
  home: ['#8B5CF6', '#FF1493', '#00FFFF'],
  joinRoom: ['#FF1493', '#FFE135', '#00FFFF'],
};

const ModeFork: React.FC<ModeForkProps> = ({ onSelectMode, hasPendingInvite }) => {
  const { t, dir } = useLanguage();
  const baseDelay = hasPendingInvite ? 0.15 : 0.05;

  // Wrap the select callback so each tap fires a color-matched burst before
  // we navigate. Parent handles the isNavigating guard, so double-bursts are
  // prevented upstream.
  const handleSelect = useCallback(
    (mode: 'daily' | 'practice' | 'home' | 'joinRoom') => {
      fireOnboardingBurst({ y: 0.65 }, MODE_CONFETTI_COLORS[mode]);
      onSelectMode(mode);
    },
    [onSelectMode]
  );

  // Skip bypasses confetti — it's a quiet "take me out of onboarding" exit,
  // not a celebratory mode pick. Routes to home via existing parent handler.
  const handleSkip = useCallback(() => {
    onSelectMode('home');
  }, [onSelectMode]);

  return (
    <div
      data-testid="mode-fork"
      className="w-full max-w-sm lg:max-w-3xl mx-auto flex flex-col items-center gap-3 lg:gap-5"
      dir={dir}
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center mb-1 lg:mb-2"
      >
        <h2 className="text-xl lg:text-3xl font-neo-display font-black text-neo-cream">
          {t('onboarding.ftue.whereToStart', 'Where to start?')}
        </h2>
      </motion.div>

      {/* Primary mode cards — single bold column on mobile, 2-col on desktop.
          Home/explore removed; users who don't want either primary path can
          tap the secondary Skip link below. */}
      <div
        className={cn(
          'w-full grid grid-cols-1 gap-3',
          hasPendingInvite ? 'lg:grid-cols-3 lg:gap-5' : 'lg:grid-cols-2 lg:gap-5'
        )}
      >
      {/* Join Friend's Game — shown only when user arrived via room invite link */}
      {hasPendingInvite && (
        <ModeOption
          testId="join-room-button"
          icon={<Users className="w-7 h-7 text-neo-white" />}
          glowColor="rgba(255, 20, 147, 0.5)"
          gradientFrom="#FF1493"
          gradientTo="#c4107a"
          iconBg="bg-neo-pink-dark"
          title={t('onboarding.ftue.joinFriendsGame')}
          description={t('onboarding.ftue.joinFriendsGameDesc')}
          delay={0.05}
          onClick={() => handleSelect('joinRoom')}
          featured
          mascot="celebration"
        />
      )}

      {/* Daily Challenge card */}
      <ModeOption
        icon={<Trophy className="w-7 h-7 text-neo-white" />}
        glowColor="rgba(191, 255, 0, 0.45)"
        gradientFrom="#BFFF00"
        gradientTo="#8BC34A"
        iconBg="bg-neo-navy"
        title={t('onboarding.ftue.dailyChallenge')}
        description={t('onboarding.ftue.dailyChallengeDesc')}
        delay={baseDelay}
        onClick={() => handleSelect('daily')}
        featured={!hasPendingInvite}
        mascot="trophy"
      />

      {/* Practice Mode card */}
      <ModeOption
        icon={<Target className="w-7 h-7 text-neo-cyan" />}
        glowColor="rgba(0, 255, 255, 0.4)"
        gradientFrom="#00FFFF"
        gradientTo="#00bcd4"
        iconBg="bg-neo-navy"
        title={t('onboarding.ftue.practiceMode')}
        description={t('onboarding.ftue.practiceModeDesc')}
        delay={baseDelay + 0.1}
        onClick={() => handleSelect('practice')}
        mascot="gaming"
      />
      </div>

      {/* Secondary skip — minimal link style, no confetti, routes to home. */}
      <motion.button
        type="button"
        data-testid="mode-fork-skip"
        onClick={handleSkip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay + 0.35 }}
        className="mt-2 text-sm text-neo-white/55 hover:text-neo-white font-semibold underline underline-offset-4 decoration-neo-white/30 hover:decoration-neo-white transition-colors"
      >
        {t('onboarding.ftue.skip', 'Skip')}
      </motion.button>
    </div>
  );
};

export default ModeFork;
