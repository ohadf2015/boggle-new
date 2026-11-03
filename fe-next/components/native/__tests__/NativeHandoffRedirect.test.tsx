import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const state = { native: true, path: '/en/teacher/upgrade' };
const replace = vi.fn();
vi.mock('@/utils/platform', () => ({ isNative: () => state.native }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path, useRouter: () => ({ replace }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));

import NativeHandoffRedirect from '../NativeHandoffRedirect';

describe('NativeHandoffRedirect', () => {
  beforeEach(() => { replace.mockClear(); state.native = true; state.path = '/en/teacher/upgrade'; });
  it('sends plan pages to the handoff inside the app', () => {
    render(<NativeHandoffRedirect />);
    expect(replace).toHaveBeenCalledWith('/en/web-handoff');
  });
  it('leaves the website alone', () => {
    state.native = false;
    render(<NativeHandoffRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });
  it('leaves other app pages alone', () => {
    state.path = '/en/daily';
    render(<NativeHandoffRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });
});
