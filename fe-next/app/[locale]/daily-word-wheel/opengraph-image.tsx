import { renderLandingCard } from '@/lib/og/brand';
import { WheelArt } from '@/lib/og/arts';
import { WHEEL_OG, wheelOgLocale } from './wheelOgCopy';

export const runtime = 'nodejs';
export const alt = 'Daily Word Wheel - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const lang = wheelOgLocale((await params).locale);
  const copy = WHEEL_OG[lang];
  return renderLandingCard(lang, copy, <WheelArt data={copy} lang={lang} />);
}
