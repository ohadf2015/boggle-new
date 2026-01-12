'use client';

import React, { useState } from 'react';
import Avatar from '@/components/Avatar';
import EmojiAvatarPicker from '@/components/EmojiAvatarPicker';
import { getAvatarById, type AvatarConfig } from '@/utils/avatarConfig';
import { Pencil } from 'lucide-react';

export interface AvatarSelectorButtonProps {
  selectedAvatarId?: string;
  onAvatarSelect: (avatarConfig: AvatarConfig) => void;
  t: (key: string) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Circular Avatar Selector Button
 * Displays current avatar with edit indicator overlay
 */
const AvatarSelectorButton: React.FC<AvatarSelectorButtonProps> = ({
  selectedAvatarId,
  onAvatarSelect,
  t,
  className = '',
  size = 'md'
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selectedAvatar = selectedAvatarId ? getAvatarById(selectedAvatarId) : undefined;

  const handleAvatarSave = ({ avatarImage }: { avatarImage: string; emoji?: string; color?: string }) => {
    const avatar = getAvatarById(avatarImage);
    if (avatar) {
      onAvatarSelect(avatar);
    }
    setIsPickerOpen(false);
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4 text-[8px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-6 h-6 text-xs'
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        aria-label={t('joinView.selectAvatar') || 'Select avatar'}
        className={`
          relative group
          ${sizeClasses[size]}
          rounded-full
          border-3 border-neo-black
          shadow-hard-sm
          transition-all duration-100
          hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2
          overflow-hidden
          ${className}
        `}
      >
        {selectedAvatar ? (
          <Avatar
            avatarImage={selectedAvatar.id}
            size={size === 'lg' ? 'xl' : size === 'md' ? 'lg' : 'md'}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
            <span className="text-xl">?</span>
          </div>
        )}

        {/* Edit indicator overlay */}
        <div className={`
          absolute bottom-0 right-0
          ${iconSizeClasses[size]}
          bg-neo-lime border-2 border-neo-black
          rounded-full
          flex items-center justify-center
          shadow-hard-sm
          group-hover:scale-110
          transition-transform
        `}>
          <Pencil className="w-2 h-2" />
        </div>
      </button>

      <EmojiAvatarPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSave={handleAvatarSave}
        currentAvatarImage={selectedAvatarId}
      />
    </>
  );
};

export default AvatarSelectorButton;
