import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftEventToast } from '../WordCraftEventToast';

describe('WordCraftEventToast', () => {
  it('Given no toast, When rendered, Then nothing is shown', () => {
    const { container } = render(<WordCraftEventToast toast={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given a bot toast, When rendered, Then its text is announced as a status', () => {
    render(<WordCraftEventToast toast={{ key: 1, tone: 'bot', text: 'WordBot skips — free turn!' }} />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('WordBot skips — free turn!');
    expect(el).toHaveAttribute('data-tone', 'bot');
  });

  it('Given a gold toast with a detail line, When rendered, Then both lines show', () => {
    render(<WordCraftEventToast toast={{ key: 2, tone: 'gold', text: 'SURPRISE!', detail: '+6 squares' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('SURPRISE!');
    expect(screen.getByRole('status')).toHaveTextContent('+6 squares');
  });
});
