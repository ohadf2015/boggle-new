'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

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
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-neo-black/80 z-[60]" />
        <AlertDialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md p-6 bg-neo-navy border-neo border-neo-black shadow-hard-lg z-[60]',
            'rounded-neo'
          )}
        >
          <AlertDialog.Title className="text-2xl font-neo-display text-neo-white mb-2 text-balance">
            {t('teacher.lesson.resumeDraft')}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-neo-white mb-6 text-pretty">
            {t('teacher.lesson.draftFound', { time: formattedAge })}
          </AlertDialog.Description>

          <div className="flex gap-3">
            <AlertDialog.Action asChild>
              <Button
                onClick={onRestore}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                {t('teacher.lesson.resumeDraftButton')}
              </Button>
            </AlertDialog.Action>
            <AlertDialog.Cancel asChild>
              <Button
                onClick={onDiscard}
                variant="outline"
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('teacher.lesson.discardDraftButton')}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
