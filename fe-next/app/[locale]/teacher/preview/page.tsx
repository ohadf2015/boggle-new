import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TeacherHomePreview, type TeacherHomePreviewState } from '@/components/teacher/home/TeacherHomePreview';
import { TeacherProBannersPreview } from '@/components/teacher/home/TeacherProBannersPreview';

const STATES: readonly TeacherHomePreviewState[] = ['classes', 'empty', 'loading'];

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TeacherHomePreviewPage({ searchParams }: { searchParams: Promise<{ state?: string; banner?: string; v?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state, banner, v } = await searchParams;
  if (state === 'pro') return <TeacherProBannersPreview />;
  if (state?.startsWith('edu-')) {
    const { EduPreview } = await import('./_edu/EduPreview');
    return <EduPreview state={state} v={v} />;
  }
  const picked = STATES.find((s) => s === state) ?? 'classes';
  return <TeacherHomePreview state={picked} banner={banner} />;
}
