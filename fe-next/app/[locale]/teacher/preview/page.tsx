import { notFound } from 'next/navigation';
import { TeacherHomePreview, type TeacherHomePreviewState } from '@/components/teacher/home/TeacherHomePreview';

const STATES: readonly TeacherHomePreviewState[] = ['classes', 'empty', 'loading'];

export default async function TeacherHomePreviewPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { state } = await searchParams;
  const picked = STATES.find((s) => s === state) ?? 'classes';
  return <TeacherHomePreview state={picked} />;
}
