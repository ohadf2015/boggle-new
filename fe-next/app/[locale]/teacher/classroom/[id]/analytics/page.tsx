import { notFound, redirect } from 'next/navigation';
import { teacherResultsHref } from '@/lib/education/teacherResultsHref';
import { reportId, resolveReportTab } from '../../../reports/reportParams';

interface AnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The class report lives in Reports now; old links and bookmarks land on the same class there. */
export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const { locale, id } = await params;
  const query = await searchParams;
  const classroomId = reportId(id);
  if (!classroomId) notFound();
  const tab = resolveReportTab(first(query.section) ?? first(query.tab));
  redirect(teacherResultsHref(locale, classroomId, tab ?? undefined));
}
