import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import ListMetaFields from '../ListMetaFields';
import { emptyListDraft } from '../ListEditorSheet';

describe('<ListMetaFields> assign-to select', () => {
  it('labels the empty choice "not assigned yet" when the teacher has classes, never "No class yet"', () => {
    render(<ListMetaFields draft={emptyListDraft('en')} classrooms={[{ id: 'c1', name: 'My Class' }]} onChange={vi.fn()} />);
    const options = screen.getByTestId('list-classroom').querySelectorAll('option');
    expect(options[0]).toHaveTextContent('eg2Polish.library.notAssigned');
    expect(options[1]).toHaveTextContent('My Class');
  });
});

describe('<ListMetaFields> language', () => {
  it('Given a draft, Then the language is a tappable radio group on its own row, not a squeezed select', () => {
    const onChange = vi.fn();
    render(<ListMetaFields draft={emptyListDraft('en')} classrooms={[]} onChange={onChange} />);
    const group = screen.getByTestId('list-language');
    expect(group).toHaveAttribute('role', 'radiogroup');
    expect(screen.getByRole('radio', { name: /English/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /עברית/ }));
    expect(onChange).toHaveBeenCalledWith({ language: 'he' });
  });
});
