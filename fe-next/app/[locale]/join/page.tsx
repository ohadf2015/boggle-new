import type { Metadata } from 'next';
import { JoinCodePageClient } from './PageClient';

const META: Record<string, { title: string; description: string }> = {
  en: { title: 'Join a Game — LexiClash', description: 'Enter your game or class code to join a LexiClash room.' },
  he: { title: 'הצטרפות למשחק — LexiClash', description: 'הזינו את קוד המשחק או הכיתה כדי להצטרף לחדר בלקסיקלאש.' },
  sv: { title: 'Gå med i ett spel — LexiClash', description: 'Ange din spel- eller klasskod för att gå med i ett LexiClash-rum.' },
  ja: { title: 'ゲームに参加 — LexiClash', description: 'ゲームコードまたはクラスコードを入力して、LexiClash のルームに参加しましょう。' },
  es: { title: 'Unirse a una partida — LexiClash', description: 'Introduce tu código de partida o de clase para entrar a una sala de LexiClash.' },
  ru: { title: 'Присоединиться к игре — LexiClash', description: 'Введите код игры или класса, чтобы войти в комнату LexiClash.' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = META[locale] || META.en;
  // A code-entry form carries no content value for the crawl sample, same call
  // as /education/access.
  return { title: m.title, description: m.description, robots: { index: false, follow: true } };
}

export default function Page() {
  return <JoinCodePageClient />;
}
