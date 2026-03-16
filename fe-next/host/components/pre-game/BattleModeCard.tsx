'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Shuffle, FileText, Bomb, Target, Check } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import BotControls from '../../../components/BotControls';
import { cn } from '../../../lib/utils';
import { useSocket } from '../../../utils/SocketContext';
import type { GameModeOption } from '@/components/GameModeSelector';

interface PlayerData {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
}

interface BattleModeCardProps {
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGameMode: GameModeOption;
  setSelectedGameMode: (mode: GameModeOption) => void;
  gameCode: string;
  playersReady: (string | PlayerData)[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

const GAME_MODE_CARDS: {
  mode: GameModeOption;
  icon: React.ReactNode;
  nameKey: string;
  descKey: string;
  color: { bg: string; border: string; text: string; activeBg: string };
}[] = [
  {
    mode: 'random',
    icon: <Shuffle className="w-5 h-5" />,
    nameKey: 'gameModes.random',
    descKey: 'gameModes.randomizing',
    color: { bg: 'bg-neo-purple/20', border: 'border-neo-purple', text: 'text-neo-purple', activeBg: 'bg-neo-purple/30' },
  },
  {
    mode: 'classic',
    icon: <FileText className="w-5 h-5" />,
    nameKey: 'gameModes.classic.name',
    descKey: 'gameModes.classic.description',
    color: { bg: 'bg-neo-cyan/20', border: 'border-neo-cyan', text: 'text-neo-cyan', activeBg: 'bg-neo-cyan/30' },
  },
  {
    mode: 'blast',
    icon: <Bomb className="w-5 h-5" />,
    nameKey: 'gameModes.blast.name',
    descKey: 'gameModes.blast.description',
    color: { bg: 'bg-neo-orange/20', border: 'border-neo-orange', text: 'text-neo-orange', activeBg: 'bg-neo-orange/30' },
  },
  {
    mode: 'word-hunt',
    icon: <Target className="w-5 h-5" />,
    nameKey: 'gameModes.wordHunt.name',
    descKey: 'gameModes.wordHunt.description',
    color: { bg: 'bg-neo-pink/20', border: 'border-neo-pink', text: 'text-neo-pink', activeBg: 'bg-neo-pink/30' },
  },
];

export function BattleModeCard({
  hostPlaying,
  setHostPlaying,
  selectedGameMode,
  setSelectedGameMode,
  gameCode,
  playersReady,
  t,
}: BattleModeCardProps): React.ReactElement {
  const { socket } = useSocket();

  return (
    <section className="space-y-3">
      {/* Game Mode Cards */}
      <div className="bg-neo-navy-light text-neo-cream p-4 rounded-xl border-3 border-neo-black shadow-hard relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neo-purple/10 via-transparent to-neo-cyan/5 pointer-events-none" />

        <p className="relative text-xs font-black uppercase text-neo-cream/50 tracking-widest mb-3">
          {t('gameModes.nextMode')}
        </p>

        <div className="relative grid grid-cols-2 gap-2">
          {GAME_MODE_CARDS.map(({ mode, icon, nameKey, descKey, color }) => {
            const isActive = selectedGameMode === mode;
            return (
              <motion.button
                key={mode}
                onClick={() => setSelectedGameMode(mode)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                data-testid={`game-mode-${mode}`}
                className={cn(
                  'relative flex items-center gap-3 p-3 rounded-neo border-2 transition-all text-start',
                  isActive
                    ? `${color.activeBg} ${color.border} shadow-hard-sm`
                    : 'bg-neo-navy/60 border-neo-white/20 hover:border-neo-white/40 shadow-hard-sm hover:shadow-hard'
                )}
              >
                <div className={cn(
                  'p-2 rounded-neo shrink-0',
                  isActive ? color.text : 'text-neo-cream/70'
                )}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-bold text-sm leading-tight',
                    isActive ? color.text : 'text-neo-cream'
                  )}>
                    {t(nameKey)}
                  </p>
                  <p className="text-[10px] text-neo-cream/50 leading-tight mt-0.5 line-clamp-2">
                    {t(descKey)}
                  </p>
                </div>
                {isActive && (
                  <Check className={cn('w-4 h-4 shrink-0', color.text)} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Broadcast Mode - desktop only */}
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
      </div>

      {/* Bot Controls - always visible, no extra collapse */}
      <BotControls
        socket={socket}
        gameCode={gameCode}
        players={playersReady.filter((p): p is PlayerData => typeof p !== 'string')}
        disabled={false}
        defaultCollapsed={false}
      />
    </section>
  );
}
