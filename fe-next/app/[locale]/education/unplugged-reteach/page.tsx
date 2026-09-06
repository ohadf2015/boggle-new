/**
 * Unplugged reteach Live — teacher projector page (noindex share/tool route).
 *
 * Query params mirror class-gap (lesson, teacher, found, total, missed, lang).
 * All prose lives in the client component via t() — this page has no JSX text nodes.
 */

import type { Metadata } from 'next';
import { UnpluggedReteachLive } from '@/components/education/UnpluggedReteachLive';
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

async function payloadFrom(props: PageProps): Promise<ClassGapSharePayload> {
  const [{ locale }, query] = await Promise.all([props.params, props.searchParams]);
  const sp = searchRecordToParams(query);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);
  return parseClassGapShareParams(sp);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const payload = await payloadFrom(props);
  return {
    robots: { index: false, follow: true },
    title: payload.lesson || undefined,
  };
}

export default async function UnpluggedReteachPage(props: PageProps) {
  const payload = await payloadFrom(props);
  return <UnpluggedReteachLive payload={payload} />;
}
