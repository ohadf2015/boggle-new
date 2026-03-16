'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ChevronDown, Zap, PartyPopper, Trophy } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import BotControls from '../../../components/BotControls';
import { cn } from '../../../lib/utils';
import { useSocket } from '../../../utils/SocketContext';
import { GAME_PRESETS, type PresetKey } from './PresetSelector';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';

interface PlayerData {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
}

interface BattleModeCardProps {
  selectedPreset: PresetKey;
  timerValue: number;
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  onApplyPreset: (key: PresetKey) => void;
  gameCode: string;
  playersReady: (string | PlayerData)[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

const PRESET_ACTIVE_COLORS: Record<string, string> = {
  fast: 'bg-neo-cyan text-neo-black',
  party: 'bg-neo-pink text-white',
  challenge: 'bg-neo-orange text-neo-black',
};

const PRESET_ICONS: Record<PresetKey, React.ReactNode> = {
  fast: <Zap className="w-5 h-5" />,
  party: <PartyPopper className="w-5 h-5" />,
  challenge: <Trophy className="w-5 h-5" />,
};

export function BattleModeCard({
  selectedPreset,
  timerValue,
  hostPlaying,
  setHostPlaying,
  selectedGameMode,
  setSelectedGameMode,
  onApplyPreset,
  gameCode,
  playersReady,
  t,
}: BattleModeCardProps): React.ReactElement {
  const { socket } = useSocket();
  const [showBattleSettings, setShowBattleSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section>
      <div className="bg-neo-navy-light text-neo-cream p-4 rounded-xl border-3 border-neo-black shadow-hard relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neo-purple/10 via-transparent to-neo-cyan/5 pointer-events-none" />

        <button
          onClick={() => setShowBattleSettings(!showBattleSettings)}
          className="relative w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neo-pink/20 border-2 border-neo-pink/40 flex items-center justify-center text-neo-pink">
              {PRESET_ICONS[selectedPreset]}
            </div>
            <div className="text-start">
              <h2 className="font-neo-display font-bold text-xl leading-none uppercase text-neo-white">
                {t('hostView.battleMode')}
              </h2>
              <p className="text-xs font-bold uppercase text-neo-cream/50 tracking-widest mt-1">
                {t('hostView.preset')}: {t(GAME_PRESETS[selectedPreset].nameKey)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <span className="bg-neo-cyan/20 text-neo-cyan px-2 py-0.5 border-2 border-neo-cyan/40 rounded text-xs font-black">
                {timerValue}:00 {t('common.minutes')}
              </span>
              <span className="bg-neo-pink/20 text-neo-pink px-2 py-0.5 border-2 border-neo-pink/40 rounded text-xs font-black">
                {GAME_PRESETS[selectedPreset].difficulty}
              </span>
            </div>
            <ChevronDown className={cn('w-5 h-5 text-neo-cream/50 transition-transform', showBattleSettings && 'rotate-180')} />
          </div>
        </button>

        <AnimatePresence>
        {showBattleSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
        <div className="mt-4">
          <div className="relative grid grid-cols-3 gap-2">
            {(Object.keys(GAME_PRESETS) as Array<keyof typeof GAME_PRESETS>).map((key) => {
              const preset = GAME_PRESETS[key];
              const isActive = selectedPreset === key;
              return (
                <motion.button
                  key={key}
                  onClick={() => onApplyPreset(key)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={cn(
                    'py-2.5 rounded-lg font-bold text-xs uppercase border-2 border-neo-black transition-colors flex flex-col items-center gap-1',
                    isActive
                      ? `${PRESET_ACTIVE_COLORS[key]} shadow-hard-sm`
                      : 'bg-neo-navy/60 text-neo-cream/70 border-neo-white/20 hover:bg-neo-navy hover:text-neo-cream hover:border-neo-white/40'
                  )}
                >
                  {PRESET_ICONS[key]}
                  <span>{t(preset.nameKey)}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="relative mt-3 pt-3 border-t border-neo-white/10">
            <p className="text-xs font-black uppercase text-neo-cream/50 tracking-widest mb-2">
              {t('gameModes.nextMode')}
            </p>
            <GameModeSelector
              selectedMode={selectedGameMode}
              onSelectMode={(mode) => setSelectedGameMode(mode)}
              t={t}
              showRandom
            />
          </div>

          <div className="relative mt-3 pt-3 border-t border-neo-white/10 hidden lg:flex items-center gap-2">
            <Monitor className="w-4 h-4 text-neo-cream/50 flex-shrink-0" />
            <Checkbox
              id="broadcastMode"
              checked={!hostPlaying}
              onCheckedChange={(checked) => setHostPlaying(checked !== true)}
            />
            <label
              htmlFor="broadcastMode"
              className="text-xs font-bold uppercase text-neo-cream/80 cursor-pointer flex-1"
            >
              {t('hostView.broadcastModeTitle')}
            </label>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative w-full mt-3 py-1 flex items-center justify-center gap-1 text-xs font-black uppercase border-t border-neo-white/10 pt-3 text-neo-cream/70 hover:text-neo-cream transition-colors"
            aria-expanded={showAdvanced}
            aria-controls="advanced-settings-panel"
          >
            {t('common.advancedSettings')}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
        </motion.div>
        )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            id="advanced-settings-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2"
          >
            <BotControls
              socket={socket}
              gameCode={gameCode}
              players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
              disabled={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
