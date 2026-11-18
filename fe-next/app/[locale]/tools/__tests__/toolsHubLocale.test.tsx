import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const params = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('next/navigation', () => ({ useParams: () => params }));
vi.mock('@/components/AutoHideHeader', () => ({ AutoHideHeader: () => null }));

import ToolsHubPageClient from '../PageClient';

describe('tools hub', () => {
  it('offers the English-only tools on the English page', () => {
    params.locale = 'en';
    render(<ToolsHubPageClient />);
    expect(screen.getByText('Word Finder')).toBeTruthy();
    expect(screen.getByText('Wordle Solver')).toBeTruthy();
  });

  it('leaves them off a page in another language', () => {
    params.locale = 'ja';
    render(<ToolsHubPageClient />);
    expect(screen.queryByText('Word Finder')).toBeNull();
    expect(screen.queryByText('Wordle Solver')).toBeNull();
  });
});
