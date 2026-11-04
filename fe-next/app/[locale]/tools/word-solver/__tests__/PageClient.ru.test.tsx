import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const locale = vi.hoisted(() => ({ current: 'ru' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: locale.current }) }));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/AutoHideHeader', () => ({ AutoHideHeader: () => null }));

import WordSolverPageClient from '../PageClient';

describe('word solver language picker', () => {
  it('offers Russian and selects it on /ru', () => {
    locale.current = 'ru';
    render(<WordSolverPageClient />);
    expect(screen.getByRole('button', { name: /Русский/ }).className).toContain('bg-neo-cyan');
    expect(screen.getByRole('button', { name: /English/ }).className).not.toContain('bg-neo-cyan');
  });

  it('offers Russian without selecting it on other locales', () => {
    locale.current = 'en';
    render(<WordSolverPageClient />);
    expect(screen.getByRole('button', { name: /Русский/ }).className).not.toContain('bg-neo-cyan');
  });
});
