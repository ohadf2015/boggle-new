/**
 * ModifierBadge Component
 *
 * Displays the current world's special mechanic indicator.
 * Shows icon, name, and bonus description for the active modifier.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

interface ModifierBadgeProps {
  /** Whether the badge should be in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

const ModifierBadge = memo<ModifierBadgeProps>(({ compact = false, className }) => {
  const { theme } = useAdventureTheme();
  const { t } = useLanguage();
  const { modifierDisplay, mechanic } = theme;

  // Don't render if modifier display is disabled or no mechanic
  if (!modifierDisplay.visible || !mechanic) {
    return null;
  }

  const IconComponent = modifierDisplay.icon;

  // Translation keys are flat strings (e.g. adventure.mechanics.synonymPairs),
  // not nested objects with .name/.description subkeys
  const mechanicKey = `adventure.mechanics.${mechanic}`;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-2',
          'px-3 py-2 rounded-neo',
          'border-2',
          modifierDisplay.backgroundColor,
          modifierDisplay.borderColor,
          modifierDisplay.glowColor && `shadow-[0_0_12px_${modifierDisplay.glowColor}]`,
          className
        )}
      >
        {/* Icon */}
        {IconComponent && (
          <IconComponent
            className={cn(
              'w-5 h-5',
              modifierDisplay.textColor
            )}
          />
        )}

        {/* Text content */}
        {!compact && (
          <div className="flex flex-col">
            <span className={cn(
              'text-xs font-bold uppercase tracking-wide',
              modifierDisplay.textColor
            )}>
              {t(mechanicKey) || mechanic}
            </span>
            <span className={cn(
              'text-[10px] opacity-80',
              modifierDisplay.textColor
            )}>
              {t(`${mechanicKey}Desc`, '')}
            </span>
          </div>
        )}

        {/* Compact mode: just icon and short label */}
        {compact && (
          <span className={cn(
            'text-xs font-bold',
            modifierDisplay.textColor
          )}>
            {t(mechanicKey) || mechanic}
          </span>
        )}
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

ModifierBadge.displayName = 'ModifierBadge';

export default ModifierBadge;
