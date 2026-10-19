'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Real, server-gated count of teachers running live games. Renders nothing unless the server says it is worth showing. */
export function TeacherProofLine() {
  const { t } = useLanguage();
  const [proof, setProof] = useState<{ teachers: number; games: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/education/social-proof');
        const j = r.ok ? await r.json() : null;
        if (!cancelled && j?.show === true && Number.isFinite(j.teachers) && Number.isFinite(j.games)) {
          setProof({ teachers: j.teachers, games: j.games });
        }
      } catch {
        /* social proof is optional: any failure means no line */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!proof) return null;
  return (
    <p data-testid="teacher-proof" className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-bold text-neo-white/85">
      <Users className="h-4 w-4 shrink-0 text-neo-lime" aria-hidden />
      {t('eduPro.upgrade.socialProof', { teachers: proof.teachers, games: proof.games })}
    </p>
  );
}
