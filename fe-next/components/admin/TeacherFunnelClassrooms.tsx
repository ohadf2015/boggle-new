'use client';

import type { ClassroomRow } from '@/lib/education/teacherFunnel';

/** Consistent section chrome, so the panel reads as sections rather than a stack of blocks. */
export function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-neo border-neo border-black bg-neo-navy-light p-3">
      <h3 className="font-neo-display text-base font-black text-neo-white">{title}</h3>
      {hint && <p className="mt-1 font-neo-body text-xs text-neo-white/50">{hint}</p>}
      {children}
    </section>
  );
}

export function ClassroomsPanel({
  classrooms,
  t,
}: {
  classrooms: ClassroomRow[];
  t: (k: string, v?: Record<string, string> | string) => string;
}) {
  return (
    <Block
      title={`${t('admin.teacherFunnel.classrooms.title', 'Classrooms that exist')} (${classrooms.length})`}
      hint={t(
        'admin.teacherFunnel.classrooms.subtitle',
        'Every classroom in the database, newest first — its name and who opened it.',
      )}
    >
      {classrooms.length === 0 ? (
        <p className="mt-3 font-neo-body text-sm text-neo-white/50">
          {t('admin.teacherFunnel.classrooms.empty', 'No classroom has ever been opened.')}
        </p>
      ) : (
        // Wide table on a narrow phone: scroll the table, never the page.
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-neo-body text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase text-neo-white/50">
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.name', 'Classroom')}</th>
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.teacher', 'Opened by')}</th>
                <th className="py-1 pe-3 text-right">
                  {t('admin.teacherFunnel.classrooms.students', 'Students')}
                </th>
                <th className="py-1 pe-3">{t('admin.teacherFunnel.classrooms.created', 'Created')}</th>
              </tr>
            </thead>
            <tbody className="text-neo-white">
              {classrooms.map((c) => (
                <tr key={c.id} className="border-t border-neo-white/10 align-top">
                  <td className="py-2 pe-3">
                    <span className="font-bold">
                      {c.name ?? (
                        <span className="italic text-neo-white/40">
                          {t('admin.teacherFunnel.classrooms.unnamed', '(unnamed)')}
                        </span>
                      )}
                    </span>
                    <span className="ms-2 text-[11px] text-neo-white/40">
                      {[c.language, c.joinCode].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="py-2 pe-3">
                    {/* Never blank: name → email → raw id, in that order of usefulness. */}
                    <span>{c.teacherName ?? c.teacherEmail ?? c.teacherId ?? '—'}</span>
                    {c.teacherName && c.teacherEmail && (
                      <span className="ms-2 text-[11px] text-neo-white/40">{c.teacherEmail}</span>
                    )}
                    {!c.teacherIsApplicant && (
                      <span
                        className="ms-2 rounded-neo bg-neo-navy px-1.5 py-0.5 text-[10px] font-bold uppercase text-neo-white/60"
                        title={t(
                          'admin.teacherFunnel.classrooms.notApplicantHint',
                          'This owner never filled in the teacher access form, so they do not appear in the funnel table below.',
                        )}
                      >
                        {t('admin.teacherFunnel.classrooms.notApplicant', 'no access request')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pe-3 text-right tabular-nums">
                    <span className={c.students === 0 ? 'text-neo-orange' : 'text-neo-lime'}>
                      {c.students}
                    </span>
                  </td>
                  <td className="py-2 pe-3 whitespace-nowrap text-neo-white/70">
                    {c.createdAt ? c.createdAt.slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Block>
  );
}

