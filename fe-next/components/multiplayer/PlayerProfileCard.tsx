'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateUsername } from '@/utils/validation';
import { cn } from '@/lib/utils';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';

interface PlayerProfileCardProps {
  username: string;
  onUsernameChange: (name: string) => void;
  customAvatar: CustomAvatarConfig | null;
  onAvatarChange: (config: CustomAvatarConfig) => void;
  isAuthenticated: boolean;
  /** Force name input open (e.g., first-time user with no stored name) */
  forceNameEdit?: boolean;
}

/**
 * Unified profile card showing avatar + name side-by-side.
 * Tap avatar to open builder, tap name to edit inline.
 * Compact when user already has a profile — no unnecessary form fields.
 */
export const PlayerProfileCard: React.FC<PlayerProfileCardProps> = ({
  username,
  onUsernameChange,
  customAvatar,
  onAvatarChange,
  isAuthenticated,
  forceNameEdit = false,
}) => {
  const { t } = useLanguage();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const [isEditingName, setIsEditingName] = useState(forceNameEdit);
  const [showNameError, setShowNameError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentConfig = customAvatar ?? getRandomAvatarConfig();
  const usernameValidation = validateUsername(username);
  const nameError = showNameError && !usernameValidation.isValid
    ? usernameValidation.error
    : null;

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    setShowNameError(true);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
      setShowNameError(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-4 p-4',
          'rounded-neo border-3 border-neo-black',
          'bg-neo-navy/50 shadow-hard-sm'
        )}
      >
        {/* Avatar — tap to customize */}
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className={cn(
            'relative shrink-0 group',
            'w-16 h-16 rounded-full',
            'border-3 border-neo-cyan overflow-hidden',
            'shadow-hard-sm hover:shadow-hard',
            'hover:-translate-x-px hover:-translate-y-px',
            'active:translate-x-px active:translate-y-px active:shadow-none',
            'transition-all duration-200'
          )}
          aria-label={t('profile.chooseAvatar')}
        >
          <AvatarRenderer config={currentConfig} size={64} mode="multiplayer" />
          <div className="absolute inset-0 bg-neo-black/0 group-hover:bg-neo-black/30 transition-colors flex items-center justify-center">
            <Pencil className="w-5 h-5 text-neo-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-[1px_1px_0px_black]" />
          </div>
        </button>

        {/* Name — inline display or edit */}
        <div className="flex-1 min-w-0">
          {isAuthenticated ? (
            <p className="font-black text-lg text-neo-white truncate">
              {username}
            </p>
          ) : isEditingName ? (
            <Input
              ref={inputRef}
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              maxLength={20}
              autoFocus
              className={cn(
                'font-bold text-lg bg-neo-navy/60 border-neo-black text-neo-white',
                'placeholder:text-neo-white',
                nameError && 'border-red-500'
              )}
              placeholder={t('multiplayerFlow.createModal.namePlaceholder')}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="w-full text-start group/name flex items-center gap-2"
            >
              <span className="font-black text-lg text-neo-white truncate group-hover/name:text-neo-cyan transition-colors">
                {username || t('multiplayerFlow.createModal.namePlaceholder')}
              </span>
              <Pencil className="w-4 h-4 text-neo-cyan/60 group-hover/name:text-neo-cyan shrink-0 transition-colors" />
            </button>
          )}
          {nameError && (
            <p className="text-xs font-bold text-neo-red mt-1" role="alert">
              {t(nameError)}
            </p>
          )}
          {!isEditingName && !isAuthenticated && username && (
            <p className="text-xs text-neo-white font-medium mt-0.5">
              {t('multiplayerFlow.profileSetup.tapToChange')}
            </p>
          )}
        </div>
      </div>

      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={(config) => { onAvatarChange(config); setIsBuilderOpen(false); }}
        initialConfig={currentConfig}
        premium={avatarPremium}
      />
    </>
  );
};
