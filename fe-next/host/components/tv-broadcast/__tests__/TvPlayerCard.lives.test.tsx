import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TvPlayerCard from '../TvPlayerCard';

describe('TvPlayerCard — Word Hunt life on the projector', () => {
  it('shows a whole number of life, never a float tail', () => {
    render(<TvPlayerCard username="Noa" score={0} wordCount={0} rank={1} index={0} gameMode="word-hunt" lives={44.400000000000006} t={(k) => k} />);
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.queryByText(/44\.4/)).not.toBeInTheDocument();
  });
});
