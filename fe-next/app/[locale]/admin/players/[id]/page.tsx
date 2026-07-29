import PlayerDetailPageClient from './PageClient';

interface RouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PlayerDetailPage({ params }: RouteProps) {
  const { id } = await params;
  return <PlayerDetailPageClient playerId={id} />;
}
