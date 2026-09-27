import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher detail — Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminTeacherDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const { PageClient } = await import('./PageClient');
  return <PageClient userId={userId} />;
}
