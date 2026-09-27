/**
 * Classroom Marketplace attachment view (teacher + student).
 *
 * Reuses Unplugged reteach Live (#959) — printable sheet lives on teacher
 * projector / discovery. noindex tool route.
 */

import type { Metadata } from 'next';
import { UnpluggedReteachLive } from '@/components/education/UnpluggedReteachLive';
import {
  parseClassGapShareParams,
  searchRecordToParams,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';
import { classroomAddonContentSecurityPolicy } from '@/lib/education/googleClassroomAddon';

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
    robots: { index: false, follow: false },
    title: payload.lesson || 'LexiClash Unplugged reteach',
    other: {
      'Content-Security-Policy': classroomAddonContentSecurityPolicy(),
    },
  };
}

export default async function ClassroomAddonAttachmentPage(props: PageProps) {
  const payload = await payloadFrom(props);
  return (
    <div data-testid="classroom-addon-attachment-page">
      <UnpluggedReteachLive payload={payload} />
    </div>
  );
}
