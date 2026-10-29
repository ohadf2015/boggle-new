'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { Language } from '@/lib/supabase/education/types';
import { useThemedPacks } from '@/components/teacher/StarterPacksSection.data';
import { SessionTemplatesSection } from '@/components/teacher/StarterPacksSection.sessions';

type T = (key: string, params?: Record<string, string | number>) => string;

export function HomeSessionAll({ open, onOpenChange, language, classroomId, t }: { open: boolean; onOpenChange: (open: boolean) => void; language: Language; classroomId: string; t: T }) {
  const packs = useThemedPacks(language);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="home-session-all" className="max-h-[90dvh] overflow-auto border-[3px] border-neo-cream bg-neo-navy sm:max-w-5xl">
        <DialogTitle className="sr-only">{t('education.starterPacks.sessions.title')}</DialogTitle>
        <div className="@container">
          <SessionTemplatesSection language={language} packs={packs} classroomId={classroomId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HomeSessionAll;
