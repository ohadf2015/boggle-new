'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

interface ChallengeInviteDialogProps {
  isOpen: boolean;
  friendUsername: string;
  friendId: string;
  onClose: () => void;
  onSendChallenge: (
    friendId: string,
    challengeType: 'new_game' | 'join_room',
    settings: GameSettings
  ) => Promise<void>;
  className?: string;
}

interface GameSettings {
  language?: string;
  timerSeconds?: number;
  mode?: string;
  message?: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
  { value: 'es', label: 'Español' },
  { value: 'sv', label: 'Svenska' },
  { value: 'ja', label: '日本語' },
];

const TIMER_OPTIONS = [
  { value: 60, label: '1:00' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2:00' },
  { value: 180, label: '3:00' },
];

/**
 * ChallengeInviteDialog - Modal for sending game challenges to friends
 *
 * Features:
 * - Game settings picker (language, timer, mode)
 * - Optional custom message
 * - Create new game or share existing room code
 * - Loading state during challenge creation
 */
export const ChallengeInviteDialog: React.FC<ChallengeInviteDialogProps> = ({
  isOpen,
  friendUsername,
  friendId,
  onClose,
  onSendChallenge,
  className,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const modeOptions = [
    { value: 'classic', label: t('friends.challenges.modes.classic') },
    { value: 'blitz', label: t('friends.challenges.modes.blitz') },
    { value: 'survival', label: t('friends.challenges.modes.survival') },
  ];

  const [settings, setSettings] = useState<GameSettings>({
    language: language || 'en',
    timerSeconds: 120,
    mode: 'classic',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle setting change
   */
  const handleSettingChange = useCallback(<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Handle send challenge
   */
  const handleSend = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onSendChallenge(friendId, 'new_game', settings);
      onClose();
    } catch (err) {
      setError(t('friends.errors.sendFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [friendId, settings, onSendChallenge, onClose, t]);

  /**
   * Reset form when dialog closes
   */
  const handleClose = useCallback(() => {
    if (!isLoading) {
      setSettings({
        language: language || 'en',
        timerSeconds: 120,
        mode: 'classic',
        message: '',
      });
      setError(null);
      onClose();
    }
  }, [isLoading, language, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-md',
              '-translate-x-1/2 -translate-y-1/2',
              'p-4',
              className
            )}
          >
            <div className={cn(
              'rounded-neo border-2 border-neo-black shadow-hard-lg p-6',
              isDark ? 'bg-slate-800' : 'bg-white'
            )}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-neo-cyan" />
                  <h2 className={cn('font-black text-lg', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.challenges.send')}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className={cn(
                    'p-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
                    'hover:shadow-hard hover:-translate-y-0.5 transition-all',
                    isDark ? 'bg-slate-700' : 'bg-gray-100',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recipient */}
              <p className={cn('text-sm mb-4', isDark ? 'text-gray-400' : 'text-gray-600')}>
                {t('friends.challenges.inviteMessage', { username: friendUsername })}
              </p>

              {/* Settings */}
              <div className="space-y-4 mb-6">
                {/* Language */}
                <div>
                  <label className={cn('block text-sm font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('settings.language')}
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      'w-full px-3 py-2 rounded-neo border-2 border-neo-black',
                      'font-medium text-sm',
                      isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Timer */}
                <div>
                  <label className={cn('block text-sm font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('multiplayer.timer')}
                  </label>
                  <select
                    value={settings.timerSeconds}
                    onChange={(e) => handleSettingChange('timerSeconds', Number(e.target.value))}
                    disabled={isLoading}
                    className={cn(
                      'w-full px-3 py-2 rounded-neo border-2 border-neo-black',
                      'font-medium text-sm',
                      isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {TIMER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label className={cn('block text-sm font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('multiplayer.mode')}
                  </label>
                  <select
                    value={settings.mode}
                    onChange={(e) => handleSettingChange('mode', e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      'w-full px-3 py-2 rounded-neo border-2 border-neo-black',
                      'font-medium text-sm',
                      isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {modeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom message */}
                <div>
                  <label className={cn('block text-sm font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {t('friends.challenges.customMessage')}
                  </label>
                  <textarea
                    value={settings.message}
                    onChange={(e) => handleSettingChange('message', e.target.value)}
                    disabled={isLoading}
                    placeholder={t('friends.challenges.customMessage')}
                    maxLength={200}
                    rows={2}
                    className={cn(
                      'w-full px-3 py-2 rounded-neo border-2 border-neo-black resize-none',
                      'font-medium text-sm',
                      isDark ? 'bg-slate-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                  <p className={cn('text-xs mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                    {settings.message?.length || 0}/200
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-neo border-2 border-red-500 bg-red-500/10">
                  <p className="text-sm font-medium text-red-500">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-neo border-2 border-neo-black',
                    'font-bold text-sm shadow-hard',
                    'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all',
                    isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-neo border-2 border-neo-black',
                    'font-bold text-sm shadow-hard',
                    'hover:shadow-hard-lg hover:-translate-y-0.5 transition-all',
                    'bg-neo-lime text-neo-black',
                    isLoading && 'opacity-50 cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader size="sm" />
                      {t('common.sending')}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      {t('friends.challenges.send')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChallengeInviteDialog;
