import type { Metadata } from 'next';
import JoinWithCodePageClient from './PageClient';

const BASE_URL = 'https://www.lexiclash.live';

// Russian ships no OG art of its own; the English card is the deliberate fallback.
const OG_IMAGES: Record<string, string> = {
  he: `${BASE_URL}/og-image-he.webp`,
  en: `${BASE_URL}/og-image-en.webp`,
  sv: `${BASE_URL}/og-image-sv.webp`,
  ja: `${BASE_URL}/og-image-ja.webp`,
  es: `${BASE_URL}/og-image-es.webp`,
};

/**
 * A join link is pasted into a class group chat, and the chat renders this.
 *
 * The `/join` sibling has carried a per-locale map for a while; this route —
 * the one the projector's QR actually points at — still answered in English to
 * a Hebrew class. It is `noindex`, so none of this is for a crawler: it is the
 * line thirty students read on the unfurl before they decide to tap.
 *
 * `{code}` is interpolated into every title because the code is the one thing
 * a student cross-checks against the board before tapping.
 */
const META: Record<string, { title: (code: string) => string; description: string }> = {
  en: {
    title: (code) => `Join Word Battle ${code} | LexiClash`,
    description: "You've been invited to a real-time word battle! Tap to join and play with your class.",
  },
  he: {
    title: (code) => `הצטרפות לקרב מילים ${code} | LexiClash`,
    description: 'הוזמנתם לקרב מילים בזמן אמת! לחצו כדי להצטרף ולשחק עם הכיתה.',
  },
  sv: {
    title: (code) => `Gå med i ordkampen ${code} | LexiClash`,
    description: 'Du är inbjuden till en ordkamp i realtid! Tryck för att gå med och spela med klassen.',
  },
  ja: {
    title: (code) => `ワードバトル ${code} に参加 | LexiClash`,
    description: 'リアルタイムのワードバトルへの招待です。タップして参加し、クラスのみんなと対戦しましょう。',
  },
  es: {
    title: (code) => `Unirse a la batalla de palabras ${code} | LexiClash`,
    description: '¡Te han invitado a una batalla de palabras en tiempo real! Toca para entrar y jugar con tu clase.',
  },
  ru: {
    title: (code) => `Присоединиться к битве слов ${code} | LexiClash`,
    description: 'Вас пригласили в битву слов в реальном времени! Нажмите, чтобы войти и сыграть со своим классом.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const ogImage = OG_IMAGES[locale] || OG_IMAGES.en;
  const m = META[locale] || META.en;
  const title = m.title(code);

  return {
    title,
    description: m.description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/${locale}/join/${code}`,
      title,
      description: m.description,
      siteName: 'LexiClash',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'LexiClash - Join Multiplayer Word Battle' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: m.description,
      images: [ogImage],
    },
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default function JoinWithCodePage() {
  return <JoinWithCodePageClient />;
}
