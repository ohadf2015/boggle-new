import { notFound } from 'next/navigation';
import StudentPlayPreviewClient from './PreviewClient';

export const dynamic = 'force-dynamic';

// Dev-only fixture view: the live question screen needs a running classroom round, and QA accounts are never created on prod.
export default function StudentPlayPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <StudentPlayPreviewClient />;
}
