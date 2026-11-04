import DeleteClassPageClient from './PageClient';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

/** Class page. The delete-account interstitial deep-links here for a one-class teacher. */
export default async function ClassroomPage({ params }: PageProps) {
  const { id } = await params;
  return <DeleteClassPageClient classroomId={id} />;
}
