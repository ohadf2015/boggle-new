import { notFound } from 'next/navigation';
import AwardsPreviewClient from './PreviewClient';

export const dynamic = 'force-dynamic';

// Dev-only fixture view: the real page needs a signed-in student, and QA accounts are never created on prod.
export default function AwardsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AwardsPreviewClient />;
}
