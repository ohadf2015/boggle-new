import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));

import { ProFeaturePreview } from '../ProFeaturePreview';
import { PRO_FEATURES } from '@/components/teacher/ProGate';
import { SAMPLE_STUDENTS, SAMPLE_WORD_COUNT, sampleMasteryGrid } from '@/lib/education/pro/sampleClass';

describe('ProFeaturePreview — a concrete sample of each Pro surface', () => {
  it.each(PRO_FEATURES)('renders a labelled sample for %s', (feature) => {
    render(<ProFeaturePreview feature={feature} />);
    const root = screen.getByTestId(`pro-preview-${feature}`);
    expect(root).toBeInTheDocument();
    expect(root.textContent).toContain('eg2Pro.sample.badge');
    expect(root.className).not.toMatch(/blur/);
  });

  it('shows every sample student in the analytics preview', () => {
    render(<ProFeaturePreview feature="analytics" />);
    expect(screen.getAllByTestId('pro-preview-student-row')).toHaveLength(SAMPLE_STUDENTS.length);
  });

  it('draws a full student x word grid in the mastery preview', () => {
    render(<ProFeaturePreview feature="mastery" />);
    expect(screen.getAllByTestId('pro-preview-cell')).toHaveLength(SAMPLE_STUDENTS.length * SAMPLE_WORD_COUNT);
  });

  it('lays the missed-word rounds out on the 1-3-7 day schedule', () => {
    render(<ProFeaturePreview feature="missedPractice" />);
    const days = screen.getAllByTestId('pro-preview-day').map((d) => d.textContent);
    expect(days.join('|')).toMatch(/"days":1[\s\S]*"days":3[\s\S]*"days":7/);
  });

  it('keeps the sample deterministic so SSR and hydration agree', () => {
    expect(sampleMasteryGrid()).toEqual(sampleMasteryGrid());
  });
});
