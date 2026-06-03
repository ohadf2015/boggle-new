'use client';

/**
 * Families Policy — online-safety reminder.
 *
 * Shown BEFORE a user first exchanges freeform media/information (opening chat,
 * first DM). Required by the Families "Social Apps & Features" policy: remind
 * the user to be safe online and aware of the real-world risk of interacting
 * with others. Acknowledgement is persisted so it shows once.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface SafetyReminderModalProps {
  isOpen: boolean;
  /** Called when the user acknowledges — caller should persist + proceed. */
  onAcknowledge: () => void;
  /** Optional cancel (e.g. user backs out of opening chat). */
  onClose?: () => void;
}

export function SafetyReminderModal({ isOpen, onAcknowledge, onClose }: SafetyReminderModalProps) {
  const { t } = useLanguage();

  const points = [
    t('familiesSafety.tipNoPersonalInfo'),
    t('familiesSafety.tipStrangers'),
    t('familiesSafety.tipReport'),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('familiesSafety.reminderTitle')}</DialogTitle>
          <DialogDescription>{t('familiesSafety.reminderIntro')}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="space-y-2 text-sm font-neo-body text-neo-cream">
            {points.map((point, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-neo-cyan">
                  •
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onAcknowledge} variant="cyan" className="w-full">
            {t('familiesSafety.reminderConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SafetyReminderModal;
