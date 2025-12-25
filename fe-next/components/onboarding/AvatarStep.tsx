'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATARS, getAvatarPath } from '@/utils/avatarConfig';
import { cn } from '@/lib/utils';

interface AvatarStepProps {
  selectedAvatarId: string;
  onAvatarSelect: (avatarId: string) => void;
}

/**
 * AvatarStep - Avatar selection with neo-brutalist styling
 * Shows all available avatars in a grid for user to choose
 */
const AvatarStep: React.FC<AvatarStepProps> = ({
  selectedAvatarId,
  onAvatarSelect,
}) => {
  const { t } = useLanguage();

  const selectedAvatar = AVATARS.find((a) => a.id === selectedAvatarId) || AVATARS[0];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.avatar.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.avatar.subtitle')}
        </p>
      </motion.div>

      {/* Selected avatar preview */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-neo-yellow border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-neo-black shadow-hard-sm">
            <Image
              src={getAvatarPath(selectedAvatar)}
              alt={selectedAvatar.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-neo-black/60">
              {t('onboarding.avatar.selected')}
            </div>
            <div className="font-black text-sm sm:text-base text-neo-black">
              {selectedAvatar.name}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Avatar grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {AVATARS.map((avatar, index) => {
            const isSelected = avatar.id === selectedAvatarId;

            return (
              <motion.button
                key={avatar.id}
                onClick={() => onAvatarSelect(avatar.id)}
                className={cn(
                  'relative aspect-square rounded-neo border-2 sm:border-3 overflow-hidden',
                  'transition-all hover:scale-105 active:scale-95',
                  'min-h-[48px] min-w-[48px]',
                  isSelected
                    ? 'border-neo-cyan shadow-hard-sm sm:shadow-hard-md scale-105 ring-2 ring-neo-pink'
                    : 'border-neo-black shadow-hard-sm hover:shadow-hard-md'
                )}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + index * 0.02 }}
                whileHover={{ scale: isSelected ? 1.05 : 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image
                  src={getAvatarPath(avatar)}
                  alt={avatar.name}
                  fill
                  className="object-cover"
                />

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center"
                  >
                    <div className="bg-neo-pink border-2 border-neo-black rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-black text-xs shadow-hard-sm">
                      ✓
                    </div>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default AvatarStep;
