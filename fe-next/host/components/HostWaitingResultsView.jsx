import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy } from 'react-icons/fa';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import RoomChat from '../../components/RoomChat';
import Avatar from '../../components/Avatar';
import SlotMachineText from '../../components/SlotMachineText';
import ExitRoomButton from '../../components/ExitRoomButton';

const HostWaitingResultsView = ({
  username,
  gameCode,
  t,
  playersReady,
  playerScores,
  showExitConfirm,
  setShowExitConfirm,
  onExitRoom,
  onConfirmExit,
}) => {
  // Track which players have already been animated
  const animatedPlayersRef = useRef(new Set());

  // Memoize leaderboard calculation to prevent re-renders when data hasn't changed
  const leaderboard = useMemo(() => {
    return playersReady
      .map(player => {
        const name = typeof player === 'string' ? player : player.username;
        return {
          username: name,
          score: playerScores[name] || 0,
          avatar: typeof player === 'object' ? player.avatar : null,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [playersReady, playerScores]);

  return (
    <div className="min-h-screen bg-neo-cream dark:bg-slate-900 p-3 sm:p-4 md:p-8 flex flex-col transition-colors duration-300">

      {/* Exit Button */}
      <div className="w-full max-w-md mx-auto flex justify-end mb-4 relative z-50">
        <ExitRoomButton onClick={onExitRoom} label={t('hostView.exitRoom')} />
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-4 sm:space-y-6 md:space-y-8">
          {/* Waiting for Results Message */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="text-center"
          >
            <div className="bg-neo-yellow border-4 border-neo-black shadow-hard-lg p-6 sm:p-8 md:p-10 rotate-[1deg]">
              {/* Hourglass Animation */}
              <div className="mb-6">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block bg-neo-pink border-4 border-neo-black shadow-hard p-3"
                >
                  <div className="relative w-12 h-16 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[24px] border-l-transparent border-r-transparent border-t-neo-black" />
                    <div className="w-2 h-1 bg-neo-black -my-[2px] z-10" />
                    <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[24px] border-l-transparent border-r-transparent border-b-neo-black" />
                    <motion.div
                      animate={{ y: [0, 20, 0], opacity: [1, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-[24px] w-1 h-2 bg-neo-cyan"
                    />
                  </div>
                </motion.div>
              </div>

              <div className="bg-neo-black text-neo-white px-6 py-4 font-black uppercase text-2xl md:text-3xl tracking-wider shadow-hard border-4 border-neo-black mb-4">
                {t('playerView.calculatingScores') || t('playerView.waitingForResults') || 'Calculating scores...'}
              </div>

              <p className="text-neo-black font-bold text-base uppercase tracking-wide">
                {t('playerView.aiValidating') || 'AI is checking the words...'}
              </p>

              <div className="flex gap-3 mt-6 justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], y: [0, -8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-4 h-4 bg-neo-black border-2 border-neo-black"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0, rotate: 1 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2 }}
              className="rotate-[-0.5deg]"
            >
              <div className="bg-neo-cream border-4 border-neo-black shadow-hard-lg overflow-hidden">
                <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
                  <h3 className="flex items-center gap-2 text-neo-white text-xl uppercase tracking-wider font-black">
                    <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-black))' }} />
                    {t('playerView.leaderboard') || 'Leaderboard'}
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                  {leaderboard.map((player, index) => {
                    const isMe = player.username === username;
                    // Track if this player has already been animated
                    const isNewPlayer = !animatedPlayersRef.current.has(player.username);
                    if (isNewPlayer) {
                      animatedPlayersRef.current.add(player.username);
                    }
                    const getRankStyle = () => {
                      if (index === 0) return 'bg-neo-yellow text-neo-black';
                      if (index === 1) return 'bg-slate-300 text-neo-black';
                      if (index === 2) return 'bg-neo-orange text-neo-black';
                      return 'bg-neo-cream text-neo-black border-neo-black border-3';
                    };
                    return (
                      <motion.div
                        key={player.username}
                        layout
                        initial={isNewPlayer ? { x: 50, opacity: 0 } : false}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 },
                          x: isNewPlayer ? { duration: 0.3, delay: index * 0.05 } : { duration: 0 }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black shadow-hard-sm transition-colors
                          hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                          ${getRankStyle()}`}
                      >
                        <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-white border-2 border-neo-black">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <Avatar
                          profilePictureUrl={player.avatar?.profilePictureUrl}
                          avatarEmoji={player.avatar?.emoji}
                          avatarColor={player.avatar?.color}
                          size="md"
                        />
                        <div className="flex-1">
                          <div className="font-black flex items-center gap-2">
                            <SlotMachineText text={player.username} />
                            {isMe && (
                              <span className="text-xs bg-neo-black text-neo-white px-2 py-0.5 rounded-neo font-bold border-2 border-neo-black">
                                ({t('playerView.me') || 'You'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-2xl font-black">
                          {player.score}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat Section */}
          <motion.div
            initial={{ y: 20, opacity: 0, rotate: -1 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3 }}
            className="rotate-[0.5deg]"
          >
            <RoomChat
              username={username}
              isHost={true}
              gameCode={gameCode}
              className="min-h-[300px]"
            />
          </motion.div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('playerView.exitConfirmation') || 'Exit Room?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">
              {t('hostView.exitWarning') || 'Are you sure you want to exit? This will close the room for all players.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
              {t('common.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {t('common.confirm') || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostWaitingResultsView;
