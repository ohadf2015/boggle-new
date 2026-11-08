import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let query = '';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/ClassroomModeCatalogue', () => ({ ClassroomModeCatalogue: () => null }));

import { LobbyPickerPreview } from '../LobbyPickerPreview';

describe('?preview=lobby', () => {
  it('Given no flag, Then every game is pickable', () => {
    query = '';
    render(<LobbyPickerPreview />);
    expect(screen.getByTestId('mode-tile-wordcraft')).not.toHaveAttribute('aria-disabled');
  });

  it('Given &list=ru, Then the Wordcraft card shows the no-tiles-for-this-language reason, from the real check', () => {
    query = 'list=ru';
    render(<LobbyPickerPreview />);
    expect(screen.getByTestId('mode-tile-wordcraft')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('mode-blocked-reason')).toHaveTextContent('eg2Modes.blocked.wordcraftLanguage');
  });
});
