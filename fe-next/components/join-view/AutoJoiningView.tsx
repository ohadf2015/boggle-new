'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../contexts/LanguageContext';

const MenuAnimation = dynamic(() => import('../MenuAnimation'), { ssr: false });

interface AutoJoiningViewProps {
  gameCode: string;
  username: string;
  error: string | null;
}

/**
 * AutoJoiningView - Displayed when a user with a saved username is auto-joining via invitation link
 */
const AutoJoiningView: React.FC<AutoJoiningViewProps> = React.memo(({
  gameCode,
  username,
  error
}) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-neo-black pt-4 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
      <motion.div
        initial={{ scale: 0, rotate: -3 }}
        animate={{ scale: 1, rotate: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="bg-neo-navy border-4 border-neo-cream rounded-neo shadow-hard">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-4 bg-neo-cyan rounded-neo border-3 border-neo-black shadow-hard-sm"
              >
                <FaGamepad size={48} className="text-neo-black" />
              </motion.div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black uppercase text-neo-cream tracking-tight">
              {t('joinView.joiningRoom')}
            </CardTitle>
            <div className="flex justify-center">
              <div className="text-2xl px-8 py-4 bg-neo-pink text-neo-white font-black uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                {t('joinView.room')} {gameCode}
              </div>
            </div>
            <p className="text-neo-cream/70 font-bold uppercase text-sm">
              {t('joinView.welcomeBack')}, <span className="text-neo-cyan">{username}</span>!
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 bg-neo-pink/20 border-3 border-neo-pink rounded-neo">
                  <p className="text-neo-pink font-bold uppercase text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Loading animation */}
            <div className="flex justify-center py-4">
              <motion.div
                className="flex space-x-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-4 h-4 bg-neo-cyan border-2 border-neo-black rounded-neo"
                    animate={{
                      y: [-8, 8, -8],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </div>

            <p className="text-center text-neo-cream/60 text-sm font-bold uppercase">
              {t('joinView.connectingToRoom')}
            </p>
          </CardContent>
        </Card>
      </motion.div>
      <MenuAnimation />
    </div>
  );
});

AutoJoiningView.displayName = 'AutoJoiningView';

export default AutoJoiningView;
