import { LogIn } from 'lucide-react';
import type { Translate } from './previewLabels';

interface PreviewJoinScreenProps {
  t: Translate;
  joinCode: string;
}

/**
 * Static look-alike of JoinClassroomForm: no inputs, no network, no router.
 * The "inputs" are plain boxes so the modal's focus trap never lands inside
 * a fake form.
 */
export function PreviewJoinScreen({ t, joinCode }: PreviewJoinScreenProps) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
        <h3 className="mb-1 font-neo-display text-lg font-black uppercase text-neo-white">
          {t('education.student.join.title')}
        </h3>
        <p className="mb-4 text-xs text-neo-white/80">{t('education.student.join.subtitle')}</p>

        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-neo-white">
              {t('education.student.join.nameLabel')}
            </p>
            <div className="h-11 rounded-neo border-2 border-neo-white/20 bg-neo-navy/60 px-3 text-sm font-bold leading-[2.6rem] text-neo-white/50">
              {t('education.student.join.namePlaceholder')}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-bold uppercase text-neo-white">
              {t('education.student.join.codeLabel')}
            </p>
            <div
              data-testid="student-preview-join-code"
              dir="ltr"
              className="h-12 rounded-neo border-2 border-neo-cyan bg-neo-navy/60 text-center font-mono text-xl font-black uppercase leading-[2.9rem] tracking-[0.3em] text-neo-white"
            >
              {joinCode}
            </div>
          </div>

          <div className="flex h-11 items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cyan font-neo-display text-sm font-black uppercase text-neo-black shadow-hard">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t('education.student.join.button')}
          </div>
        </div>
      </div>
    </div>
  );
}
