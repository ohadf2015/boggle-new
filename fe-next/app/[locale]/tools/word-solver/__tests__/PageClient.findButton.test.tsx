import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/AutoHideHeader', () => ({ AutoHideHeader: () => null }));

import WordSolverPageClient from '../PageClient';

describe('word solver Find Words button', () => {
  it('is a disabled, visibly distinct button until two letters are typed, then the lime primary', () => {
    render(<WordSolverPageClient />);
    const button = screen.getByRole('button', { name: 'Find Words' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:border-dashed');
    expect(button.className).not.toContain('disabled:opacity');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ae' } });
    expect(button).toBeEnabled();
    expect(button.className).toContain('bg-neo-lime');
  });
});
