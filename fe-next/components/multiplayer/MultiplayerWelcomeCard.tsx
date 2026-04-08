'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Gamepad2, Trophy, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface MultiplayerWelcomeCardProps {
  onDismiss: () => void;
}

const MultiplayerWelcomeCard: React.FC<MultiplayerWelcomeCardProps> = ({ onDismiss }) => {
  const { t, dir } = useLanguage();

  const steps = [
    {
      icon: Users,
      bg: 'bg-neo-cyan',
      title: t('howToPlay.createOrJoinTitle'),
      desc: t('howToPlay.createOrJoinDesc'),
    },
    {
      icon: Gamepad2,
      bg: 'bg-neo-lime',
      title: t('howToPlay.hostStartsTitle'),
      desc: t('howToPlay.hostStartsDesc'),
    },
    {
      icon: Trophy,
      bg: 'bg-neo-yellow',
      title: t('howToPlay.earnPointsTitle'),
      desc: t('howToPlay.earnPointsDesc'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      dir={dir}
      className="relative bg-slate-800/90 border-3 border-neo-cyan/40 rounded-neo-lg p-4 mb-4 backdrop-blur-xs"
    >
      {/* Close button — top-end corner, always accessible */}
      <button
        onClick={onDismiss}
        className="absolute top-2 inset-e-2 w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pe-8">
        <div className="w-7 h-7 bg-neo-cyan border-2 border-neo-black rounded-lg flex items-center justify-center shrink-0">
          <Gamepad2 className="w-4 h-4 text-neo-black" />
        </div>
        <h3 className="font-neo-display font-black text-white text-base uppercase">
          {t('multiplayerWelcome.title')}
        </h3>
      </div>

      {/* Steps — all visible at once */}
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            {/* Step number + icon */}
            <div className="shrink-0 flex items-center gap-2">
              <span className="w-5 h-5 bg-neo-black text-white text-xs font-black flex items-center justify-center rounded">
                {i + 1}
              </span>
              <div className={`w-8 h-8 ${step.bg} border-2 border-neo-black rounded-lg flex items-center justify-center`}>
                <step.icon className="w-4 h-4 text-neo-black" />
              </div>
            </div>
            {/* Text */}
            <div className="min-w-0 pt-0.5">
              <span className="font-bold text-white text-sm">{step.title}</span>
              <span className="text-slate-400 text-xs ms-1.5">{step.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <p className="text-slate-500 text-xs mt-3 italic">
        {t('multiplayerWelcome.tip')}
      </p>
    </motion.div>
  );
};

export default MultiplayerWelcomeCard;
