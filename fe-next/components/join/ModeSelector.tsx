'use client';

import React from 'react';
import { FaUser, FaCrown, FaDoorOpen, FaPlus } from 'react-icons/fa';
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
          className="flex-1 flex-col py-3 h-auto gap-1 data-[state=on]:bg-neo-cyan data-[state=on]:text-neo-black data-[state=on]:border-neo-black data-[state=on]:shadow-hard"
          aria-describedby="join-mode-desc"
        >
          <div className="flex items-center gap-2">
            <FaDoorOpen className="text-lg" />
            <span className="font-bold">{t('joinView.joinRoom') || 'Join Room'}</span>
          </div>
          <span id="join-mode-desc" className="text-xs font-normal opacity-80">
            {t('joinView.joinDesc') || 'Enter code to join existing game'}
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="host"
          className="flex-1 flex-col py-3 h-auto gap-1 data-[state=on]:bg-neo-pink data-[state=on]:text-neo-white data-[state=on]:border-neo-black data-[state=on]:shadow-hard"
          aria-describedby="host-mode-desc"
        >
          <div className="flex items-center gap-2">
            <FaCrown className="text-lg" />
            <span className="font-bold">{t('joinView.createRoom') || 'Create Room'}</span>
          </div>
          <span id="host-mode-desc" className="text-xs font-normal opacity-80">
            {t('joinView.hostDesc') || 'Start a new game as host'}
          </span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ModeSelector;
