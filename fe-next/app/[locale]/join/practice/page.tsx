import type { Metadata } from 'next';
import { starterPracticePack } from '@/components/education/join/starterPracticePack';
import { GuestPracticeClient } from './PracticeClient';

const TITLES: Record<string, string> = {
  en: 'Practice round — LexiClash',
  he: 'סבב תרגול — LexiClash',
  es: 'Ronda de práctica — LexiClash',
  sv: 'Övningsrunda — LexiClash',
  ja: 'れんしゅうラウンド — LexiClash',
  ru: 'Тренировочный раунд — LexiClash',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: TITLES[locale] ?? TITLES.en, robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <GuestPracticeClient locale={locale} pack={starterPracticePack(locale)} />;
}
