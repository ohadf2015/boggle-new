'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain, Target, Shuffle, BookOpen, ChevronRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Drill {
  id: string;
  icon: React.ElementType;
  domain: string;
  color: string;
  bgColor: string;
  unlocked: boolean;
}

const DRILLS: Drill[] = [
  {
    id: 'lightning-round',
    icon: Zap,
    domain: 'processingSpeed',
    color: 'text-neo-yellow',
    bgColor: 'bg-yellow-400',
    unlocked: true,
  },
  {
    id: 'memory-hunt',
    icon: Brain,
    domain: 'workingMemory',
    color: 'text-neo-purple',
    bgColor: 'bg-purple-400',
    unlocked: true,
  },
  {
    id: 'combo-master',
    icon: Target,
    domain: 'attention',
    color: 'text-neo-orange',
    bgColor: 'bg-orange-400',
    unlocked: true,
  },
  {
    id: 'pattern-switcher',
    icon: Shuffle,
    domain: 'flexibility',
    color: 'text-neo-cyan',
    bgColor: 'bg-cyan-400',
    unlocked: false,
  },
  {
    id: 'rare-gems',
    icon: BookOpen,
    domain: 'vocabulary',
    color: 'text-neo-green',
    bgColor: 'bg-green-400',
    unlocked: false,
  },
];

/**
 * Quick Drills Section
 * Horizontal scroll list of brain training drills with unlock status.
 */
export default function QuickDrillsSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';

  const handleDrillClick = (drill: Drill) => {
    if (drill.unlocked) {
      router.push(`/${language}/brain/drills/${drill.id}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={cn(
          'text-lg font-bold uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.quickDrills')}
        </h2>
        <button
          onClick={() => router.push(`/${language}/brain/drills`)}
          className={cn(
            'flex items-center gap-1 text-sm font-bold',
            isDarkMode ? 'text-neo-cyan hover:text-neo-cyan/80' : 'text-neo-purple hover:text-neo-purple/80'
          )}
        >
          {t('brain.viewAll')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {DRILLS.map((drill, index) => {
            const Icon = drill.icon;

            return (
              <motion.button
                key={drill.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleDrillClick(drill)}
                disabled={!drill.unlocked}
                className={cn(
                  'flex flex-col items-center p-4 rounded-neo border-3 border-neo-black',
                  'min-w-[100px] transition-all',
                  drill.unlocked
                    ? 'shadow-hard-sm hover:translate-y-[-2px] hover:shadow-hard active:translate-y-[2px] active:shadow-none'
                    : 'opacity-50 cursor-not-allowed',
                  isDarkMode ? 'bg-slate-800' : 'bg-white'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-lg border-2 border-neo-black flex items-center justify-center mb-2 relative',
                  drill.bgColor
                )}>
                  <Icon className="w-6 h-6 text-neo-black" />
                  {!drill.unlocked && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <p className={cn(
                  'text-xs font-bold text-center line-clamp-2',
                  isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {t(`brain.drills.${drill.id}.name`)}
                </p>

                <p className={cn(
                  'text-[10px] uppercase mt-1',
                  isDarkMode ? 'text-neo-white/50' : 'text-neo-black/50'
                )}>
                  {t(`brain.domains.${drill.domain}`)}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
