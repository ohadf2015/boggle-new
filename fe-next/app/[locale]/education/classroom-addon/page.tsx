/**
 * Google Classroom Marketplace — Attachment Discovery.
 *
 * Registered as attachmentDiscoveryUri. Classroom iframes this with courseId /
 * itemId / itemType / addOnToken. noindex — tool route, not SEO.
 * CSP frame-ancestors allows classroom.google.com (see next.config.mjs).
 */

import type { Metadata } from 'next';
import { ClassroomAddonDiscovery } from '@/components/education/ClassroomAddonDiscovery';
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
    title: 'LexiClash — Classroom Marketplace add-on',
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/education/classroom-addon`,
    },
    other: {
      'Content-Security-Policy': classroomAddonContentSecurityPolicy(),
    },
  };
}

export default async function ClassroomAddonDiscoveryPage(props: PageProps) {
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
      data-testid="classroom-addon-discovery-page"
    >
      <ClassroomAddonDiscovery
        locale={payload.locale}
        initialMissedWords={payload.missedWords}
        initialLesson={payload.lesson}
        context={context}
      />
    </main>
  );
}
