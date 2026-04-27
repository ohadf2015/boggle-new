'use client';

import { useRouter } from 'next/navigation';
import { Trophy, Calendar, Swords } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { trackModeSelected } from '@/utils/growthTracking';

export interface PracticeCompletionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  t: (key: string) => string | undefined;
}

const tx = (t: PracticeCompletionPopupProps['t'], key: string, fallback: string): string => {
  const value = t(key);
  return value && value !== key ? value : fallback;
};

export function PracticeCompletionPopup({
  open,
  onOpenChange,
  language,
  t,
}: PracticeCompletionPopupProps) {
  const router = useRouter();

  const goTo = (mode: 'daily' | 'quickPlay', href: string) => {
    onOpenChange(false);
    trackModeSelected(mode, 'practice_completion');
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <AdaptiveMotion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12 }}
              className="w-16 h-16 rounded-full bg-neo-yellow border-3 border-neo-black shadow-hard flex items-center justify-center"
            >
              <Trophy className="w-9 h-9 text-neo-black" />
            </AdaptiveMotion.div>
          </div>
          <DialogTitle className="text-2xl font-black uppercase text-center">
            {tx(t, 'training.completion.title', 'Nailed it!')}
          </DialogTitle>
          <p className="text-center text-sm text-neo-black/70 dark:text-neo-white/70 font-medium mt-1">
            {tx(t, 'training.completion.message', "You've got the moves! Ready for real competition?")}
          </p>
        </DialogHeader>

        <div className="px-2 pt-2">
          <p className="text-center font-bold uppercase tracking-wide text-xs text-neo-black/60 dark:text-neo-white/60 mb-3">
            {tx(t, 'training.completion.nextChallenge', "What's next?")}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:gap-2">
          <Button
            variant="success"
            onClick={() => goTo('daily', `/${language}/daily`)}
            className="w-full min-h-[52px] font-bold gap-2"
            data-testid="practice-completion-daily"
          >
            <Calendar className="w-5 h-5" />
            {tx(t, 'training.completion.tryDaily', "Try today's daily")}
          </Button>
          <Button
            variant="outline"
            onClick={() => goTo('quickPlay', `/${language}/multiplayer?quickPlay=true`)}
            className="w-full min-h-[48px] font-bold gap-2"
            data-testid="practice-completion-quickplay"
          >
            <Swords className="w-5 h-5" />
            {tx(t, 'training.completion.tryQuickMatch', 'Battle a bot')}
          </Button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-sm font-bold uppercase tracking-wide text-neo-black/60 dark:text-neo-white/60 hover:text-neo-black dark:hover:text-neo-white pt-1 pb-2"
            data-testid="practice-completion-keep-practicing"
          >
            {tx(t, 'training.completion.continuePractice', 'Keep Practicing')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PracticeCompletionPopup;
