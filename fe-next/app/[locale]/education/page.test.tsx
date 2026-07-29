// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page from './page';

describe('education main page', () => {
  describe('non-English locale rendering', () => {
    it('renders Spanish locale without error', async () => {
      const { container } = render(
        await Page({ params: Promise.resolve({ locale: 'es' }) })
      );
      expect(container).toBeTruthy();
    });
  });
});
