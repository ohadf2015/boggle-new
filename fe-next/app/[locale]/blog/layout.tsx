import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Resources | LexiClash',
  description: 'Tips, strategies, and insights for word game enthusiasts. Learn how to improve your skills and master LexiClash.',
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
