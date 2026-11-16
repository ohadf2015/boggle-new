import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation } from '@/translations/loadTranslation';
import { normalizeLocale, searchRecordToParams } from '@/lib/education/classGapShare';
import { buildClassWinOgImageUrl, parseClassWinParams } from '@/lib/education/classWinOgModel';
import { CLASS_WIN_UTM } from '@/lib/education/classWinShare';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = 'https://www.lexiclash.live';

function readString(catalogue: unknown, path: string, fallback: string): string {
  let node: unknown = catalogue;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return fallback;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : fallback;
}

const fill = (s: string, p: object) => s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String((p as Record<string, unknown>)[k]) : m));

async function load(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const lang = normalizeLocale(locale);
  return { lang, payload: parseClassWinParams(searchRecordToParams(query)), t: await loadTranslation(lang) };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { lang, payload, t } = await load(props);
  const title = readString(t, 'brag2.classWin.title', 'Our class win on LexiClash');
  const description = fill(readString(t, 'brag2.classWin.pageHeadline', 'A class found {words} words together'), payload);
  const ogImage = buildClassWinOgImageUrl(payload);
  const canonical = `${BASE}/${lang}/education/class-win`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { type: 'website', url: canonical, title, description, siteName: 'LexiClash', images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical },
  };
}

export default async function ClassWinPage(props: PageProps) {
  const { lang, payload, t } = await load(props);
  const cta = new URLSearchParams(CLASS_WIN_UTM).toString();
  return (
    <main dir={lang === 'he' ? 'rtl' : 'ltr'} className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10" data-testid="class-win-page">
      <article className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-lime bg-neo-navy-light shadow-hard">
        <p className="text-neo-lime font-bold text-xs uppercase tracking-widest mb-2">{readString(t, 'brag2.classWin.pageEyebrow', 'Class win')}</p>
        <h1 className="text-neo-white font-neo-display font-bold text-3xl leading-tight">
          {fill(readString(t, 'brag2.classWin.pageHeadline', 'A class found {words} words together'), payload)}
        </h1>
        {payload.total > 0 ? (
          <p className="text-neo-cyan font-bold mt-3">{fill(readString(t, 'brag2.classWin.pageLesson', '{found} of {total} lesson words'), payload)}</p>
        ) : null}
        <Link
          href={`/${lang}/education?${cta}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-5 py-2 font-neo-display font-bold text-neo-black shadow-hard"
        >
          {readString(t, 'brag2.classWin.pageCta', 'Try LexiClash with your class')}
        </Link>
      </article>
    </main>
  );
}
