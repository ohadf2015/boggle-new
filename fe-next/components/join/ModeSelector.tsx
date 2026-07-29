'use client';

import React from 'react';
import { Crown, DoorOpen } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JoinMode } from '@/types/components';

interface ModeSelectorProps {
  mode: JoinMode;
  onModeChange: (mode: string) => void;
}

/**
 * Toggle between Join and Host modes with clear visual indicators
 * Improved UX: Each mode shows icon + label + description for clarity
 */
export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={onModeChange}
        className="w-full grid grid-cols-2 gap-2"
        variant="outline"
      >
        <ToggleGroupItem
          value="join"
          className="flex-1 py-2 h-auto data-[state=on]:bg-neo-cyan data-[state=on]:text-neo-black data-[state=on]:border-neo-black data-[state=on]:shadow-hard"
        >
          <div className="flex items-center gap-1.5">
            <DoorOpen className="text-base" />
            <span className="font-bold text-sm">{t('joinView.joinRoom')}</span>
          </div>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="host"
          className="flex-1 py-2 h-auto data-[state=on]:bg-neo-pink data-[state=on]:text-neo-white data-[state=on]:border-neo-black data-[state=on]:shadow-hard"
        >
          <div className="flex items-center gap-1.5">
            <Crown className="text-base" />
            <span className="font-bold text-sm">{t('joinView.createRoom')}</span>
          </div>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ModeSelector;
