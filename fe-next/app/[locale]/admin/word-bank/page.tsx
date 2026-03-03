/**
 * Admin Word Bank Page
 * Server component wrapper for word bank management
 */

import WordBankPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default async function WordBankPage() {
  return <WordBankPageClient />;
}
