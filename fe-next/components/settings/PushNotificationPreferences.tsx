'use client';

/**
 * PushNotificationPreferences Component
 * Settings UI for managing push notification preferences on native mobile platforms
 */

import { useState } from 'react';
import { m } from 'framer-motion';
import { Bell, BellOff, Clock, AlertTriangle, Check, Settings } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

// Hour options for time selector (5 AM to 11 PM)
const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 5);

interface PushNotificationPreferencesProps {
  isDarkMode: boolean;
}

export function PushNotificationPreferences({ isDarkMode }: PushNotificationPreferencesProps) {
  const { t } = useLanguage();
  const {
    isAvailable,
    permissionStatus,
    isLoading,
    preferences,
    setEnabled,
    setTime,
  } = usePushNotifications();

  const [isSaving, setIsSaving] = useState(false);

  // Don't render if push notifications are not available (web platform)
  if (!isAvailable) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl p-6 mb-6',
          isDarkMode ? 'bg-neo-navy-light/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
        )}
        data-testid="push-notifications-loading"
      >
        <div className="flex items-center justify-center py-4">
          <Loader size="md" />
        </div>
      </m.div>
    );
  }

  // Handle toggle
  async function handleToggle() {
    setIsSaving(true);
    try {
      await setEnabled(!preferences.enabled);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle hour change
  async function handleHourChange(value: string) {
    const newHour = parseInt(value, 10);
    setIsSaving(true);
    try {
      await setTime(newHour, preferences.minute);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle minute change
  async function handleMinuteChange(value: string) {
    const newMinute = parseInt(value, 10);
    setIsSaving(true);
    try {
      await setTime(preferences.hour, newMinute);
    } finally {
      setIsSaving(false);
    }
  }

  // Format hour for display (12-hour format)
  function formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl p-6 mb-6',
        isDarkMode ? 'bg-neo-navy-light/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
      )}
    >
      {/* Header */}
      <h2 className={cn(
        'text-lg font-bold mb-4 flex items-center gap-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        <Bell className="text-neo-orange" />
        {t('pushNotifications.settings.title')}
      </h2>

      {/* Permission Denied Warning */}
      {permissionStatus === 'denied' && (
        <div className={cn(
          'flex items-start gap-3 p-4 rounded-xl mb-4',
          isDarkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
        )}>
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className={cn(
              'font-medium',
              isDarkMode ? 'text-red-400' : 'text-red-700'
            )}>
              {t('pushNotifications.settings.permissionDenied')}
            </p>
            <p className={cn(
              'text-sm mt-1',
              isDarkMode ? 'text-red-400/80' : 'text-red-600'
            )}>
              {t('pushNotifications.settings.permissionDeniedDesc')}
            </p>
            <button
              type="button"
              onClick={() => {
                // Try to open device settings - this is a best-effort
                // On iOS this will do nothing, on Android it may open settings
                if ('Notification' in window && Notification.requestPermission) {
                  Notification.requestPermission();
                }
              }}
              className={cn(
                'mt-2 text-sm font-medium underline',
                isDarkMode ? 'text-red-400' : 'text-red-600'
              )}
            >
              {t('pushNotifications.settings.openSettings')}
            </button>
          </div>
        </div>
      )}

      {/* Daily Reminder Toggle */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-xl mb-4',
        isDarkMode ? 'bg-neo-navy/50' : 'bg-gray-50'
      )}>
        <div className="flex items-center gap-3">
          {preferences.enabled ? (
            <Bell className="w-5 h-5 text-neo-lime" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className={cn(
              'font-medium',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('pushNotifications.settings.enabled')}
            </p>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              {t('pushNotifications.settings.enabledDesc')}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving || permissionStatus === 'denied'}
          className={cn(
            'relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
            preferences.enabled
              ? 'bg-neo-lime'
              : isDarkMode ? 'bg-slate-600' : 'bg-gray-300',
            (isSaving || permissionStatus === 'denied') && 'opacity-50 cursor-not-allowed'
          )}
          role="switch"
          aria-checked={preferences.enabled}
          aria-label={preferences.enabled
            ? (t('emailPreferences.disableNotifications'))
            : (t('emailPreferences.enableNotifications'))}
        >
          <span
            className={cn(
              'absolute top-1 w-6 h-6 rounded-full transition-transform duration-200 flex items-center justify-center',
              preferences.enabled
                ? 'translate-x-7 bg-neo-black'
                : 'translate-x-1 bg-white shadow-md',
            )}
          >
            {isSaving ? (
              <Loader size="sm" />
            ) : preferences.enabled ? (
              <Check className="w-3 h-3 text-neo-lime" />
            ) : null}
          </span>
        </button>
      </div>

      {/* Time Selection - only show when enabled */}
      {preferences.enabled && permissionStatus !== 'denied' && (
        <div className={cn(
          'p-4 rounded-xl',
          isDarkMode ? 'bg-neo-navy/50' : 'bg-gray-50'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-neo-cyan" />
            <div>
              <p className={cn(
                'font-medium',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                {t('pushNotifications.settings.time')}
              </p>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              )}>
                {t('pushNotifications.settings.timeDesc')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Hour Selector */}
            <Select
              value={String(preferences.hour)}
              onValueChange={handleHourChange}
              disabled={isSaving}
            >
              <SelectTrigger className="flex-1" aria-label="Select hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {formatHour(hour)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Minute Selector */}
            <Select
              value={String(preferences.minute)}
              onValueChange={handleMinuteChange}
              disabled={isSaving}
            >
              <SelectTrigger className="w-24" aria-label="Select minute">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">:00</SelectItem>
                <SelectItem value="15">:15</SelectItem>
                <SelectItem value="30">:30</SelectItem>
                <SelectItem value="45">:45</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </m.div>
  );
}

export default PushNotificationPreferences;
