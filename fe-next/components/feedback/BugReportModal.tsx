'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, Loader2, CheckCircle, Globe, Monitor, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getBugReportContext, submitBugReport, BugReportContext } from '@/utils/bugReport';
import toast from 'react-hot-toast';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BugReportModal - Neo-Brutalist styled modal for bug reporting
 * Captures LogRocket session, Sentry context, and user description
 */
const BugReportModal = memo<BugReportModalProps>(({ isOpen, onClose }) => {
  const { t, dir } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDarkMode = theme === 'dark';

  const [description, setDescription] = useState('');
  const [context, setContext] = useState<BugReportContext | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Load context when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingContext(true);
      getBugReportContext(user?.id).then((ctx) => {
        setContext(ctx);
        setIsLoadingContext(false);
      });
    } else {
      // Reset state when modal closes
      setDescription('');
      setContext(null);
      setIsSubmitting(false);
    }
  }, [isOpen, user?.id]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || !context || isSubmitting) return;

    setIsSubmitting(true);
    const success = await submitBugReport(description.trim(), context);

    if (success) {
      toast.success(t('bugReport.success') || 'Bug report submitted! Thank you.');
      onClose();
    } else {
      toast.error(t('bugReport.error') || 'Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  }, [description, context, isSubmitting, t, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        dir={dir}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neo-black/60"
          onClick={!isSubmitting ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'relative w-full max-w-lg',
            'border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-cream'
          )}
        >
          {/* Header */}
          <div className="bg-neo-pink border-b-4 border-neo-black px-4 py-3 flex items-center justify-between text-neo-white">
            <h2 className="text-xl font-black uppercase tracking-tight text-neo-cream flex items-center gap-2">
              <Bug className="w-5 h-5 text-neo-yellow" />
              {t('bugReport.title') || 'Report a Bug'}
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-neo-cream hover:text-neo-yellow transition-colors p-1 disabled:opacity-50"
              aria-label={t('common.close') || 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Description */}
            <p className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            )}>
              {t('bugReport.description') || 'Help us improve the game by reporting any issues you encounter.'}
            </p>

            {/* Textarea */}
            <div className="space-y-2">
              <label className={cn(
                'block text-sm font-bold',
                isDarkMode ? 'text-white' : 'text-neo-black'
              )}>
                {t('bugReport.whatHappened') || 'What happened?'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('bugReport.placeholder') || 'Describe the bug or issue you experienced...'}
                disabled={isSubmitting}
                rows={4}
                className={cn(
                  'w-full px-4 py-3 rounded-neo border-3 border-neo-black resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-neo-cyan',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isDarkMode
                    ? 'bg-slate-700 text-white placeholder:text-gray-400'
                    : 'bg-white text-neo-black placeholder:text-gray-400'
                )}
              />
            </div>

            {/* Context Info */}
            <div className={cn(
              'rounded-neo border-2 p-3 space-y-2',
              isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-white/50'
            )}>
              <p className={cn(
                'text-xs font-bold uppercase',
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              )}>
                {t('bugReport.sessionInfo') || 'Session info (auto-captured)'}
              </p>

              {isLoadingContext ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.loading') || 'Loading...'}
                </div>
              ) : context ? (
                <div className="space-y-1 text-xs">
                  <div className={cn(
                    'flex items-center gap-2',
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    <Globe className="w-3 h-3" />
                    <span className="font-medium">{t('bugReport.currentPage') || 'Page'}:</span>
                    <span className="truncate">{context.currentPage}</span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-2',
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    <Monitor className="w-3 h-3" />
                    <span className="font-medium">{t('bugReport.browserInfo') || 'Browser'}:</span>
                    <span>{context.browser} / {context.platform} / {context.screenSize}</span>
                  </div>
                  {context.userId && (
                    <div className={cn(
                      'flex items-center gap-2',
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    )}>
                      <User className="w-3 h-3" />
                      <span className="font-medium">{t('bugReport.userId') || 'User ID'}:</span>
                      <span className="truncate font-mono text-[10px]">{context.userId}</span>
                    </div>
                  )}
                  {context.logRocketSessionUrl && (
                    <div className={cn(
                      'flex items-center gap-1 mt-1',
                      'text-neo-cyan'
                    )}>
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-[10px]">{t('bugReport.sessionRecorded') || 'Session recording attached'}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 px-4 py-3 rounded-neo border-3 border-neo-black font-bold uppercase text-sm',
                  'shadow-hard transition-all',
                  'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0',
                  isDarkMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-neo-black'
                )}
              >
                {t('bugReport.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting || !context}
                className={cn(
                  'flex-1 px-4 py-3 rounded-neo border-3 border-neo-black font-bold uppercase text-sm',
                  'shadow-hard transition-all',
                  'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0',
                  'bg-neo-lime text-neo-black',
                  'flex items-center justify-center gap-2'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('bugReport.submitting') || 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('bugReport.submit') || 'Submit'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

BugReportModal.displayName = 'BugReportModal';

export default BugReportModal;
