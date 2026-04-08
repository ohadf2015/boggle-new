'use client';

import React, { useState } from 'react';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });
import { type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { Pencil } from 'lucide-react';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';

export interface AvatarSelectorButtonProps {
  selectedAvatar?: CustomAvatarConfig | null;
  onAvatarSelect: (config: CustomAvatarConfig) => void;
  t: (key: string) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AvatarSelectorButton: React.FC<AvatarSelectorButtonProps> = ({
  selectedAvatar,
  onAvatarSelect,
  t,
  className = '',
  size = 'md'
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();

  const currentConfig = selectedAvatar ?? getOrCreateStoredCustomAvatar();

  const handleSave = (config: CustomAvatarConfig) => {
    onAvatarSelect(config);
    setStoredCustomAvatar(config);
    setIsBuilderOpen(false);
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
        onClick={() => setIsBuilderOpen(true)}
        aria-label={t('joinView.selectAvatar')}
        className={`
          relative group
          ${sizeClasses[size]}
          rounded-full
          border-3 border-neo-black
          shadow-hard-sm
          transition-all duration-100
          hover:-translate-x-px hover:-translate-y-px hover:shadow-hard
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2
          overflow-hidden
          ${className}
        `}
      >
        <Avatar
          customAvatar={currentConfig}
          size={size === 'lg' ? 'xl' : size === 'md' ? 'lg' : 'md'}
          className="w-full h-full"
        />

        {/* Hover/tap overlay */}
        <div className="absolute inset-0 rounded-full bg-neo-black/0 group-hover:bg-neo-black/40 group-focus-visible:bg-neo-black/40 transition-colors flex items-center justify-center">
          <Pencil className="w-4 h-4 text-neo-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity drop-shadow-md" />
        </div>

        {/* Edit badge */}
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

      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSave}
        initialConfig={currentConfig}
        premium={avatarPremium}
      />
    </>
  );
};

export default AvatarSelectorButton;
