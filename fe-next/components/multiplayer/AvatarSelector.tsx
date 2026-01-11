'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATARS, getAvatarPath } from '@/utils/avatarConfig';
import { cn } from '@/lib/utils';

interface AvatarSelectorProps {
  selectedAvatarId: string;
  onAvatarChange: (avatarId: string) => void;
  profilePictureUrl?: string | null;
  className?: string;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatarId,
  onAvatarChange,
  profilePictureUrl,
  className,
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const isUsingProfilePicture = selectedAvatarId === PROFILE_AVATAR_ID;
  const hasProfilePicture = !!profilePictureUrl;

  const currentAvatarConfig = AVATARS.find((a) => a.id === selectedAvatarId) || AVATARS[0];
  const currentAvatarName = isUsingProfilePicture
    ? (t('profile.you') || 'YOU')
    : currentAvatarConfig.name;
  const currentAvatarImage = isUsingProfilePicture
    ? profilePictureUrl!
    : getAvatarPath(currentAvatarConfig);

  const handleAvatarSelect = (avatarId: string) => {
    onAvatarChange(avatarId);
    setIsExpanded(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Collapsed State - Current Avatar Preview */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between gap-4',
          'p-4 rounded-neo border-2 border-neo-black',
          'bg-neo-navy/40 hover:bg-neo-navy/60',
          'transition-all duration-200',
          'shadow-hard-sm hover:shadow-hard',
          'hover:translate-x-[-1px] hover:translate-y-[-1px]',
          'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-neo border-2 border-neo-cyan overflow-hidden flex-shrink-0 shadow-hard-sm">
            <Image
              src={currentAvatarImage}
              alt={currentAvatarName}
              fill
              className="object-cover"
              referrerPolicy={isUsingProfilePicture ? 'no-referrer' : undefined}
            />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase text-neo-cyan">
              {t('profile.chooseAvatar') || 'Choose Avatar'}
            </p>
            <p className="text-sm font-bold text-neo-white">
              {currentAvatarName}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-neo-cyan" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neo-cyan" />
          )}
        </div>
      </button>

      {/* Expanded State - Avatar Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto rounded-neo border-2 border-neo-black p-3 bg-neo-navy/40 shadow-hard-sm">
              <div className="grid grid-cols-6 gap-2">
                {/* Profile Picture Option */}
                {hasProfilePicture && (
                  <button
                    type="button"
                    onClick={() => handleAvatarSelect(PROFILE_AVATAR_ID)}
                    className={cn(
                      'relative aspect-square rounded-neo border-2 overflow-hidden',
                      'transition-all duration-150',
                      'min-h-[44px] min-w-[44px]',
                      isUsingProfilePicture
                        ? 'border-neo-cyan ring-2 ring-neo-cyan scale-105'
                        : 'border-neo-black/50 hover:border-neo-cyan/70 hover:scale-105'
                    )}
                  >
                    <Image
                      src={profilePictureUrl!}
                      alt="Your Profile"
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isUsingProfilePicture && (
                      <div className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center">
                        <div className="bg-neo-cyan text-neo-black border-2 border-neo-black rounded-full w-6 h-6 flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-neo-black/90 text-white text-[8px] font-bold text-center py-0.5">
                      {t('profile.you') || 'YOU'}
                    </div>
                  </button>
                )}

                {/* Avatar Options */}
                {AVATARS.map((avatar) => {
                  const isSelected = !isUsingProfilePicture && avatar.id === selectedAvatarId;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => handleAvatarSelect(avatar.id)}
                      className={cn(
                        'relative aspect-square rounded-neo border-2 overflow-hidden',
                        'transition-all duration-150',
                        'min-h-[44px] min-w-[44px]',
                        isSelected
                          ? 'border-neo-cyan ring-2 ring-neo-cyan scale-105'
                          : 'border-neo-black/50 hover:border-neo-cyan/70 hover:scale-105'
                      )}
                    >
                      <Image
                        src={getAvatarPath(avatar)}
                        alt={avatar.name}
                        fill
                        className="object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center">
                          <div className="bg-neo-cyan text-neo-black border-2 border-neo-black rounded-full w-6 h-6 flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
