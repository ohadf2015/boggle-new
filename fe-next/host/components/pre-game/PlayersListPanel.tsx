'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Crown, Bot } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import Avatar from '../../../components/Avatar';
import SlotMachineText from '../../../components/SlotMachineText';
import PresenceIndicator from '../../../components/PresenceIndicator';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface PlayersListPanelProps {
  players: (string | PlayerData)[];
  playerWordCounts: Record<string, number>;
  currentUsername: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * PlayersListPanel - Shows list of players in the room with presence indicators
 */
export const PlayersListPanel = memo<PlayersListPanelProps>(({
  players,
  playerWordCounts,
  currentUsername,
  t,
}) => {
  return (
    <Card className="lg:w-[350px] h-auto p-3 sm:p-4 md:p-6 flex flex-col bg-slate-800/95 text-neo-white border-4 border-neo-black shadow-hard-lg">
      <h3 className="text-base font-bold uppercase text-neo-cream/80 mb-3 flex items-center gap-2 flex-shrink-0">
        <Users className="text-neo-pink/80" />
        {t('hostView.playersJoined')} ({players.length})
      </h3>
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        <AnimatePresence>
          {players.map((player, index) => {
            const playerUsername = typeof player === 'string' ? player : player.username;
            const avatar = typeof player === 'object' ? player.avatar : null;
            const isHostPlayer = typeof player === 'object' ? player.isHost : false;
            const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
            const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
            const isBot = typeof player === 'object' ? player.isBot : false;
            const isMe = playerUsername === currentUsername;

            return (
              <motion.div
                key={playerUsername}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 10, opacity: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                    "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      profilePictureUrl={avatar?.profilePictureUrl ?? undefined}
                      avatarEmoji={avatar?.emoji}
                      avatarImage={avatar?.avatarImage}
                      avatarColor={avatar?.color}
                      size="lg"
                    />
                    <span className="font-medium text-neo-cream/90">
                      <SlotMachineText text={playerUsername} />
                    </span>
                    {isHostPlayer && <Crown className="text-neo-yellow/80 text-sm" />}
                    {isBot && <Bot className="text-neo-cyan/70 text-sm" />}
                    {isMe && (
                      <span className="text-xs text-neo-cream/70 font-medium">
                        ({t('playerView.me')})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {playerWordCounts && playerWordCounts[playerUsername] !== undefined && (
                      <span className="text-neo-cream/70 text-sm font-medium">
                        {playerWordCounts[playerUsername] || 0}
                      </span>
                    )}
                    {!isMe && !isBot && (
                      <PresenceIndicator
                        status={presenceStatus}
                        isWindowFocused={isWindowFocused}
                        size="lg"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {players.length === 0 && (
        <p className="text-sm text-center text-neo-cream/75 font-medium mt-2">
          {t('hostView.waitingForPlayers')}
        </p>
      )}
    </Card>
  );
});

PlayersListPanel.displayName = 'PlayersListPanel';

export default PlayersListPanel;
