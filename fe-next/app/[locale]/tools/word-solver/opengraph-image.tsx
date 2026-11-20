import { ogLang, renderLandingCard } from '@/lib/og/brand';
import { SolverArt } from '@/lib/og/arts';
import { SOLVERS, solverCard } from '@/lib/og/landingCopy';
import { getContent } from './content';

export const runtime = 'nodejs';
export const alt = 'Word Solver - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const lang = ogLang((await params).locale);
  return renderLandingCard(lang, solverCard(lang, getContent(lang)), <SolverArt data={SOLVERS[lang]} lang={lang} />);
}
