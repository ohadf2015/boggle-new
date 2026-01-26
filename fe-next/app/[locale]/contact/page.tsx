// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ContactPageClient from './PageClient';

export default function ContactPage() {
  return <ContactPageClient />;
}
