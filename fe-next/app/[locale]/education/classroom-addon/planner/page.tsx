/**
 * Google Classroom Marketplace — conversational planner iframe.
 *
 * Teacher plain-language prompt → Classic / Team Unplugged or reteach Live +
 * grade passback. Foils Discovery Education Gemini conversational Classroom.
 * noindex — tool route, not SEO. CSP frame-ancestors allows classroom.google.com.
 */

import type { Metadata } from 'next';
import { ClassroomAddonPlanner } from '@/components/education/ClassroomAddonPlanner';
import {
  parseClassGapShareParams,
  searchRecordToParams,
} from '@/lib/education/classGapShare';
import { classroomAddonContentSecurityPolicy } from '@/lib/education/googleClassroomAddon';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'LexiClash — Classroom conversational planner',
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/education/classroom-addon/planner`,
    },
    other: {
      'Content-Security-Policy': classroomAddonContentSecurityPolicy(),
    },
  };
}

export default async function ClassroomAddonPlannerPage(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  const payload = parseClassGapShareParams(sp);

  const context = {
    courseId: first(query.courseId),
    itemId: first(query.itemId),
    itemType: first(query.itemType),
    addOnToken: first(query.addOnToken),
    attachmentId: first(query.attachmentId),
    login_hint: first(query.login_hint),
  };

  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      data-testid="classroom-addon-planner-page"
    >
      <ClassroomAddonPlanner
        locale={payload.locale}
        initialPrompt={first(query.prompt) || ''}
        initialMissedWords={payload.missedWords}
        initialLesson={payload.lesson}
        context={context}
      />
    </main>
  );
}
