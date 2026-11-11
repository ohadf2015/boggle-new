import type { TeacherLocale } from '@/lib/education/types';
import type { LifecycleStage, NudgeClassroom } from '@/lib/education/lifecycleNudges';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { EMAIL_SITE, renderNeoEmail, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { TEACHER_EMAIL_REPLY_TO, firstName, teacherEmailUrl } from './teacherEmailLayout';
import { LIFECYCLE_COPY, LIFECYCLE_LOOK } from './teacherLifecycleNudge.copy';

export type LifecycleEmailStage = LifecycleStage | 'reactivate';

interface Args {
  fullName: string;
  locale: TeacherLocale;
  stage: LifecycleEmailStage;
  /** The class to open (share_code, start_live). Without it the button goes to teacher home. */
  classroom?: NudgeClassroom | null;
}

const SITE_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function ctaUrl(locale: TeacherLocale, stage: LifecycleEmailStage, classroom?: NudgeClassroom | null): string {
  const campaign = `edu_${stage}`;
  if (stage === 'reactivate') return teacherEmailUrl(locale, '/teacher/classroom/new', campaign);
  if (!classroom) return teacherEmailUrl(locale, '/teacher', campaign);
  return teacherEmailUrl(locale, '/teacher/classroom/new', campaign, { classroomId: classroom.id });
}

/** Students land in the class's language, the teacher's as fallback (same rule as the in-app invite). */
function joinUrl(locale: TeacherLocale, classroom: NudgeClassroom): string {
  const lang = classroom.language && SITE_LOCALES.includes(classroom.language) ? classroom.language : locale;
  return `${EMAIL_SITE}/${lang}/join/${encodeURIComponent(classroom.joinCode)}`;
}

export function teacherLifecycleNudge({ fullName, locale, stage, classroom }: Args) {
  const copy = (key: string) => translateKey(`teacherLifecycleEmail.${key}`, locale);
  const look = LIFECYCLE_COPY[locale] ?? LIFECYCLE_COPY.en;
  const showCode = stage === 'share_code' && classroom;
  const blocks: NeoBlock[] = [
    { type: 'p', text: copy(`${stage}.lead`), strong: true },
    { type: 'p', text: copy(`${stage}.body`) },
    ...(showCode
      ? [
          { type: 'p' as const, text: copy('codeLabel'), strong: true },
          { type: 'tiles' as const, word: classroom.joinCode },
          { type: 'callout' as const, title: copy('linkLabel'), text: joinUrl(locale, classroom) },
        ]
      : []),
    { type: 'p', text: copy('ask') },
  ];

  const html = renderNeoEmail({
    lang: locale,
    dir: locale === 'he' ? 'rtl' : 'ltr',
    preheader: look.stages[stage].preheader,
    ...LIFECYCLE_LOOK[stage],
    kicker: look.kicker,
    headline: look.stages[stage].headline,
    greeting: copy('greeting').replace('{name}', firstName(fullName) || fullName),
    blocks,
    cta: { label: copy(`${stage}.cta`), href: ctaUrl(locale, stage, classroom) },
    signoff: look.signoff,
    footnote: look.footnote,
  });

  return { subject: copy(`${stage}.subject`), html, replyTo: TEACHER_EMAIL_REPLY_TO };
}
