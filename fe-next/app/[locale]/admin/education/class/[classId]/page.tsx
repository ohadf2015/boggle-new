import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Class detail — Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ classId: string }>;
}

export default async function AdminClassDetailPage({ params }: PageProps) {
  const { classId } = await params;
  const { PageClient } = await import('./PageClient');
  return <PageClient classId={classId} />;
}
