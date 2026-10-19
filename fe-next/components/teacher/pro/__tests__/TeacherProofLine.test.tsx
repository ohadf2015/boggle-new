import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, number>) => (p ? `${k}:${p.teachers}:${p.games}` : k) }),
}));

import { TeacherProofLine } from '../TeacherProofLine';

const respond = (body: unknown, ok = true) =>
  (global.fetch = vi.fn(async () => ({ ok, json: async () => body }) as Response) as never);

describe('TeacherProofLine', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('prints the real counts when the server says they are worth showing', async () => {
    respond({ show: true, teachers: 31, games: 140 });
    render(<TeacherProofLine />);
    expect(await screen.findByTestId('teacher-proof')).toHaveTextContent('eduPro.upgrade.socialProof:31:140');
  });

  it('renders nothing when the server holds the numbers back', async () => {
    respond({ show: false });
    const { container } = render(<TeacherProofLine />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on a failed or malformed response (never a made-up number)', async () => {
    respond({ show: true }, true);
    const { container, rerender } = render(<TeacherProofLine />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    respond({}, false);
    rerender(<TeacherProofLine key="again" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
