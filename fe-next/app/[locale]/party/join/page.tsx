import type { Metadata } from 'next';
import JoinRedirectClient from './JoinRedirectClient';

export const metadata: Metadata = {
  title: 'Join Party | LexiClash',
};

export default function JoinPage() {
  return <JoinRedirectClient />;
}
