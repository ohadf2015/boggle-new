'use client';

import React, { useState } from 'react';
import Avatar from '@/components/Avatar';
import EmojiAvatarPicker from '@/components/EmojiAvatarPicker';
import { getAvatarById, type AvatarConfig } from '@/utils/avatarConfig';
import { Button } from '@/components/ui/button';

export interface AvatarSelectorButtonProps {
  selectedAvatarId?: string;
  onAvatarSelect: (avatarConfig: AvatarConfig) => void;
  t: (key: string) => string;
  className?: string;
}

/**
 * Compact Avatar Selector Button - Shows current avatar inline
 * Used in both Join and Host mode fields
 */
const AvatarSelectorButton: React.FC<AvatarSelectorButtonProps> = ({
  selectedAvatarId,
  onAvatarSelect,
  t,
  className = ''
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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsPickerOpen(true)}
        className={`h-10 px-3 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 ${className}`}
      >
        {selectedAvatar ? (
          <>
            <Avatar
              avatarImage={selectedAvatar.id}
              size="sm"
              className="flex-shrink-0"
            />
            <span className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[80px]">
              {selectedAvatar.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs">?</span>
            </div>
            <span className="font-medium text-sm text-slate-600 dark:text-slate-400">
              {t('joinView.selectAvatar') || 'Avatar'}
            </span>
          </>
        )}
      </Button>

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
