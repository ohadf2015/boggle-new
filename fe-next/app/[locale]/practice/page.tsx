import PracticeHubClient from './PageClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PracticeHubPage({ params }: Props) {
  const { locale } = await params;
  return <PracticeHubClient locale={locale} />;
}
