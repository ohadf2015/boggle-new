import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const projector = vi.hoisted(() => vi.fn());
vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({
  HqProjectorSheet: (props: unknown) => {
    projector(props);
    return <div data-testid="projector-sheet" />;
  },
}));
vi.mock('@/lib/education/telemetry', () => ({ trackEduJoinCodeShared: vi.fn(), trackEduJoinCodeCopied: vi.fn() }));

import { HomeShareSheet } from '../HomeShareSheet';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4, language: 'he' };

describe('<HomeShareSheet>', () => {
  it('Given the teacher opens Share code, Then one sheet holds the code, the QR and every way to send it', () => {
    render(<HomeShareSheet classroom={CLASS} open onOpenChange={vi.fn()} uiLanguage="en" t={t} />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('AB12CD');
    expect(screen.getByTestId('setup-qr')).toBeInTheDocument();
    expect(screen.getByTestId('setup-copy-link')).toBeInTheDocument();
    expect(screen.getByTestId('setup-share-whatsapp').getAttribute('href')).toContain(encodeURIComponent('/he/join/AB12CD'));
  });

  it('Given the class is on a projector, When the teacher picks Show on board, Then the board view opens', () => {
    render(<HomeShareSheet classroom={CLASS} open onOpenChange={vi.fn()} uiLanguage="en" t={t} />);
    fireEvent.click(screen.getByTestId('home-share-board'));
    expect(screen.getByTestId('projector-sheet')).toBeInTheDocument();
  });

  it('Given the sheet is closed, Then nothing renders', () => {
    render(<HomeShareSheet classroom={CLASS} open={false} onOpenChange={vi.fn()} uiLanguage="en" t={t} />);
    expect(screen.queryByTestId('setup-join-code')).toBeNull();
  });
});
