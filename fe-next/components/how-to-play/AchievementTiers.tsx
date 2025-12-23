'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaChevronRight } from 'react-icons/fa';

interface AchievementTier {
  name: string;
  icon: string;
  count: number;
  color: string;
}

interface SampleAchievement {
  name: string;
  desc: string;
  icon: string;
}

interface AchievementTiersProps {
  t: (key: string) => string;
}

/**
 * Achievement Tiers Explainer
 * Shows achievement progression and examples
 */
export const AchievementTiers: React.FC<AchievementTiersProps> = ({ t }) => {
  const tiers: AchievementTier[] = [
    { name: t('achievementTiers.bronze'), icon: '🥉', count: 1, color: 'bg-amber-600' },
    { name: t('achievementTiers.silver'), icon: '🥈', count: 15, color: 'bg-gray-400' },
    { name: t('achievementTiers.gold'), icon: '🥇', count: 75, color: 'bg-yellow-500' },
    { name: t('achievementTiers.platinum'), icon: '💎', count: 300, color: 'bg-cyan-400' },
  ];

  const sampleAchievements: SampleAchievement[] = [
    { name: t('achievements.FIRST_BLOOD.name'), desc: t('achievements.FIRST_BLOOD.description'), icon: '⚡' },
    { name: t('achievements.WORD_MASTER.name'), desc: t('achievements.WORD_MASTER.description'), icon: '📏' },
    { name: t('achievements.COMBO_KING.name'), desc: t('achievements.COMBO_KING.description'), icon: '🔥' },
    { name: t('achievements.SPEED_DEMON.name'), desc: t('achievements.SPEED_DEMON.description'), icon: '💨' },
  ];

  return (
    <div className="space-y-4">
      {/* Tier Progression */}
      <div className="flex justify-between items-center gap-1 sm:gap-2">
        {tiers.map((tier, index) => (
          <React.Fragment key={tier.name}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-neo ${tier.color} flex items-center justify-center text-2xl border-3 border-neo-black shadow-hard-sm`}>
                {tier.icon}
              </div>
              <span className="text-xs font-bold mt-1 text-neo-black">{tier.name}</span>
              <span className="text-xs text-neo-black/75">×{tier.count}</span>
            </motion.div>
            {index < tiers.length - 1 && (
              <FaChevronRight className="text-neo-black/70 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Sample Achievements */}
      <div className="space-y-2">
        <h4 className="font-bold text-neo-black text-sm">
          {t('howToPlay.achievements.examples')}
        </h4>
        {sampleAchievements.map((ach, index) => (
          <motion.div
            key={index}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 bg-neo-cream rounded-neo border-2 border-neo-black"
          >
            <span className="text-2xl">{ach.icon}</span>
            <div>
              <div className="font-semibold text-neo-black text-sm">{ach.name}</div>
              <div className="text-xs text-neo-black/75">{ach.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementTiers;
