import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { autoJoinSignedInStudent } from '@/lib/education/runSignedInJoin';
import { JoinCodePageClient } from './PageClient';
import { JoinFrameFallback } from '@/components/education/join/JoinFrameFallback';

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

export const dynamic = 'force-dynamic';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // `?code=` / `?pin=` is how the projector share sheet arrives. A signed-in
  // student is enrolled before the form paints; a guest still sees the form.
  // `useSearchParams` needs a Suspense boundary or `next build` refuses to
  // prerender this route. The fallback is the page's own navy, not a spinner.
  const { locale } = await params;
  const query = await searchParams;
  const code = firstParam(query.code) || firstParam(query.pin);
  const href = await autoJoinSignedInStudent(locale, code);
  if (href) redirect(href);
  return (
    <Suspense fallback={<JoinFrameFallback />}>
      <JoinCodePageClient />
    </Suspense>
  );
}
