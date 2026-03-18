'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from '@/components/ui/Mascot';
import type { MascotVariant } from '@/components/ui/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EncouragementTrigger } from '@/hooks/useFirstTimeEncouragement';

interface FirstTimeEncouragementProps {
  trigger: EncouragementTrigger;
  onDismiss?: () => void;
}

const TRIGGER_CONFIG: Record<EncouragementTrigger, { mascot: MascotVariant; key: string }> = {
  'game-start': { mascot: 'gaming', key: 'encouragement.gameStart' },
  'first-word': { mascot: 'encouraging', key: 'encouragement.firstWord' },
  'long-word': { mascot: 'celebration', key: 'encouragement.longWord' },
  'combo': { mascot: 'onfire', key: 'encouragement.combo' },
  'halfway': { mascot: 'encouraging', key: 'encouragement.halfway' },
  'almost-done': { mascot: 'encouraging', key: 'encouragement.almostDone' },
};

export default function FirstTimeEncouragement({ trigger, onDismiss }: FirstTimeEncouragementProps) {
  const { t } = useLanguage();
  const config = TRIGGER_CONFIG[trigger];

  return (
    <AnimatePresence>
      <motion.div
        key={trigger}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-neo-cream border-2 border-neo-black rounded-neo shadow-hard-sm max-h-12 overflow-hidden"
        role="status"
        aria-live="polite"
        onClick={onDismiss}
      >
        <Mascot variant={config.mascot} size="xs" className="shrink-0 !w-8 !h-8" />
        <span className="text-neo-black text-sm font-neo-body font-medium truncate">
          {t(config.key)}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
