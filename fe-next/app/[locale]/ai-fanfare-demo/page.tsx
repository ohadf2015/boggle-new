import type { Metadata } from 'next';
import AiFanfareDemoClient from './AiFanfareDemoClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'AI Fanfare Demo',
};

export default function AiFanfareDemoPage() {
  return <AiFanfareDemoClient />;
}
