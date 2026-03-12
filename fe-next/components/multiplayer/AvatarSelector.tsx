'use client';

import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { cn } from '@/lib/utils';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';

interface AvatarSelectorProps {
  selectedAvatar: CustomAvatarConfig | null;
  onAvatarChange: (config: CustomAvatarConfig) => void;
  className?: string;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onAvatarChange,
  className,
}) => {
  const { t } = useLanguage();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const currentConfig = selectedAvatar ?? getRandomAvatarConfig();

  const handleSave = (config: CustomAvatarConfig) => {
    onAvatarChange(config);
    setIsBuilderOpen(false);
  };

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
          'hover:translate-x-[-1px] hover:translate-y-[-1px]',
          'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full border-2 border-neo-cyan overflow-hidden flex-shrink-0 shadow-hard-sm">
            <AvatarRenderer config={currentConfig} size={56} />
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
        <div className="flex-shrink-0">
          <Pencil className="w-5 h-5 text-neo-cyan" />
        </div>
      </button>

      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleSave}
        initialConfig={currentConfig}
      />
    </div>
  );
};
