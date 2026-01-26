// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import EducationPageClient from './PageClient';

export default function EducationPage() {
  return <EducationPageClient />;
}
