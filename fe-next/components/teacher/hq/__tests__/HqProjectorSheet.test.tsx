import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('../useClassRoster', () => ({
  useClassRoster: () => ({ students: [{ id: 's1', name: 'Ava', avatar: null }], loading: false, arrivals: [] }),
}));
vi.mock('@/components/Avatar', () => ({ default: () => <span /> }));

import { HqProjectorSheet } from '../HqProjectorSheet';

const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD' };

describe('<HqProjectorSheet>', () => {
  it('Given it is open, Then the wall shows the code, a QR and the join address', () => {
    render(<HqProjectorSheet classroom={CLASS} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('AB12CD');
    expect(dialog.querySelector('svg[data-testid="hq-projector-qr"], [data-testid="hq-projector-qr"] svg')).toBeTruthy();
    expect(screen.getByTestId('hq-projector-address')).toHaveTextContent('/he/join/AB12CD');
  });

  it('When Escape or close is pressed, Then it closes', () => {
    const onClose = vi.fn();
    render(<HqProjectorSheet classroom={CLASS} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('hq-projector-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
