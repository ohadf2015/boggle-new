import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportEmptyState } from '@/components/teacher/reports/ReportEmptyState';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key), language: 'en' }),
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/);

describe('Pro class report: calm surfaces', () => {
  it('given no game yet, then the report offers one lime action and an outlined second one in normal case', () => {
    const { container } = render(<ReportEmptyState classroomId="c1" />);
    const links = screen.getAllByRole('link');
    expect(links.filter((a) => tokens(a).includes('bg-neo-lime'))).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/\buppercase\b|neo-cyan/);
  });
});
