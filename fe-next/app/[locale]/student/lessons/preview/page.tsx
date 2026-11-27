import { notFound } from 'next/navigation';
import LessonsPreviewClient from './PreviewClient';

export const dynamic = 'force-dynamic';

// Dev-only fixture view: the real page needs a signed-in student, and QA accounts are never created on prod.
export default function LessonsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <LessonsPreviewClient />;
}
