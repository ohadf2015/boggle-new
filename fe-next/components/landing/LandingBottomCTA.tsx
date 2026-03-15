'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LandingBottomCTAProps {
  onPlayClick: () => void;
}

const FLOATING_TILES = [
  { letter: 'L', x: '8%', y: '15%', rotate: -12, delay: 0, color: 'bg-neo-pink' },
  { letter: 'E', x: '88%', y: '20%', rotate: 8, delay: 0.3, color: 'bg-neo-cyan' },
  { letter: 'X', x: '5%', y: '70%', rotate: 15, delay: 0.6, color: 'bg-neo-lime' },
  { letter: 'I', x: '92%', y: '65%', rotate: -8, delay: 0.2, color: 'bg-neo-yellow' },
  { letter: 'C', x: '15%', y: '85%', rotate: 6, delay: 0.5, color: 'bg-neo-orange' },
  { letter: '!', x: '82%', y: '80%', rotate: -15, delay: 0.4, color: 'bg-neo-purple' },
];

export function LandingBottomCTA({ onPlayClick }: LandingBottomCTAProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      className={cn(
        'w-full max-w-4xl mx-auto relative overflow-hidden',
        'bg-gradient-to-br from-neo-pink via-neo-purple to-neo-navy',
        'border-3 border-neo-black shadow-hard-xl rounded-neo-lg',
        'p-8 sm:p-10 md:p-12 text-center'
      )}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Decorative floating letter tiles */}
      {FLOATING_TILES.map((tile) => (
        <motion.div
          key={tile.letter}
          className={cn(
            'absolute w-8 h-9 sm:w-10 sm:h-11',
            'border-2 border-neo-black rounded-sm shadow-hard-sm',
            'flex items-center justify-center',
            'font-black text-neo-black text-sm sm:text-base',
            'pointer-events-none select-none',
            'animate-float hidden sm:flex',
            tile.color,
          )}
          style={{
            left: tile.x,
            top: tile.y,
            transform: `rotate(${tile.rotate}deg)`,
            animationDelay: `${tile.delay}s`,
            animationDuration: `${3 + tile.delay}s`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 0.25, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: tile.delay }}
        >
          {tile.letter}
        </motion.div>
      ))}

      {/* Diagonal stripe accent */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 2px, transparent 2px, transparent 12px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-neo-lime/20 border-2 border-neo-lime/40 rounded-neo"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Zap className="w-4 h-4 text-neo-lime" aria-hidden="true" />
          <span className="text-neo-lime text-xs font-bold uppercase tracking-wider">
            {t('landing.freeToPlay')}
          </span>
        </motion.div>

        <h2 className="font-black text-neo-white uppercase text-xl sm:text-2xl lg:text-3xl mb-2 neo-title">
          {t('landing.readyToCompete')}
        </h2>
        <p className="text-neo-white/80 font-medium text-sm sm:text-base mb-6 max-w-lg mx-auto">
          {t('landing.welcomeSubtitle')}
        </p>
        <motion.button
          onClick={onPlayClick}
          className={cn(
            'relative px-10 py-4 sm:px-12 sm:py-5',
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
              '4px 4px 24px rgba(191,255,0,0.6)',
              '4px 4px 0px black',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {t('landing.startPlaying')}
        </motion.button>
      </div>
    </motion.div>
  );
}
