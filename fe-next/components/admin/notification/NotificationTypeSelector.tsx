'use client';

/**
 * NotificationTypeSelector Component
 * Select notification type with visual icons and descriptions
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NOTIFICATION_TEMPLATES, type NotificationType } from './types';

interface NotificationTypeSelectorProps {
  selectedType: NotificationType;
  onSelect: (type: NotificationType) => void;
}

export function NotificationTypeSelector({
  selectedType,
  onSelect,
}: NotificationTypeSelectorProps) {
  const { t } = useLanguage();

  const types: NotificationType[] = ['system', 'achievement', 'social', 'marketing'];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-neo-display text-neo-white mb-2">
        {t('notifications.admin.chooseType') || 'Choose Type'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => {
          const template = NOTIFICATION_TEMPLATES[type];
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                'flex flex-col items-center gap-2 p-4',
                'border-3 border-black rounded-lg',
                'transition-all duration-200',
                isSelected
                  ? 'bg-neo-yellow text-black shadow-hard-pressed translate-x-0.5 translate-y-0.5'
                  : 'bg-neo-navy text-neo-white shadow-hard hover:shadow-hard-sm'
              )}
            >
              <span className="text-3xl">{template.icon}</span>
              <span className="font-neo-display text-sm font-bold">
                {t(`notifications.types.${type}`) || template.label}
              </span>
              <span
                className={cn(
                  'text-xs text-center line-clamp-2',
                  isSelected ? 'text-black/70' : 'text-neo-white/60'
                )}
              >
                {template.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default NotificationTypeSelector;
