import type { Metadata } from 'next';
import ConnectionsPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isHe = locale === 'he';
  return {
    title: isHe ? 'שרשרת מילים — מצא את המילה המקשרת | LexiClash' : 'Word Chain — Find the Bridge Word | LexiClash',
    description: isHe
      ? 'מצא את המילה שמחברת בין שתי מילים — משחק מילים ייחודי ומאתגר בעברית'
      : 'Find the word that bridges two words together — a unique word chain puzzle game',
    robots: { index: false },
  };
}

export default function ConnectionsPage() {
  return <ConnectionsPageClient />;
}
