/**
 * Class missed-word gap card — the page Slack and parent chats unfurl.
 *
 * Query params are CLASS-level (lesson, teacher, coverage, missed words).
 * Student names never appear here. noindex: this is a share card, not an SEO landing.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { loadTranslation } from '@/translations/loadTranslation';
import {
  buildClassGapOgImageUrl,
  interpClassGapTemplate,
  parseClassGapShareParams,
  searchRecordToParams,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';

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

async function payloadFrom(props: PageProps): Promise<ClassGapSharePayload> {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  return parseClassGapShareParams(sp);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const payload = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const title = payload.missedWords.length
    ? interpClassGapTemplate(readString(t, 'education.results.shareGapText', '{{lesson}} — {{found}}/{{total}}'), {
        lesson,
        found: payload.found,
        total: payload.total,
        missed: payload.missedWords.join(', '),
      })
    : interpClassGapTemplate(readString(t, 'education.results.shareGapAllFoundText', '{{lesson}} — every word found'), {
        lesson,
      });
  const ogTitle = readString(t, 'education.results.shareGapTitle', 'Class vocabulary gap');
  const description = title;
  const ogImage = buildClassGapOgImageUrl({
    locale: payload.locale,
    lessonNames: payload.lesson ? [payload.lesson] : [],
    teacherName: payload.teacher,
    found: payload.found,
    total: payload.total,
    missedWords: payload.missedWords,
  });
  const canonical = `${BASE}/${payload.locale}/education/class-gap`;

  return {
    title: ogTitle,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title: ogTitle,
      description,
      siteName: 'LexiClash',
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [ogImage],
    },
    alternates: { canonical },
  };
}

export default async function ClassGapPage(props: PageProps) {
  const payload = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const coverage = interpClassGapTemplate(readString(t, 'education.results.classCoverage', '{{found}} / {{total}}'), {
    found: payload.found,
    total: payload.total,
  });
  const cta = readString(t, 'education.results.shareGapCta', 'Play a class game');
  const eyebrow = readString(t, 'education.results.shareGapEyebrow', "Today's class gap");
  const practiceHome = readString(t, 'education.results.shareGapPracticeHome', 'Words to practice at home');
  const allFound = readString(t, 'education.results.allFound', 'The class found every lesson word.');

  return (
    <main
      dir={dir}
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      data-testid="class-gap-page"
    >
      <article className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard">
        <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">{eyebrow}</p>
        <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">{lesson}</h1>
        {payload.teacher ? (
          <p className="text-neo-white/70 font-neo-body text-sm mt-1">{payload.teacher}</p>
        ) : null}
        <p className="text-neo-lime font-bold mt-4">{coverage}</p>

        {payload.missedWords.length > 0 ? (
          <div className="mt-4 p-3 rounded-neo border border-neo-pink/40 bg-neo-pink/10">
            <p className="text-neo-white font-bold text-sm mb-2">{practiceHome}</p>
            <ul className="flex flex-wrap gap-2">
              {payload.missedWords.map((word) => (
                <li
                  key={word}
                  className="px-3 py-1.5 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-bold text-sm"
                >
                  {word}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 p-3 rounded-neo border border-neo-lime/40 bg-neo-lime/10 text-neo-white font-neo-body text-sm">
            {allFound}
          </p>
        )}

        <Link
          href={`/${payload.locale}/education`}
          className="mt-6 inline-flex w-full items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all"
        >
          {cta}
        </Link>
      </article>
    </main>
  );
}
