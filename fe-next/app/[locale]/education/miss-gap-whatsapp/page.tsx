/**
 * Parent / WhatsApp miss-gap practice card — share destination after
 * #975 async homework + #977 GC grade passback.
 *
 * Query params mirror miss-gap-assignment (lesson, teacher, found, total,
 * missed, lang, due) + WhatsApp UTMs. Student names never appear.
 * noindex tool route — NON_LANDING.
 *
 * Foil: Classroom grade sync stops at the gradebook; LexiClash unfurls a
 * parent practice card in WhatsApp.
 */

import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { MissGapWhatsAppShareCard } from '@/components/education/MissGapWhatsAppShareCard';
import {
  interpClassGapTemplate,
  parseClassGapShareParams,
  searchRecordToParams,
} from '@/lib/education/classGapShare';
import {
  normalizeDueDate,
  toMissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import {
  buildMissGapWhatsAppOgImageUrl,
  MISS_GAP_WHATSAPP_PATH,
} from '@/lib/education/missGapWhatsAppShare';

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

async function payloadFrom(props: PageProps) {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  const base = parseClassGapShareParams(sp);
  const dueDate = normalizeDueDate(sp.get('due'));
  return toMissGapAssignmentPayload({ ...base, dueDate });
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const payload = await payloadFrom(props);
  const t = await loadTranslation(payload.locale);
  const lesson = payload.lesson || readString(t, 'education.results.title', 'Lesson recap');
  const ogTitle = interpClassGapTemplate(
    readString(
      t,
      'education.results.missGapWhatsAppOgTitle',
      'Miss-gap practice for parents — {{lesson}}',
    ),
    { lesson },
  );
  const description = payload.missedWords.length
    ? interpClassGapTemplate(
        readString(
          t,
          'education.results.missGapWhatsAppShareText',
          '{{lesson}} — practise miss-gap words with your child (due {{due}}): {{missed}}',
        ),
        {
          lesson,
          missed: payload.missedWords.join(', '),
          due: payload.dueDate || '—',
        },
      )
    : interpClassGapTemplate(
        readString(t, 'education.results.shareGapAllFoundText', '{{lesson}} — every word found'),
        { lesson },
      );
  const ogImage = buildMissGapWhatsAppOgImageUrl(payload);
  const canonical = `${BASE}/${payload.locale}${MISS_GAP_WHATSAPP_PATH}`;

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

export default async function MissGapWhatsAppPage(props: PageProps) {
  const payload = await payloadFrom(props);
  const dir = payload.locale === 'he' ? 'rtl' : 'ltr';

  return (
    <main
      dir={dir}
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      data-testid="miss-gap-whatsapp-page"
    >
      <MissGapWhatsAppShareCard payload={payload} parentView />
    </main>
  );
}
