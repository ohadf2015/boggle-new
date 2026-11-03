import type { Metadata } from 'next';
import WebHandoff from '@/components/native/WebHandoff';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function WebHandoffPage() {
  return <WebHandoff />;
}
