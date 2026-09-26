/**
 * "Host: {{name}}" on an arena row and the join ticket. The whole line used to
 * be one truncating span in the ROW's direction, so a Latin host in a Hebrew
 * row lost the START of the name ("…smic Avocado", he phone capture
 * 2026-09-26). The name now truncates in a box of its own direction, beside
 * the words of the same hostedBy template, in every locale.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bundleT, LOCALES } from './localeBundles';

const lang = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@/contexts/LanguageContext', async () => {
  const { bundleT: bt } = await import('./localeBundles');
  return { useLanguage: () => ({ t: bt(lang.locale), language: lang.locale }) };
});

import { HostedBy } from '../HostedBy';

const NAMES = ['Cosmic Avocado', 'פלאפל רויאל'];

describe('HostedBy', () => {
  beforeEach(() => {
    lang.locale = 'en';
  });

  it.each(LOCALES)('%s: reads as the one hostedBy template', (locale) => {
    lang.locale = locale;
    for (const name of NAMES) {
      const { container, unmount } = render(<HostedBy name={name} />);
      expect(container.textContent).toBe(bundleT(locale)('mpUi.entry.hostedBy', { name }));
      unmount();
    }
  });

  it.each(LOCALES)('%s: the name truncates in a box of its own direction, apart from the label', (locale) => {
    lang.locale = locale;
    for (const name of NAMES) {
      const { container, unmount } = render(<HostedBy name={name} />);
      const box = container.querySelector('[dir="auto"]');
      expect(box).not.toBeNull();
      expect(box!.textContent).toBe(name);
      expect(box!.className).toMatch(/\btruncate\b/);
      expect(box!.className).toMatch(/\bmin-w-0\b/);
      unmount();
    }
  });

  it('the label never wraps and the line can shrink inside a row', () => {
    const { container } = render(<HostedBy name="Cosmic Avocado" className="extra" />);
    const line = container.firstElementChild as HTMLElement;
    expect(line.className).toMatch(/\bwhitespace-nowrap\b/);
    expect(line.className).toMatch(/\bmin-w-0\b/);
    expect(line.className).toMatch(/\bextra\b/);
  });
});
