import { notFound } from 'next/navigation';
import { TeacherHomePreview, type TeacherHomePreviewState } from '@/components/teacher/home/TeacherHomePreview';
import { TeacherProBannersPreview } from '@/components/teacher/home/TeacherProBannersPreview';

const STATES: readonly TeacherHomePreviewState[] = ['classes', 'empty', 'loading'];

export default async function TeacherHomePreviewPage({ searchParams }: { searchParams: Promise<{ state?: string; banner?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state, banner } = await searchParams;
  if (state === 'pro') return <TeacherProBannersPreview />;
  const picked = STATES.find((s) => s === state) ?? 'classes';
  return <TeacherHomePreview state={picked} banner={banner} />;
}
