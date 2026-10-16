import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import DiscoverFilters from '../DiscoverFilters';

const filters = { language: 'all', query: '', grade: null, topic: null, source: 'all', sort: 'popular' } as const;

describe('<DiscoverFilters> language chips', () => {
  it('Given the filter row, Then each language is a radio with a flag and its full native name, wrapped not clipped', () => {
    const onChange = vi.fn();
    const { container } = render(<DiscoverFilters filters={{ ...filters }} onChange={onChange} total={3} />);
    expect(screen.getByRole('radiogroup', { name: 'eduLibrary.meta.language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /eduLibrary.discover.allLanguages/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /日本語/ })).toBeInTheDocument();
    const list = container.querySelector('[data-picker-options]') as HTMLElement;
    expect(list.className).toMatch(/flex-wrap/);
    fireEvent.click(screen.getByRole('radio', { name: /日本語/ }));
    expect(onChange).toHaveBeenCalledWith({ language: 'ja' });
  });
});
