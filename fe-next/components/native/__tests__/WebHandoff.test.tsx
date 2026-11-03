import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

const open = vi.fn(async () => {});
vi.mock('@capacitor/browser', () => ({ Browser: { open: (...a: unknown[]) => open(...a) } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

import WebHandoff from '../WebHandoff';

describe('WebHandoff', () => {
  it('shows no price and opens the website plans page in the system browser', () => {
    const { container } = render(<WebHandoff />);
    expect(container.textContent).not.toMatch(/[$€₪]|\/mo/);
    fireEvent.click(screen.getByRole('button', { name: 'webHandoff.open' }));
    return waitFor(() => expect(open).toHaveBeenCalledWith({ url: 'https://www.lexiclash.live/he/teacher/upgrade' }));
  });
});
