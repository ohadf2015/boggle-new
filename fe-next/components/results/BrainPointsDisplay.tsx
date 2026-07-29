'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
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
    
    // Use neo-lime (success/progress) for positive scores
    const bgColor = isPositive
        ? 'bg-linear-to-r from-neo-lime to-lime-400'
        : 'bg-linear-to-r from-neo-red to-red-400';
    
    const textColor = isPositive ? 'text-neo-black' : 'text-white';
    const subTextColor = isPositive ? 'text-neo-black/90' : 'text-white';
    const iconColor = isPositive ? 'text-neo-black' : 'text-white';

    // Inline variant - small badge for landscape mode
    if (variant === 'inline') {
        return (
            <div className={cn(
                'border-2 border-neo-black rounded-neo px-3 py-1 text-center',
                isPositive ? 'bg-neo-lime' : 'bg-neo-red',
                className
            )}>
                <div className="flex items-center justify-center gap-1">
                    <Brain className={cn("w-3 h-3", iconColor)} />
                    <span className={cn("font-black", textColor)}>{sign}{reward.scoreDelta}</span>
                </div>
                <div className={cn("text-[10px] font-bold uppercase", subTextColor)}>
                    {t('brain.points')}
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
                    <Brain className={cn("w-5 h-5", iconColor)} />
                    <span className={cn("font-black text-xl", textColor)}>{sign}{reward.scoreDelta}</span>
                    <span className={cn("text-sm font-bold", subTextColor)}>
                        {t('brain.points')}
                    </span>
                </div>
            </div>
        );
    }

    // Full variant - large card
    return (
        <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 22 }}
            className={cn(
                'px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                bgColor,
                className
            )}
        >
            <div className="flex items-center justify-center gap-2">
                <Brain className={cn("w-5 h-5", iconColor)} />
                <span className={cn("font-black text-xl", textColor)}>{sign}{reward.scoreDelta}</span>
                <span className={cn("text-sm font-bold", subTextColor)}>
                    {t('brain.points')}
                </span>
            </div>
        </m.div>
    );
});

BrainPointsDisplay.displayName = 'BrainPointsDisplay';

export default BrainPointsDisplay;
