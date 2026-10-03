import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrendingUp } from 'lucide-react';
import { MetricCard } from '../MetricCard';

describe('MetricCard compact (two-up grid at 390px)', () => {
  it('shrinks the value on phones so "18/20" fits a half-width card', () => {
    render(<MetricCard title="Active" value="18/20" icon={<TrendingUp />} compact />);
    const value = screen.getByText('18/20');
    expect(value.className).toMatch(/(^|\s)text-2xl(\s|$)/);
    expect(value.className).toMatch(/sm:text-4xl/);
    expect(value.className).toMatch(/min-w-0/);
  });

  it('leaves the default card exactly as the HQ mount draws it', () => {
    render(<MetricCard title="Active" value="18/20" icon={<TrendingUp />} />);
    const value = screen.getByText('18/20');
    expect(value.className).toMatch(/(^|\s)text-4xl(\s|$)/);
    expect(value.className).not.toMatch(/text-2xl/);
  });
});
