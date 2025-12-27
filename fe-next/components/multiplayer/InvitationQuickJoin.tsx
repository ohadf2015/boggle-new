'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaArrowLeft, FaSync } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import LandscapeIndicator from '@/components/LandscapeIndicator';

interface InvitationQuickJoinProps {
  gameCode: string;
  username: string;
  avatarId: string;
  isJoining: boolean;
  onJoin: () => void;
  onChangeProfile: () => void;
}

/**
 * InvitationQuickJoin - Quick confirmation screen for users arriving via invitation link
 * Shows when user has a saved profile and arrives via ?room= URL parameter
 * Aligned with the new ProfileSetup → JoinRoomForm flow design
 */
const InvitationQuickJoin: React.FC<InvitationQuickJoinProps> = ({
  gameCode,
  username,
  avatarId,
  isJoining,
  onJoin,
  onChangeProfile,
}) => {
  const { t, dir } = useLanguage();

  return (
    <>
      <LandscapeIndicator />

      <div dir={dir} className="min-h-screen h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 flex-shrink-0 px-4"
        >
          <button
            onClick={onChangeProfile}
            disabled={isJoining}
            className="absolute start-4 flex items-center gap-2 px-3 py-2 rounded-neo border-3 border-neo-black dark:border-slate-600 bg-neo-cream dark:bg-slate-700 shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold disabled:opacity-50"
          >
            <FaArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('joinView.inviteTitle') || "You're Invited!"}
            </h1>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-6 min-h-0">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border-3 border-neo-black dark:border-slate-600 shadow-hard">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Room Code Badge */}
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="flex justify-center"
                >
                  <div className="px-6 py-3 bg-neo-pink text-neo-white font-black text-2xl uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                    {t('joinView.room') || 'Room'} {gameCode}
                  </div>
                </motion.div>

                {/* Profile Display */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-bold uppercase text-center text-slate-600 dark:text-slate-400">
                    {t('joinView.joiningAs') || 'Joining as'}
                  </p>
                  <div className="flex items-center justify-center gap-4 p-4 rounded-neo bg-neo-cyan/10 dark:bg-neo-cyan/5 border-2 border-neo-cyan/30">
                    <Avatar
                      avatarImage={avatarId}
                      size="xl"
                      className="border-3 border-neo-black"
                    />
                    <span className="font-black text-2xl text-neo-black dark:text-neo-white">
                      {username}
                    </span>
                  </div>
                </motion.div>

                {/* Join Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={onJoin}
                    disabled={isJoining}
                    size="lg"
                    className="w-full h-16 text-xl font-black uppercase bg-neo-lime hover:bg-neo-lime/90 text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard transition-all"
                  >
                    {isJoining ? (
                      <>
                        <FaSync className="mr-3 w-6 h-6 animate-spin" />
                        {t('joinView.joining') || 'Joining...'}
                      </>
                    ) : (
                      <>
                        <FaGamepad className="mr-3 w-6 h-6" />
                        {t('joinView.joinGame') || 'Join Game'}
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Change Profile Link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center"
                >
                  <button
                    type="button"
                    onClick={onChangeProfile}
                    disabled={isJoining}
                    className="text-sm text-neo-cyan font-bold uppercase underline underline-offset-4 hover:text-neo-cyan/80 transition-colors disabled:opacity-50"
                  >
                    {t('joinView.changeProfile') || 'Change profile or join different room'}
                  </button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default InvitationQuickJoin;
