'use client';

/**
 * NotificationCategoryPreferences
 * Settings panel with per-category notification toggles.
 * Can be embedded in profile/settings pages.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Flame, Users, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  loadCategoryPreferences,
  saveCategoryPreferences,
} from '@/utils/pushNotifications';
import type { NotificationCategoryPreferences as CategoryPrefs } from '@/utils/pushNotifications/types';
import { cn } from '@/lib/utils';

interface CategoryToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

function CategoryToggle({ label, checked, onChange, icon }: CategoryToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="text-neo-cyan">{icon}</span>
        <span className="text-sm font-medium text-neo-white">{label}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
          checked ? 'bg-neo-lime' : 'bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

export function NotificationCategoryPreferences() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<CategoryPrefs>(loadCategoryPreferences);

  function handleToggle(key: keyof CategoryPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveCategoryPreferences(updated);

    // Fire-and-forget sync to backend if user is authenticated
    syncToBackend(updated);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-neo border-neo border-slate-700 bg-slate-800/50 p-5"
    >
      <h3 className="flex items-center gap-2 font-neo-display text-base font-bold text-neo-white mb-3">
        <Bell className="w-5 h-5 text-neo-pink" />
        {t('notifications.preferences.title')}
      </h3>

      <div className="divide-y divide-slate-700/50">
        <CategoryToggle
          label={t('notifications.preferences.dailyChallenge')}
          checked={prefs.dailyChallenge}
          onChange={(v) => handleToggle('dailyChallenge', v)}
          icon={<Calendar className="w-4 h-4" />}
        />
        <CategoryToggle
          label={t('notifications.preferences.streakWarning')}
          checked={prefs.streakWarning}
          onChange={(v) => handleToggle('streakWarning', v)}
          icon={<Flame className="w-4 h-4" />}
        />
        <CategoryToggle
          label={t('notifications.preferences.friendInvites')}
          checked={prefs.friendInvites}
          onChange={(v) => handleToggle('friendInvites', v)}
          icon={<Users className="w-4 h-4" />}
        />
        <CategoryToggle
          label={t('notifications.preferences.weeklySummary')}
          checked={prefs.weeklySummary}
          onChange={(v) => handleToggle('weeklySummary', v)}
          icon={<BarChart3 className="w-4 h-4" />}
        />
      </div>
    </motion.div>
  );
}

/**
 * Sync preferences to backend (fire-and-forget)
 */
async function syncToBackend(prefs: CategoryPrefs): Promise<void> {
  try {
    await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
  } catch {
    // Silently fail — localStorage is the source of truth
  }
}

export default NotificationCategoryPreferences;
