'use client';

import { useCallback, useMemo, useState } from 'react';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import logger from '@/utils/logger';
import type { Language } from '@/types';
import { buildQuitDialogConfig, type TranslateFn } from './quitDialogConfig';

export interface UseHuntQuitFlowArgs {
  t: TranslateFn;
  practice: boolean;
  language: Language;
  isGameOver: boolean;
  showQuitConfirm: boolean;
  setShowQuitConfirm: (open: boolean) => void;
  onQuit: () => void;
  quitStaysOnPage: boolean;
}

/** The Word Hunt quit path: back-navigation guard, confirm dialog and the exit itself. */
export function useHuntQuitFlow({
  t,
  practice,
  language,
  isGameOver,
  showQuitConfirm,
  setShowQuitConfirm,
  onQuit,
  quitStaysOnPage,
}: UseHuntQuitFlowArgs) {
  // Disarm the navigation guard the instant the player confirms a quit, so its
  // beforeunload/popstate handlers don't fire during the exit nav (black-screen race).
  const [quitting, setQuitting] = useState(false);

  useNavigationGuard({
    enabled: !isGameOver && !quitting,
    // `leaving` tells the guard's teardown NOT to pop its phantom history entry:
    // confirming quit fires router.push('/daily') in the same handler, and a
    // go(-1) cleanup would race-cancel that push — black screen on native exit.
    // Quick Play's onQuit stays on this page instead, so it needs the phantom
    // popped (leaving=false) or every quit strands an extra history entry.
    leaving: quitting && !quitStaysOnPage,
    message: t('wordHunt.quitConfirmMessage'),
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false;
    },
  });

  // Quit-confirmation copy, resolved defensively. A locale bundle that resolves
  // one of these keys to a non-string would otherwise make React throw during
  // render — and on this nav-hidden, guard-armed surface that throw presents as
  // a black, frozen screen (the "exit Daily in Hebrew → black screen" report).
  // buildQuitDialogConfig never throws: broken keys degrade to a generic config.
  // In Quick Play (practice mode), use Word Hunt copy; in daily challenge use ad-gated copy.
  const quitDialogConfig = useMemo(() =>
    buildQuitDialogConfig(t, practice ? {
      titleKey: 'wordHunt.quitConfirmTitle',
      descriptionKey: 'wordHunt.quitConfirmMessage',
      confirmKey: 'daily.imSure',
      cancelKey: 'common.cancel',
    } : undefined),
    [t, practice]
  );

  const handleQuitConfirm = () => {
    // Close the dialog and disarm the guard FIRST and unconditionally, so its
    // teardown can't fire the history.go(-1) that blanks a Capacitor WebView.
    setShowQuitConfirm(false);
    setQuitting(true);
    try {
      onQuit();
    } catch (err) {
      // A throw in the exit bookkeeping (analytics/nav) must never strand the
      // player on a nav-hidden game screen. Force a hard navigation to the
      // daily hub as a last-resort escape hatch instead of freezing black.
      logger.error('Daily quit handler threw; forcing navigation to hub', err);
      if (typeof window !== 'undefined') {
        window.location.assign(`/${language}/daily`);
      }
    }
  };

  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, [setShowQuitConfirm]);

  const quitDialog = (
    <ConfirmationDialog
      open={showQuitConfirm}
      onOpenChange={(open) => setShowQuitConfirm(open)}
      title={quitDialogConfig.title}
      description={quitDialogConfig.description}
      confirmText={quitDialogConfig.confirmText}
      cancelText={quitDialogConfig.cancelText}
      onConfirm={handleQuitConfirm}
      variant="danger"
      analyticsId="daily_survival_quit_confirm"
      analyticsExtras={{ orientation: 'portrait' }}
    />
  );

  return { handleQuitClick, quitDialog };
}
