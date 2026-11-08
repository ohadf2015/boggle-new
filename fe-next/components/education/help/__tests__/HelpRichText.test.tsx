import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpRichText } from '../HelpRichText';

describe('HelpRichText links', () => {
  it('opens a consumer page (legal) in a new tab so the teacher keeps the help centre', () => {
    render(<HelpRichText locale="he" text="ראו [מדיניות הפרטיות](app:/legal/privacy)." />);
    const link = screen.getByRole('link', { name: /מדיניות הפרטיות/ });
    expect(link).toHaveAttribute('href', '/he/legal/privacy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('נפתח בלשונית חדשה');
  });

  it('keeps edu app routes and help articles in the same tab', () => {
    render(<HelpRichText locale="en" text="Go to [the dashboard](app:/teacher/upgrade) or [create a class](help:create-class)." />);
    for (const name of [/the dashboard/, /create a class/]) {
      const link = screen.getByRole('link', { name });
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveTextContent('new tab');
    }
  });
});
