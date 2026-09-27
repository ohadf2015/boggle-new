'use client';

import React, { useState, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { cn } from '@/lib/utils';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';

interface AvatarSelectorProps {
  selectedAvatar: CustomAvatarConfig | null;
  onAvatarChange: (config: CustomAvatarConfig) => void;
  className?: string;
  /** Compact mode: circular avatar only, no wide button. Used inline with name input. */
  compact?: boolean;
  /** Notify parent when the avatar builder modal opens/closes (useful for nested modal scenarios). */
  onBuilderOpenChange?: (isOpen: boolean) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onAvatarChange,
  className,
  compact,
  onBuilderOpenChange,
}) => {
  const { t } = useLanguage();
  const [isBuilderOpen, _setIsBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();

  const setIsBuilderOpen = useCallback((open: boolean) => {
    _setIsBuilderOpen(open);
    onBuilderOpenChange?.(open);
  }, [onBuilderOpenChange]);

  const currentConfig = selectedAvatar ?? getRandomAvatarConfig();

  const handleSave = useCallback((config: CustomAvatarConfig) => {
    onAvatarChange(config);
    setIsBuilderOpen(false);
  }, [onAvatarChange, setIsBuilderOpen]);

  if (compact) {
    return (
      <div className={cn('shrink-0', className)}>
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="group relative"
          aria-label={t('profile.chooseAvatar')}
        >
          <div className="w-16 h-16 rounded-full border-3 border-neo-black shadow-hard-sm overflow-hidden group-hover:border-neo-cyan transition-colors">
            <AvatarRenderer config={currentConfig} size={64} mode="multiplayer" />
          </div>
          <div className="absolute -bottom-0.5 -inset-e-0.5 w-6 h-6 bg-neo-cyan rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
            <Pencil className="w-3 h-3 text-neo-black" />
          </div>
        </button>

        <AvatarBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleSave}
          initialConfig={currentConfig}
          premium={avatarPremium}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setIsBuilderOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-4',
          'p-4 rounded-neo border-2 border-neo-black',
          'bg-neo-navy/40 hover:bg-neo-navy/60',
          'transition-all duration-200',
          'shadow-hard-sm hover:shadow-hard',
          'hover:-translate-x-px hover:-translate-y-px',
          'active:translate-x-px active:translate-y-px active:shadow-none'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full border-2 border-neo-cyan overflow-hidden shrink-0 shadow-hard-sm">
            <AvatarRenderer config={currentConfig} size={56} mode="multiplayer" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase text-neo-cyan">
              {t('profile.chooseAvatar')}
            </p>
            <p className="text-sm font-bold text-neo-white">
              {t('joinView.selectAvatar')}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Pencil className="w-5 h-5 text-neo-cyan" />
        </div>
      </button>

      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSave}
        initialConfig={currentConfig}
        premium={avatarPremium}
      />
    </div>
  );
};
