// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import FAQPageClient from './PageClient';

export const metadata = {
  title: 'Frequently Asked Questions | LexiClash',
  description: 'Find answers to common questions about LexiClash word game. Learn about gameplay, scoring, account management, and technical support.',
};

export default function FAQPage() {
  return <FAQPageClient />;
}
