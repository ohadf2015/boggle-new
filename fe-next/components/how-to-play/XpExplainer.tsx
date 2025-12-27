'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaStar, FaTrophy, FaMedal, FaLevelUpAlt } from 'react-icons/fa';
import { Badge } from '../ui/badge';
import type { IconType } from 'react-icons';

interface XpBreakdownItem {
  key: string;
  icon: IconType;
  value: number;
  color: string;
}

interface LevelTitle {
  level: number;
  name: string;
  icon: string;
}

interface XpExplainerProps {
  t: (key: string) => string;
}

/**
 * XP & Level System Explainer
 * Shows how players earn XP and unlock titles
 */
export const XpExplainer: React.FC<XpExplainerProps> = ({ t }) => {
  const xpBreakdown: XpBreakdownItem[] = [
    { key: 'base', icon: FaGamepad, value: 50, color: 'bg-neo-cyan' },
    { key: 'score', icon: FaStar, value: 25, color: 'bg-neo-yellow' },
    { key: 'win', icon: FaTrophy, value: 100, color: 'bg-neo-lime' },
    { key: 'achievement', icon: FaMedal, value: 30, color: 'bg-neo-pink' },
  ];

  const titles: LevelTitle[] = [
    { level: 1, name: t('xp.titles.wordSeeker'), icon: '📖' },
    { level: 5, name: t('xp.titles.letterHunter'), icon: '🔍' },
    { level: 10, name: t('xp.titles.vocabularian'), icon: '📚' },
    { level: 15, name: t('xp.titles.wordsmith'), icon: '✍️' },
    { level: 20, name: t('xp.titles.lexiconAdept'), icon: '🎓' },
    { level: 30, name: t('xp.titles.linguisticLegend'), icon: '👑' },
  ];

  return (
    <div className="space-y-4">
      {/* XP Sources */}
      <div className="bg-neo-cream text-neo-black rounded-neo border-3 border-neo-black p-4 shadow-hard-sm">
        <h4 className="font-bold text-neo-black mb-3 flex items-center gap-2">
          <FaLevelUpAlt className="text-neo-pink" />
          {t('howToPlay.xp.howToEarn')}
        </h4>

        <div className="space-y-2">
          {xpBreakdown.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-2 rounded-neo bg-neo-white border-2 border-neo-black"
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-neo ${item.color} flex items-center justify-center border-2 border-neo-black`}>
                  <item.icon className="text-neo-black" />
                </div>
                <span className="font-medium text-neo-black">
                  {t(`howToPlay.xp.${item.key}`)}
                </span>
              </div>
              <Badge className={`${item.color} text-neo-black border-2 border-neo-black font-bold`}>
                +{item.value} XP
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Level Titles */}
      <div className="bg-gradient-to-br from-neo-pink/20 to-neo-yellow/20 rounded-neo border-3 border-neo-black p-4">
        <h4 className="font-bold text-neo-black mb-3">
          {t('howToPlay.xp.unlockTitles')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {titles.map((title) => (
            <div key={title.level} className="flex items-center gap-2 text-sm">
              <span className="text-lg">{title.icon}</span>
              <div>
                <div className="font-semibold text-neo-black">{title.name}</div>
                <div className="text-xs text-neo-black/75">{t('xp.level')} {title.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default XpExplainer;
