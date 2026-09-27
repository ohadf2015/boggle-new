import type { Metadata } from 'next';
import NotFoundClient from './NotFoundClient';

// AdSense / GSC fix (2026-06-17): a not-found boundary must be noindex. This used to be
// a 'use client' component with no metadata, so every /[locale]/* 404 inherited the
// locale layout's index,follow and surfaced in GSC as indexable "Soft 404". Keeping the
// boundary a server component lets it declare robots:noindex; the interactive 404 UI
// (mascot + stale-chunk recovery) lives in NotFoundClient.
// docs/2026-06-17-adsense-thin-page-noindex-spec.md
export const metadata: Metadata = {
  title: { absolute: '404 - Page Not Found | LexiClash' },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
