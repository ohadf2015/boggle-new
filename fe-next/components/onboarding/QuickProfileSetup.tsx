'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { cn } from '@/lib/utils';

interface QuickProfileSetupProps {
  onComplete: (name: string, avatar: CustomAvatarConfig) => void;
  onSkip: () => void;
}

/**
 * QuickProfileSetup - Compact slide-up card for name + avatar.
 * Step 3 of the FTUE: Identity (60-90s).
 * NOT a modal — slides up as an inline card.
 */
const QuickProfileSetup: React.FC<QuickProfileSetupProps> = ({
  onComplete,
  onSkip,
}) => {
  const { t, dir } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<CustomAvatarConfig>(getRandomAvatarConfig);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);

  const handleRandomize = useCallback(() => {
    setAvatar(getRandomAvatarConfig());
    setAvatarKey((k) => k + 1);
  }, []);

  const handleBuilderSave = useCallback((config: CustomAvatarConfig) => {
    setAvatar(config);
    setIsBuilderOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    onComplete(name.trim() || 'Player', avatar);
  }, [name, avatar, onComplete]);

  const staggerChild = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.15 + i * 0.1, type: 'spring' as const, stiffness: 400, damping: 28 },
    }),
  };

  return (
    <motion.div
      data-testid="quick-profile-setup"
      initial={{ y: 60, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm mx-auto"
      dir={dir}
    >
      <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-5 shadow-hard-md">
        {/* Header */}
        <motion.h2
          custom={0}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          className="text-xl font-black text-neo-black text-center mb-1"
        >
          {t('onboarding.ftue.niceWork')}
        </motion.h2>
        <motion.p
          custom={1}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          className="text-sm text-neo-black/70 text-center mb-4"
        >
          {t('onboarding.ftue.whatsYourName')}
        </motion.p>

        {/* Avatar (clickable to open builder) + randomize */}
        <motion.div
          custom={2}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center mb-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <motion.button
                onClick={handleRandomize}
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={cn(
                  'w-10 h-10 rounded-full border-2 border-neo-black bg-neo-yellow',
                  'flex items-center justify-center shadow-hard-sm'
                )}
                aria-label={t('onboarding.ftue.randomize', 'Randomize avatar')}
              >
                <Shuffle className="w-5 h-5 text-neo-black" />
              </motion.button>
              <span className="text-[10px] font-bold text-neo-black/50">{t('onboarding.ftue.randomize', 'Randomize')}</span>
            </div>
            <motion.button
              data-testid="avatar-edit-button"
              onClick={() => setIsBuilderOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'relative group w-20 h-20 rounded-full border-3 border-neo-black',
                'overflow-hidden bg-neo-white shadow-hard-sm',
                'transition-shadow duration-100'
              )}
              aria-label={t('onboarding.ftue.editAvatar', 'Customize avatar')}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={avatarKey}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="w-full h-full"
                >
                  <Avatar customAvatar={avatar} size="xl" />
                </motion.div>
              </AnimatePresence>
              <div className={cn(
                'absolute bottom-0 end-0 w-5 h-5',
                'bg-neo-lime border-2 border-neo-black rounded-full',
                'flex items-center justify-center shadow-hard-sm',
                'group-hover:scale-110 transition-transform'
              )}>
                <Pencil className="w-2.5 h-2.5 text-neo-black" />
              </div>
            </motion.button>
          </div>
        </motion.div>

        <AvatarBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleBuilderSave}
          initialConfig={avatar}
        />

        {/* Name input */}
        <motion.div
          custom={3}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboarding.name.placeholder')}
            autoFocus
            maxLength={20}
            className={cn(
              'w-full px-3 py-2.5 bg-white border-3 border-neo-black rounded-neo',
              'font-bold text-base text-neo-black placeholder:text-neo-black/40',
              'focus:outline-none focus:ring-3 focus:ring-neo-cyan',
              'shadow-hard-sm mb-4 min-h-[44px]'
            )}
          />
        </motion.div>

        {/* Submit button */}
        <motion.button
          custom={4}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          onClick={handleSubmit}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 2 }}
          className={cn(
            'w-full py-3 bg-neo-pink border-3 border-neo-black rounded-neo',
            'font-black text-neo-white text-lg uppercase',
            'shadow-hard-sm',
            'transition-shadow'
          )}
        >
          {t('onboarding.ftue.letsGo')}
        </motion.button>

        {/* Skip option — subtle */}
        <motion.button
          custom={5}
          variants={staggerChild}
          initial="hidden"
          animate="visible"
          onClick={onSkip}
          className="w-full text-center mt-3 text-xs text-neo-black/50 underline hover:text-neo-black/70 transition-colors"
        >
          {t('onboarding.ftue.skip')}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default QuickProfileSetup;
