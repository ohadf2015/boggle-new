'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Mail, Bell, BellOff, Globe, Check } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US/Eastern (New York)', value: 'America/New_York' },
  { label: 'US/Central (Chicago)', value: 'America/Chicago' },
  { label: 'US/Mountain (Denver)', value: 'America/Denver' },
  { label: 'US/Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'Europe/Berlin', value: 'Europe/Berlin' },
  { label: 'Europe/Stockholm', value: 'Europe/Stockholm' },
  { label: 'Asia/Jerusalem', value: 'Asia/Jerusalem' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
];

interface EmailPreferencesProps {
  isDarkMode: boolean;
}

export function EmailPreferences({ isDarkMode }: EmailPreferencesProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dailyEmailSubscribed, setDailyEmailSubscribed] = useState(true);
  const [timezone, setTimezone] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch current preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      if (!supabase || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/email/preferences', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDailyEmailSubscribed(data.daily_email_subscribed ?? true);
          setTimezone(data.timezone || detectUserTimezone());
          setUserEmail(data.email);
        }
      } catch (err) {
        console.error('Failed to fetch email preferences:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, [user]);

  // Auto-detect user's timezone
  function detectUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }

  // Save preferences
  async function savePreferences(subscribed: boolean, tz: string) {
    if (!supabase || !user) return;

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t('error.notAuthenticated'));
        return;
      }

      const response = await fetch('/api/email/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daily_email_subscribed: subscribed,
          timezone: tz,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDailyEmailSubscribed(data.daily_email_subscribed);
        setTimezone(data.timezone || tz);
        toast.success(t('emailPreferences.saved'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Failed to save email preferences:', err);
      toast.error(t('error.generic'));
    } finally {
      setIsSaving(false);
    }
  }

  // Toggle subscription
  function handleToggleSubscription() {
    const newValue = !dailyEmailSubscribed;
    setDailyEmailSubscribed(newValue);
    savePreferences(newValue, timezone);
  }

  // Change timezone
  function handleTimezoneChange(newTimezone: string) {
    setTimezone(newTimezone);
    savePreferences(dailyEmailSubscribed, newTimezone);
  }

  if (isLoading) {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl p-6 mb-6',
          isDarkMode ? 'bg-neo-navy-light/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
        )}
      >
        <div className="flex items-center justify-center py-4">
          <Loader size="md" />
        </div>
      </m.div>
    );
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
      <h2 className={cn(
        'text-lg font-bold mb-4 flex items-center gap-2',
        isDarkMode ? 'text-white' : 'text-gray-900'
      )}>
        <Mail className="text-neo-cyan" />
        {t('emailPreferences.title')}
      </h2>

      {/* Email address display */}
      {userEmail && (
        <p className={cn(
          'text-sm mb-4',
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        )}>
          {t('emailPreferences.sendingTo')}: <span className="font-medium">{userEmail}</span>
        </p>
      )}

      {/* Daily Challenge Email Toggle */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-xl mb-4',
        isDarkMode ? 'bg-neo-navy/50' : 'bg-gray-50'
      )}>
        <div className="flex items-center gap-3">
          {dailyEmailSubscribed ? (
            <Bell className="w-5 h-5 text-neo-lime" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className={cn(
              'font-medium',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {t('emailPreferences.dailyChallenge')}
            </p>
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              {t('emailPreferences.dailyChallengeDesc')}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button type="button"
          onClick={handleToggleSubscription}
          disabled={isSaving}
          className={cn(
            'relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
            dailyEmailSubscribed
              ? 'bg-neo-lime'
              : isDarkMode ? 'bg-slate-600' : 'bg-gray-300',
            isSaving && 'opacity-50 cursor-not-allowed'
          )}
          role="switch"
          aria-checked={dailyEmailSubscribed}
          aria-label={dailyEmailSubscribed ? (t('emailPreferences.disableNotifications')) : (t('emailPreferences.enableNotifications'))}
        >
          <span
            className={cn(
              'absolute top-1 w-6 h-6 rounded-full transition-transform duration-200 flex items-center justify-center',
              dailyEmailSubscribed
                ? 'translate-x-7 bg-neo-black'
                : 'translate-x-1 bg-white shadow-md',
            )}
          >
            {isSaving ? (
              <Loader size="sm" />
            ) : dailyEmailSubscribed ? (
              <Check className="w-3 h-3 text-neo-lime" />
            ) : null}
          </span>
        </button>
      </div>

      {/* Timezone Selection - only show when subscribed */}
      {dailyEmailSubscribed && (
        <div className={cn(
          'p-4 rounded-xl',
          isDarkMode ? 'bg-neo-navy/50' : 'bg-gray-50'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-neo-orange" />
            <div>
              <p className={cn(
                'font-medium',
                isDarkMode ? 'text-white' : 'text-gray-900'
              )}>
                {t('emailPreferences.timezone')}
              </p>
              <p className={cn(
                'text-sm',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              )}>
                {t('emailPreferences.timezoneDesc')}
              </p>
            </div>
          </div>

          <Select value={timezone} onValueChange={handleTimezoneChange} disabled={isSaving}>
            <SelectTrigger className="w-full" aria-label={t('emailPreferences.selectTimezone')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
              {/* Include user's detected timezone if not in the list */}
              {!TIMEZONE_OPTIONS.find(tz => tz.value === timezone) && timezone && (
                <SelectItem value={timezone}>{timezone}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Unsubscribe info */}
      <p className={cn(
        'text-xs mt-4 text-center',
        isDarkMode ? 'text-gray-500' : 'text-gray-500'
      )}>
        {t('emailPreferences.unsubscribeInfo')}
      </p>
    </m.div>
  );
}

export default EmailPreferences;
