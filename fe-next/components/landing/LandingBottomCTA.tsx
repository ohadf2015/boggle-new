'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LandingBottomCTAProps {
  onPlayClick: () => void;
}

export function LandingBottomCTA({ onPlayClick }: LandingBottomCTAProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      className={cn(
        'w-full max-w-4xl mx-auto',
        'bg-gradient-to-r from-neo-pink to-neo-purple',
        'border-3 border-neo-black shadow-hard-lg rounded-neo-lg',
        'p-6 sm:p-8 text-center'
      )}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="font-black text-neo-white uppercase text-xl sm:text-2xl lg:text-3xl mb-2">
        {t('landing.readyToCompete')}
      </h2>
      <p className="text-neo-white/80 font-medium text-sm sm:text-base mb-5">
        {t('landing.welcomeSubtitle')}
      </p>
      <motion.button
        onClick={onPlayClick}
        className={cn(
          'relative px-8 py-3 sm:px-10 sm:py-4',
          'bg-neo-lime text-neo-black font-black uppercase text-lg sm:text-xl',
          'border-3 border-neo-black rounded-neo shadow-hard-lg',
          'hover:shadow-hard-xl active:shadow-hard-pressed active:translate-y-[2px]',
          'transition-all duration-150'
        )}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={{
          boxShadow: [
            '4px 4px 0px black',
            '4px 4px 20px rgba(191,255,0,0.5)',
            '4px 4px 0px black',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {t('landing.startPlaying')}
      </motion.button>
    </motion.div>
  );
}
