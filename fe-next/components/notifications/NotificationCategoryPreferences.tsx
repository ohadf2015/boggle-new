'use client';

/**
 * NotificationCategoryPreferences
 * Settings panel with master push toggle + per-category notification toggles.
 * Hydrates from server on mount; localStorage stays source of truth for SSR/offline.
 */

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Bell, BellOff, Calendar, Flame, Users, BarChart3 } from 'lucide-react';
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
  disabled?: boolean;
}

function CategoryToggle({ label, checked, onChange, icon, disabled }: CategoryToggleProps) {
  return (
    <div className={cn('flex items-center justify-between py-3', disabled && 'opacity-50')}>
      <div className="flex items-center gap-3">
        <span className="text-neo-cyan">{icon}</span>
        <span className="text-sm font-medium text-neo-white">{label}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
          checked ? 'bg-neo-lime' : 'bg-slate-600',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            // Arbitrary px (track 44 − knob 20 − 2px gap = 22); the fractional
            // translate-x-5.5 didn't generate reliably, leaving the knob short.
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          )}
        />
      </button>
    </div>
  );
}

export function NotificationCategoryPreferences() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<CategoryPrefs>(loadCategoryPreferences);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/notifications/preferences')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data !== 'object') return;
        if (typeof data.pushEnabled !== 'boolean') return;
        const hydrated: CategoryPrefs = {
          pushEnabled: data.pushEnabled,
          dailyChallenge: data.dailyChallenge,
          streakWarning: data.streakWarning,
          friendInvites: data.friendInvites,
          weeklySummary: data.weeklySummary,
        };
        setPrefs(hydrated);
        saveCategoryPreferences(hydrated);
      })
      .catch(() => {
        // Offline / unauthenticated — localStorage already loaded
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleToggle(key: keyof CategoryPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveCategoryPreferences(updated);
    syncToBackend(updated);
  }

  const masterOff = !prefs.pushEnabled;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-neo border-neo border-slate-700 bg-neo-navy-light/50 p-5"
    >
      <h3 className="flex items-center gap-2 font-neo-display text-base font-bold text-neo-white mb-3">
        <Bell className="w-5 h-5 text-neo-pink" />
        {t('notifications.preferences.title')}
      </h3>

      <div className="pb-3 border-b-2 border-slate-700">
        <CategoryToggle
          label={t('notifications.preferences.pushEnabled')}
          checked={prefs.pushEnabled}
          onChange={(v) => handleToggle('pushEnabled', v)}
          icon={masterOff ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        />
      </div>

      <div
        className={cn(
          'divide-y divide-slate-700/50 transition-opacity',
          masterOff && 'opacity-50 pointer-events-none'
        )}
        aria-disabled={masterOff}
      >
        <CategoryToggle
          label={t('notifications.preferences.dailyChallenge')}
          checked={prefs.dailyChallenge}
          onChange={(v) => handleToggle('dailyChallenge', v)}
          icon={<Calendar className="w-4 h-4" />}
          disabled={masterOff}
        />
        <CategoryToggle
          label={t('notifications.preferences.streakWarning')}
          checked={prefs.streakWarning}
          onChange={(v) => handleToggle('streakWarning', v)}
          icon={<Flame className="w-4 h-4" />}
          disabled={masterOff}
        />
        <CategoryToggle
          label={t('notifications.preferences.friendInvites')}
          checked={prefs.friendInvites}
          onChange={(v) => handleToggle('friendInvites', v)}
          icon={<Users className="w-4 h-4" />}
          disabled={masterOff}
        />
        <CategoryToggle
          label={t('notifications.preferences.weeklySummary')}
          checked={prefs.weeklySummary}
          onChange={(v) => handleToggle('weeklySummary', v)}
          icon={<BarChart3 className="w-4 h-4" />}
          disabled={masterOff}
        />
      </div>
    </m.div>
  );
}

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
