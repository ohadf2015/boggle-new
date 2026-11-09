'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import type { Language } from '@/types';

interface DailyBoardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
}

/** Rows the sheet can show before "show more" — the whole board on a normal day. */
const FULL_BOARD_ROWS = 100;

/**
 * Today's full daily board, opened in place over the hub.
 *
 * "Full leaderboard" used to navigate to the Word Hunt page with
 * `?showLeaderboard=true`: that page booted the hunt, opened its how-to-play
 * tutorial over everything, and showed the board below a create-a-puzzle pitch
 * with only five rows. The board is the whole day's (every mode), so it now
 * opens right here, full height, with your own row pinned when off screen.
 */
export function DailyBoardSheet({ open, onOpenChange, language }: DailyBoardSheetProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [guestFp, setGuestFp] = useState<string | null>(null);

  useEffect(() => {
    if (!open || user) return;
    let cancelled = false;
    getGuestFingerprint()
      .then((fp) => !cancelled && setGuestFp(fp || null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noDescription
        closeButtonLabel={t('common.close')}
        data-testid="daily-board-sheet"
        className="h-[92dvh] max-h-[92dvh] w-[calc(100%-1rem)] content-start bg-neo-navy p-2 pt-12 sm:p-4 sm:pt-14"
      >
        <DialogTitle className="sr-only">{t('daily.fullStandings')}</DialogTitle>
        {open && (
          <TabbedDailyLeaderboard
            puzzleDate={getDailyChallengeDate()}
            language={language}
            currentPlayerId={user?.id ?? null}
            currentGuestFingerprint={user ? null : guestFp}
            maxVisible={FULL_BOARD_ROWS}
            t={t as never}
            defaultTab="today"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
