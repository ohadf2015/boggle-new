/**
 * Take-home practice card, behind one disclosure — for BOTH sides.
 *
 * The printable card is the parent-facing artifact the WhatsApp share points
 * at, so it stays. It used to render OPEN for the teacher, and that cost round
 * 5: at 1440x900 it pushed the document to 1294px and left its own last
 * control ("Start unplugged reteach Live") below the fold — which is also a
 * second CTA cluster under the screen's one primary action, which the
 * decision-fatigue rule forbids. Closed by default it is neither.
 *
 * Hand-rolled rather than `components/ui/Collapsible` because that component
 * exposes no hook for the test id or for the exact cream-on-navy edge this
 * surface needs to clear the 3:1 control rule.
 *
 * ONE root element with the classes it had inline: on the teacher's desktop
 * layout this is a direct child of the parent's `lg:grid lg:grid-cols-2`, and a
 * Fragment or an extra wrapper here re-flows that grid — the exact shape of the
 * overflow this file exists to prevent.
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MissGapPracticeCard } from '@/components/education/MissGapPracticeCard';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

export interface MissGapTakeHomeDisclosureProps {
  payload: MissGapAssignmentPayload;
}

export function MissGapTakeHomeDisclosure({ payload }: MissGapTakeHomeDisclosureProps) {
  const { t } = useLanguage();
  const [showTakeHome, setShowTakeHome] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        data-testid="miss-gap-takehome-toggle"
        aria-expanded={showTakeHome}
        onClick={() => setShowTakeHome((open) => !open)}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold',
          'bg-neo-navy text-neo-cream border-[3px] border-neo-cream rounded-neo',
          'transition-transform active:translate-x-[2px] active:translate-y-[2px]',
        )}
      >
        <ClipboardList className="w-4 h-4" aria-hidden />
        {t('education.homework.takeHomeToggle')}
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', showTakeHome && 'rotate-180')}
          aria-hidden
        />
      </button>
      {showTakeHome ? (
        <div className="mt-3">
          <MissGapPracticeCard payload={payload} />
        </div>
      ) : null}
    </div>
  );
}
