import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'משחק מילים מרובה משתתפים בעברית - כמו בוגל, סקראבל ווורדל אונליין | לקסיקלאש',
  description: 'אוהבים בוגל, סקראבל או וורדל? לקסיקלאש הוא משחק מילים מרובה משתתפים בעברית! צרו חדר, שלחו לינק לחברים והתחרו בזמן אמת. 10,000+ מילים בעברית, ללא הרשמה, חינם לגמרי. מושלם לערבי משפחה, מסיבות וגיבוש צוותי. פותח באהבה בישראל 🇮🇱',
  keywords: 'משחק מילים מרובה משתתפים, משחק מילים בעברית, וורדל בעברית, סקראבל אונליין, בוגל אונליין, משחק כמו וורדל, משחק כמו סקראבל, משחק כמו בוגל, תפזורת אונליין, ראזל בעברית, משחק מילים אונליין, משחק מילים בזמן אמת, קרב מילים, משחק מילים לחברים, משחק מילים למסיבות, משחק מילים ישראלי, אליאס אונליין, משחק מילים חינם בעברית, משחק מילים ללא הורדה',
  openGraph: {
    title: 'משחק מילים כמו בוגל, סקראבל ווורדל - מרובה משתתפים בעברית | לקסיקלאש',
    description: 'אוהבים בוגל, סקראבל או וורדל? נסו לקסיקלאש - משחק מילים מרובה משתתפים בעברית! צרו חדר → שלחו לינק → התחרו בזמן אמת. חינם וללא הרשמה. 🇮🇱',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: 'https://www.lexiclash.live/og-image-he.jpg',
        width: 1200,
        height: 630,
        alt: 'לקסיקלאש - משחק מילים כמו בוגל וסקראבל בעברית',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'משחק מילים כמו בוגל, סקראבל ווורדל בעברית - לקסיקלאש',
    description: 'אוהבים בוגל, סקראבל או וורדל? נסו לקסיקלאש - משחק מילים מרובה משתתפים בעברית! צרו חדר, שלחו לינק והתחרו בזמן אמת. חינם! 🇮🇱',
    images: ['https://www.lexiclash.live/og-image-he.jpg'],
  },
  alternates: {
    canonical: 'https://www.lexiclash.live/he',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HebrewMultiplayerWordGamePage({ params }: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/multiplayer`);
}
