import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoreGames } from '../MoreGames';

describe('MoreGames', () => {
  it('given the home, then every mode the old home linked to is still one tap away', () => {
    render(<MoreGames lang="sv" t={(k) => k} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/sv/word-tower', '/sv/blast', '/sv/word-craft', '/sv/connections', '/sv/adventure', '/sv/brain']),
    );
  });
});
