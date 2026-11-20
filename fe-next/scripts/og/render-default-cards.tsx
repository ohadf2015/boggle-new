/**
 * Renders the per-locale default share images (public/og-image-<lang>.webp).
 * English keeps its illustrated card; run with `npx tsx scripts/og/render-default-cards.tsx`.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { renderLandingCard, type OgLang } from '../../lib/og/brand';
import { BoardArt } from '../../lib/og/arts';
import { BOARDS, SITE_CARD } from '../../lib/og/landingCopy';

const LANGS: OgLang[] = ['he', 'sv', 'ja', 'es', 'ru'];

(async () => {
  for (const lang of LANGS) {
    const res = renderLandingCard(lang, SITE_CARD[lang], <BoardArt data={BOARDS[lang]} lang={lang} />, { brandTitle: true });
    const png = Buffer.from(await res.arrayBuffer());
    writeFileSync(`public/og-image-${lang}.webp`, await sharp(png).webp({ quality: 88 }).toBuffer());
    console.log('wrote', lang);
  }
})();
