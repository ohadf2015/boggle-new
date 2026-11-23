'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { ProBadge } from '@/components/ui/ProBadge';

/** Marks a section Teacher Pro unlocked, for teachers who have it (paid, card or access trial), so they know what ends with the plan. */
export function ProPoweredChip({ className }: { className?: string }) {
  const { t } = useLanguage();
  const pro = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  if (pro.loading || !hasProAccess(pro, nowMs)) return null;
  return (
    <ProBadge
      data-testid="pro-powered-chip"
      label={t('eduShell.nav.pro')}
      title={t('teacher.proPowered.hint')}
      size="xs"
      className={className}
    />
  );
}
