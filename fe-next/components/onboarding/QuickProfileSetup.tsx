'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

  const handleRandomize = useCallback(() => {
    setAvatar(getRandomAvatarConfig());
  }, []);

  const handleBuilderSave = useCallback((config: CustomAvatarConfig) => {
    setAvatar(config);
    setIsBuilderOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    onComplete(name.trim() || 'Player', avatar);
  }, [name, avatar, onComplete]);

  return (
    <motion.div
      data-testid="quick-profile-setup"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm mx-auto"
      dir={dir}
    >
      <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-5 shadow-hard-md">
        {/* Header */}
        <h2 className="text-xl font-black text-neo-black text-center mb-1">
          {t('onboarding.ftue.niceWork')}
        </h2>
        <p className="text-sm text-neo-black/70 text-center mb-4">
          {t('onboarding.ftue.whatsYourName')}
        </p>

        {/* Avatar (clickable to open builder) + randomize */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            data-testid="avatar-edit-button"
            onClick={() => setIsBuilderOpen(true)}
            className={cn(
              'relative group w-16 h-16 rounded-full border-3 border-neo-black',
              'overflow-hidden bg-neo-white shadow-hard-sm',
              'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard',
              'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
              'transition-all duration-100'
            )}
            aria-label={t('onboarding.ftue.editAvatar', 'Customize avatar')}
          >
            <Avatar customAvatar={avatar} size="xl" />
            <div className={cn(
              'absolute bottom-0 end-0 w-5 h-5',
              'bg-neo-lime border-2 border-neo-black rounded-full',
              'flex items-center justify-center shadow-hard-sm',
              'group-hover:scale-110 transition-transform'
            )}>
              <Pencil className="w-2.5 h-2.5 text-neo-black" />
            </div>
          </button>
          <button
            onClick={handleRandomize}
            className={cn(
              'w-10 h-10 rounded-full border-2 border-neo-black bg-neo-yellow',
              'flex items-center justify-center shadow-hard-sm',
              'hover:scale-105 active:scale-95 transition-transform'
            )}
            aria-label={t('onboarding.ftue.randomize', 'Randomize avatar')}
          >
            <Shuffle className="w-5 h-5 text-neo-black" />
          </button>
        </div>

        <AvatarBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleBuilderSave}
          initialConfig={avatar}
        />

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('onboarding.name.placeholder')}
          maxLength={20}
          className={cn(
            'w-full px-3 py-2.5 bg-white border-3 border-neo-black rounded-neo',
            'font-bold text-base text-neo-black placeholder:text-neo-black/40',
            'focus:outline-none focus:ring-3 focus:ring-neo-cyan',
            'shadow-hard-sm mb-4 min-h-[44px]'
          )}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className={cn(
            'w-full py-3 bg-neo-pink border-3 border-neo-black rounded-neo',
            'font-black text-neo-white text-lg uppercase',
            'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
            'transition-all active:translate-y-[2px]'
          )}
        >
          {t('onboarding.ftue.letsGo')}
        </button>

        {/* Skip option — subtle */}
        <button
          onClick={onSkip}
          className="w-full text-center mt-3 text-xs text-neo-black/50 underline hover:text-neo-black/70 transition-colors"
        >
          {t('onboarding.ftue.skip')}
        </button>
      </div>
    </motion.div>
  );
};

export default QuickProfileSetup;
