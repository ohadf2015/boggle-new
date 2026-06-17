import { describe, it, expect } from 'vitest';
import { metadata } from '../not-found';

/**
 * AdSense / GSC fix (2026-06-17): the [locale] not-found boundary was a 'use client'
 * component with NO metadata, so every /[locale]/* 404 inherited the locale layout's
 * index,follow and showed up in GSC as indexable "Soft 404". A not-found page must be
 * noindex. The page is now a server component that exports metadata + renders the
 * interactive UI as a client child (NotFoundClient).
 * Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
describe('[locale] not-found metadata — noindexed', () => {
  it('exports metadata with robots index:false', () => {
    expect(metadata?.robots).toMatchObject({ index: false });
  });

  it('does not allow following into a dead 404 (follow:false)', () => {
    expect(metadata?.robots).toMatchObject({ follow: false });
  });
});
