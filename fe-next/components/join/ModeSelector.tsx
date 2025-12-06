'use client';

import React from 'react';
import { FaUser, FaCrown } from 'react-icons/fa';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JoinMode } from '@/types/components';

interface ModeSelectorProps {
  mode: JoinMode;
  onModeChange: (mode: string) => void;
}

/**
 * Toggle between Join and Host modes
 */
export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={onModeChange}
        className="w-full"
        variant="outline"
      >
        <ToggleGroupItem
          value="join"
          className="flex-1 data-[state=on]:bg-neo-cyan data-[state=on]:text-neo-black"
        >
          <span className="mr-2"><FaUser /></span>
          {t('joinView.joinRoom')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="host"
          className="flex-1 data-[state=on]:bg-neo-pink data-[state=on]:text-neo-white"
        >
          <span className="mr-2"><FaCrown /></span>
          {t('joinView.createRoom')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ModeSelector;
