import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string; code: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;

  // Dynamic OG image — social crawlers will see the challenge card
  // The actual player/score data is baked into the OG URL when the challenge is shared
  // For crawlers hitting the page directly, show a generic challenge invite
  const ogUrl = `${BASE_URL}/api/og/challenge?player=Challenger&score=0`;

  return {
    title: `LexiClash Challenge — Beat This Score!`,
    description: 'Someone challenged you to beat their score on LexiClash. Can you do it?',
    robots: { index: false, follow: false },
    openGraph: {
      title: 'Can You Beat This Score?',
      description: 'Someone challenged you to a word battle on LexiClash. Accept the challenge!',
      type: 'website',
      url: `${BASE_URL}/challenge/${code}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: 'LexiClash Challenge' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Can You Beat This Score?',
      description: 'Accept the LexiClash word challenge!',
      images: [ogUrl],
    },
  };
}
import ChallengePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function ChallengePage() {
  return <ChallengePageClient />;
}
