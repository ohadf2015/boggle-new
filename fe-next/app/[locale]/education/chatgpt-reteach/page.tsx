/**
 * ChatGPT Action host landing.
 *
 * Query params are CLASS-level (lesson, coverage, missed words).
 * Student names never appear here. noindex — this is an Action handoff, not SEO.
 */

import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { ChatGptReteachAutostart } from '@/components/education/ChatGptReteachAutostart';
import {
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
  const parsed = parseClassGapShareParams(sp);
  return { ...parsed, teacher: '' };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const payload = await payloadFrom(props);
  const title = 'LexiClash — 3-min reteach Live';
  const description = payload.missedWords.length
    ? `Host a 3-minute reteach Live on: ${payload.missedWords.join(', ')}`
    : 'Host a 3-minute reteach Live from ChatGPT materials.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${BASE}/${payload.locale}/education/chatgpt-reteach` },
  };
}

export default async function ChatGptReteachPage(props: PageProps) {
  const payload = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';
  const lesson = payload.lesson || 'ChatGPT reteach';
  const reteachLive = readString(
    t,
    'education.results.startReteachLive',
    'Start 3-min reteach Live',
  );
  const cta = readString(t, 'education.results.shareGapCta', 'Play a class game');
  const eyebrow = 'ChatGPT Action';
  const practiceHome = readString(
    t,
    'education.results.shareGapPracticeHome',
    'Words to practice',
  );

  return (
    <main
      dir={dir}
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      data-testid="chatgpt-reteach-page"
    >
      <article className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard">
        <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">{eyebrow}</p>
        <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">{lesson}</h1>
        <p className="text-neo-lime font-bold mt-4">3-min reteach Live</p>

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
            Add missed words from ChatGPT materials to host a reteach Live.
          </p>
        )}

        <ChatGptReteachAutostart
          payload={payload}
          reteachLabel={reteachLive}
          educationHref={`/${payload.locale}/education`}
          educationLabel={cta}
        />
      </article>
    </main>
  );
}
