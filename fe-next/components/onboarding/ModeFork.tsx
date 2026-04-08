'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Users, Home, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

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
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      data-testid={testId}
      initial={{ y: 30, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.96, y: 2 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'w-full relative overflow-hidden rounded-neo-lg border-3',
        'shadow-hard-lg active:shadow-hard-pressed active:translate-y-[2px]',
        'transition-shadow duration-200',
        'flex flex-col items-center text-center',
        featured ? 'py-6 px-5 gap-3' : 'py-5 px-5 gap-2.5',
        dark
          ? 'border-neo-white/20 bg-neo-navy-light'
          : 'border-neo-black',
        featured && 'ring-2 ring-neo-lime/50 ring-offset-2 ring-offset-neo-navy'
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
          className="absolute top-2 inset-e-2"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-4 h-4 text-neo-black/40" />
        </motion.div>
      )}

      {/* Icon with glow halo */}
      <div className="relative">
        {/* Glow halo behind icon */}
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

      {/* Title */}
      <span
        className={cn(
          'font-black text-lg uppercase tracking-tight drop-shadow-md relative z-10',
          dark ? 'text-neo-white' : 'text-neo-black'
        )}
      >
        {title}
      </span>

      {/* Description */}
      {description && (
        <span
          className={cn(
            'text-sm font-medium leading-snug relative z-10 max-w-[220px]',
            dark ? 'text-neo-white/50' : 'text-neo-black/60'
          )}
        >
          {description}
        </span>
      )}
    </motion.button>
  );
};

/**
 * ModeFork - Mode selection cards in the FTUE.
 * Step 5: The Fork. Vertical cards with gradient backgrounds,
 * glow halos, shine sweeps, and spring entrance animations.
 */
const ModeFork: React.FC<ModeForkProps> = ({ onSelectMode, hasPendingInvite }) => {
  const { t, dir } = useLanguage();
  const baseDelay = hasPendingInvite ? 0.15 : 0.05;

  return (
    <div
      data-testid="mode-fork"
      className="w-full max-w-sm mx-auto flex flex-col items-center gap-3"
      dir={dir}
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center mb-1"
      >
        <h2 className="text-xl font-neo-display font-black text-neo-cream">
          {t('onboarding.ftue.whereToStart', 'Where to start?')}
        </h2>
      </motion.div>
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
          onClick={() => onSelectMode('joinRoom')}
          featured
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
        onClick={() => onSelectMode('daily')}
        featured={!hasPendingInvite}
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
        onClick={() => onSelectMode('practice')}
      />

      {/* Explore All Modes card */}
      <ModeOption
        icon={<Home className="w-7 h-7 text-neo-white" />}
        glowColor="rgba(139, 92, 246, 0.35)"
        gradientFrom="#2d2150"
        gradientTo="#1a1a2e"
        iconBg="bg-neo-purple/20"
        title={t('onboarding.ftue.homePage')}
        description={t('onboarding.ftue.homePageDesc')}
        delay={baseDelay + 0.2}
        onClick={() => onSelectMode('home')}
        dark
      />

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay + 0.45 }}
        className="text-sm text-neo-white/60 font-bold text-center mt-1"
      >
        {t('onboarding.ftue.moreModesUnlock')}
      </motion.p>
    </div>
  );
};

export default ModeFork;
