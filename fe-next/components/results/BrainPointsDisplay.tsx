'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface BrainPointsReward {
    scoreDelta: number;
    newScore: number;
}

interface BrainPointsDisplayProps {
    /** Brain Points reward data */
    reward: BrainPointsReward | null;
    /** Display variant */
    variant?: 'full' | 'compact' | 'inline';
    /** Additional className */
    className?: string;
}

/**
 * BrainPointsDisplay - Shows brain points earned/lost from a game
 *
 * Used in:
 * - SinglePlayerResults
 * - ResultsPage
 */
const BrainPointsDisplay: React.FC<BrainPointsDisplayProps> = memo(({
    reward,
    variant = 'full',
    className,
}) => {
    const { t } = useLanguage();

    if (!reward || reward.scoreDelta === 0) {
        return null;
    }

    const isPositive = reward.scoreDelta > 0;
    const sign = isPositive ? '+' : '';
    const bgColor = isPositive
        ? 'bg-gradient-to-r from-neo-purple to-purple-400'
        : 'bg-gradient-to-r from-neo-red to-red-400';

    const borderColor = 'border-neo-black';

    // Inline variant - small badge for landscape mode
    if (variant === 'inline') {
        return (
            <div className={cn(
                'border-2 border-neo-black rounded-neo px-3 py-1 text-center',
                isPositive ? 'bg-neo-purple text-white' : 'bg-neo-red text-white',
                className
            )}>
                <div className="flex items-center justify-center gap-1">
                    <Brain className="w-3 h-3 text-white" />
                    <span className="font-black text-white">{sign}{reward.scoreDelta}</span>
                </div>
                <div className="text-[8px] font-bold uppercase text-white/90">
                    {t('brain.points') || 'Brain Pts'}
                </div>
            </div>
        );
    }

    // Compact variant - medium size for mobile
    if (variant === 'compact') {
        return (
            <div className={cn(
                'rounded-neo border-3 border-neo-black shadow-hard px-4 py-2',
                bgColor,
                className
            )}>
                <div className="flex items-center justify-center gap-2">
                    <Brain className="w-5 h-5 text-white" />
                    <span className="font-black text-xl text-white">{sign}{reward.scoreDelta}</span>
                    <span className="text-sm font-bold text-white/90">
                        {t('brain.points') || 'Brain Points'}
                    </span>
                </div>
            </div>
        );
    }

    // Full variant - large card
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className={cn(
                'px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                bgColor,
                className
            )}
        >
            <div className="flex items-center justify-center gap-2">
                <Brain className="w-5 h-5 text-white" />
                <span className="font-black text-xl text-white">{sign}{reward.scoreDelta}</span>
                <span className="text-sm font-bold text-white/90">
                    {t('brain.points') || 'Brain Points'}
                </span>
            </div>
        </motion.div>
    );
});

BrainPointsDisplay.displayName = 'BrainPointsDisplay';

export default BrainPointsDisplay;
