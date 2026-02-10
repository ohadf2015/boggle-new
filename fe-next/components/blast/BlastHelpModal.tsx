'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Gem, Bomb, Rainbow, Hand } from 'lucide-react';

interface BlastHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string | undefined;
}

/**
 * BlastHelpModal - Explains Blast mode mechanics and special tiles.
 */
export function BlastHelpModal({ open, onOpenChange, t }: BlastHelpModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm border-3 border-neo-black shadow-hard-lg bg-neo-navy text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black uppercase text-center text-neo-yellow">
            {t('blast.helpTitle') || 'How to Play'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-white/80 text-sm">
              {/* Drag instruction */}
              <div className="flex items-start gap-3">
                <Hand className="w-5 h-5 text-neo-cyan shrink-0 mt-0.5" />
                <p>{t('blast.helpDrag') || 'Drag across letters to form words. Words must be at least 2 letters long.'}</p>
              </div>

              {/* Special tiles */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-yellow-300 to-amber-500 border border-yellow-600 shrink-0 flex items-center justify-center">
                    <Gem className="w-3 h-3 text-yellow-900" />
                  </div>
                  <p><span className="font-bold text-yellow-400">{t('blast.helpGoldLabel') || 'Gold'}</span> — {t('blast.helpGold') || '3x score multiplier for the word.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-red-500 to-red-800 border border-red-600 shrink-0 flex items-center justify-center">
                    <Bomb className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-red-400">{t('blast.helpBombLabel') || 'Bomb'}</span> — {t('blast.helpBomb') || 'Clears all 8 surrounding tiles.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 border border-purple-500 shrink-0 flex items-center justify-center">
                    <Rainbow className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-purple-400">{t('blast.helpRainbowLabel') || 'Rainbow'}</span> — {t('blast.helpRainbow') || '+5 bonus points.'}</p>
                </div>
              </div>

              {/* Goal */}
              <p className="text-white/60 text-xs border-t border-white/10 pt-3">
                {t('blast.helpGoal') || 'Clear as many tiles as possible for the highest score!'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full bg-neo-yellow text-neo-black font-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard">
            {t('common.gotIt') || 'Got it!'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
