'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface AutoJoiningStateProps {
  gameCode: string;
  username: string;
  error: string | null;
}

/**
 * Loading state shown when auto-joining a room with a saved username
 */
export const AutoJoiningState: React.FC<AutoJoiningStateProps> = ({
  gameCode,
  username,
  error,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex-1 bg-neo-black text-white pt-4 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
      <m.div
        initial={{ scale: 0, rotate: -3 }}
        animate={{ scale: 1, rotate: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="bg-neo-navy text-white border-4 border-neo-cream rounded-neo shadow-hard">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-neo-cyan text-neo-black rounded-neo border-3 border-neo-black shadow-hard-sm">
                <Gamepad2 size={48} className="text-neo-black" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black uppercase text-neo-white tracking-tight">
              {t('joinView.joiningRoom')}
            </CardTitle>
            <div className="flex justify-center">
              <div className="text-2xl px-8 py-4 bg-neo-pink text-neo-white font-black uppercase rounded-neo border-3 border-neo-black shadow-hard -rotate-1">
                {t('joinView.room')} {gameCode}
              </div>
            </div>
            <p className="text-neo-white font-bold uppercase text-sm">
              {t('joinView.welcomeBack')}, <span className="text-neo-cyan">{username}</span>!
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 bg-neo-pink/20 text-white border-3 border-neo-pink rounded-neo">
                  <p className="text-neo-pink font-bold uppercase text-sm">{error}</p>
                </div>
              </m.div>
            )}

            {/* Loading animation */}
            <div className="flex justify-center py-4">
              <div className="flex space-x-3">
                {[0, 1, 2].map((i) => (
                  <m.div
                    key={`dot-${i}`}
                    className="w-4 h-4 bg-neo-cyan border-2 border-neo-black rounded-neo"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="text-center text-neo-white text-sm font-bold uppercase">
              {t('joinView.connectingToRoom')}
            </p>
          </CardContent>
        </Card>
      </m.div>
    </div>
  );
};

export default AutoJoiningState;
