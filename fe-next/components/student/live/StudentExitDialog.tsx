'use client';

import { useCallback, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { trackModalInteraction } from '@/utils/growthTracking';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface StudentExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: Translate;
  /** Same funnel id as the shared exit dialog, so classroom students stay in it. */
  analyticsId?: string;
}

/** The classroom student's "leave?" — the host's dark surface, with student copy. */
export function StudentExitDialog({ open, onOpenChange, onConfirm, t, analyticsId }: StudentExitDialogProps) {
  const wasOpen = useRef(false);
  const confirmed = useRef(false);

  useEffect(() => {
    if (analyticsId && !wasOpen.current && open) {
      confirmed.current = false;
      trackModalInteraction(analyticsId, 'shown', undefined);
    } else if (analyticsId && wasOpen.current && !open && !confirmed.current) {
      trackModalInteraction(analyticsId, 'dismissed', undefined);
    }
    wasOpen.current = open;
  }, [open, analyticsId]);

  const handleConfirm = useCallback(() => {
    if (analyticsId) {
      confirmed.current = true;
      trackModalInteraction(analyticsId, 'confirmed', undefined);
    }
    onConfirm();
  }, [analyticsId, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-neo border-[3px] border-neo-cream bg-neo-navy-light text-neo-white shadow-hard-lg">
        <AlertDialogHeader className="items-center text-center">
          <span
            aria-hidden="true"
            className="mb-1 flex size-12 -rotate-6 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-red shadow-hard-sm"
          >
            <LogOut className="size-6 text-neo-black rtl:scale-x-[-1]" strokeWidth={2.75} />
          </span>
          <AlertDialogTitle className="font-neo-display text-xl font-black text-neo-white">
            {t('eduStudent.exit.title')}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-neo-body font-bold text-neo-white/75">
            {t('eduStudent.exit.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogCancel className="m-0 h-12 w-full rounded-neo border-[3px] border-neo-black bg-neo-lime font-neo-display text-lg font-black uppercase text-neo-black shadow-hard hover:bg-neo-lime active:translate-y-0.5 active:shadow-none">
            {t('eduStudent.exit.stay')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="m-0 h-11 w-full rounded-neo border-[3px] border-neo-black bg-neo-red font-neo-display font-black uppercase text-neo-cream shadow-hard-sm hover:bg-neo-red active:translate-y-0.5 active:shadow-none"
          >
            {t('eduStudent.exit.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default StudentExitDialog;
