'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlobalLeaderboard, type LeaderboardEntry } from './GlobalLeaderboard';

interface LeaderboardModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Fingerprint to highlight (current user) */
  highlightFingerprint?: string | null;
  /** Limit number of entries */
  limit?: number;
}

/**
 * LeaderboardModal - Modal wrapper for displaying the global leaderboard
 * Uses the neo-brutalist Dialog component for consistent styling
 */
export function LeaderboardModal({
  open,
  onOpenChange,
  highlightFingerprint,
  limit = 50,
}: LeaderboardModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md md:max-w-lg"
        noDescription
      >
        <DialogHeader
          variant="gradient"
          customBg="bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime"
        >
          <DialogTitle className="flex items-center justify-center gap-3">
            <Trophy className="w-7 h-7" />
            {t('leaderboard.title') || 'Global Leaderboard'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] overflow-y-auto">
          <GlobalLeaderboard
            limit={limit}
            highlightFingerprint={highlightFingerprint}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default LeaderboardModal;
