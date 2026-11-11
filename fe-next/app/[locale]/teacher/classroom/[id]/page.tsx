import ClassPageClient from './PageClient';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ClassroomPage({ params }: PageProps) {
  const { id } = await params;
  return <ClassPageClient classroomId={id} />;
}
