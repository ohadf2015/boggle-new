'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface LessonBuilderDraftPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: () => void;
  onDiscard: () => void;
  formattedAge: string;
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export default function LessonBuilderDraftPrompt({
  open,
  onOpenChange,
  onRestore,
  onDiscard,
  formattedAge,
  t,
}: LessonBuilderDraftPromptProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="z-[60]" />
        <AlertDialogContent
          className={cn(
            'w-full max-w-md p-6 bg-neo-navy border-neo border-neo-black shadow-hard-lg z-[60]',
            'rounded-neo'
          )}
        >
          <AlertDialogTitle className="text-2xl font-neo-display text-neo-white mb-2 text-balance">
            {t('teacher.lesson.resumeDraft')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-neo-white mb-6 text-pretty">
            {t('teacher.lesson.draftFound', { time: formattedAge })}
          </AlertDialogDescription>

          <div className="flex gap-3">
            <AlertDialogAction asChild>
              <Button
                onClick={onRestore}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                {t('teacher.lesson.resumeDraftButton')}
              </Button>
            </AlertDialogAction>
            <AlertDialogCancel asChild>
              <Button
                onClick={onDiscard}
                variant="outline"
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('teacher.lesson.discardDraftButton')}
              </Button>
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
