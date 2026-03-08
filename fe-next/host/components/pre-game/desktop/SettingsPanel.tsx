'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Monitor, Zap, PartyPopper, Trophy } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { GAME_PRESETS, type PresetKey } from '../PresetSelector';

// ==================== Types ====================

export interface SettingsPanelProps {
  /** Currently selected preset */
  selectedPreset: PresetKey;
  /** Callback when a preset is clicked */
  onPresetClick: (key: PresetKey) => void;
  /** Whether TV mode (host not playing) is enabled */
  tvMode: boolean;
  /** Callback when TV mode is toggled */
  onTvModeToggle: () => void;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
}

// ==================== Constants ====================

// Responsive icon component for preset buttons
function PresetIcon({ icon: Icon, className }: { icon: typeof Zap; className?: string }) {
  return <Icon className={cn('w-5 h-5 xl:w-6 xl:h-6', className)} />;
}

const PRESET_ICONS: Record<PresetKey, React.ReactNode> = {
  fast: <PresetIcon icon={Zap} />,
  party: <PresetIcon icon={PartyPopper} />,
  challenge: <PresetIcon icon={Trophy} />,
};

const PRESET_COLORS: Record<PresetKey, { bg: string; border: string; text: string }> = {
  fast: { bg: 'bg-neo-cyan/20', border: 'border-neo-cyan', text: 'text-neo-cyan' },
  party: { bg: 'bg-neo-yellow/20', border: 'border-neo-yellow', text: 'text-neo-yellow' },
  challenge: { bg: 'bg-neo-pink/20', border: 'border-neo-pink', text: 'text-neo-pink' },
};

// ==================== Component ====================

/**
 * Settings panel for the left column of desktop lobby
 *
 * Features:
 * - Large preset cards with icons and descriptions
 * - TV mode toggle
 *
 * Note: Room code and timer are displayed elsewhere (InviteCard and header)
 */
export function SettingsPanel({
  selectedPreset,
  onPresetClick,
  tvMode,
  onTvModeToggle,
  t,
}: SettingsPanelProps): React.ReactElement {
  const presetKeys = Object.keys(GAME_PRESETS) as PresetKey[];

  return (
    <div
      data-testid="settings-panel"
      className="flex flex-col gap-4 xl:gap-5"
    >
      {/* Presets Section */}
      <div className="relative rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 xl:h-2 bg-gradient-to-r from-neo-pink via-neo-yellow to-neo-cyan" />

        {/* Responsive padding */}
        <div className="p-4 pt-5 xl:p-5 xl:pt-6">
          <p className="text-xs xl:text-sm font-bold uppercase text-neo-cream/60 mb-3 xl:mb-4">
            {t('hostView.selectPreset')}
          </p>

          <div className="flex flex-col gap-2 xl:gap-3">
            {presetKeys.map((key) => {
              const preset = GAME_PRESETS[key];
              const isSelected = selectedPreset === key;
              const colors = PRESET_COLORS[key];

              return (
                <motion.button
                  key={key}
                  data-testid={`preset-${key}`}
                  data-selected={isSelected}
                  onClick={() => onPresetClick(key)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    // Responsive padding and gap
                    'flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-neo border-2 xl:border-3 transition-all text-left',
                    isSelected
                      ? `${colors.bg} ${colors.border} shadow-none`
                      : 'bg-neo-navy/40 border-neo-black/50 hover:border-neo-black shadow-hard-sm'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 xl:p-2.5 rounded-neo',
                      isSelected ? colors.text : 'text-neo-cream/70'
                    )}
                  >
                    {PRESET_ICONS[key]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-bold text-sm xl:text-base',
                      isSelected ? colors.text : 'text-neo-cream'
                    )}>
                      {t(preset.nameKey)}
                    </p>
                    <p className="text-xs xl:text-sm text-neo-cream/50 truncate">
                      {preset.timer}min &bull; {preset.difficulty}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className={cn('w-5 h-5 xl:w-6 xl:h-6', colors.text)} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TV Mode Toggle - responsive sizing */}
      <button
        data-testid="tv-mode-toggle"
        data-checked={tvMode}
        onClick={onTvModeToggle}
        className={cn(
          'flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-neo border-2 xl:border-3 transition-all',
          tvMode
            ? 'bg-neo-purple/20 border-neo-purple'
            : 'bg-neo-navy/40 border-neo-black/50 hover:border-neo-black'
        )}
      >
        <Monitor className={cn('w-5 h-5 xl:w-6 xl:h-6', tvMode ? 'text-neo-purple' : 'text-neo-cream/70')} />
        <div className="flex-1 text-left">
          <p className={cn('font-bold text-sm xl:text-base', tvMode ? 'text-neo-purple' : 'text-neo-cream')}>
            {t('hostView.broadcastModeTitle')}
          </p>
          <p className="text-xs xl:text-sm text-neo-cream/50">
            {t('hostView.broadcastModeDesc')}
          </p>
        </div>
        {/* Larger toggle switch on desktop */}
        <div
          className={cn(
            'w-10 h-6 xl:w-12 xl:h-7 rounded-full border-2 transition-all relative',
            tvMode
              ? 'bg-neo-purple border-neo-purple'
              : 'bg-neo-navy border-neo-black/50'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 xl:w-5 xl:h-5 rounded-full bg-neo-white absolute top-0.5 xl:top-0.5 transition-all',
              tvMode ? 'left-4 xl:left-5' : 'left-0.5'
            )}
          />
        </div>
      </button>
    </div>
  );
}

export default SettingsPanel;
