import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { DrillSection } from '../DrillSection';

function Harness({ initial = false, onMount = vi.fn() }: { initial?: boolean; onMount?: () => void }) {
  const [open, setOpen] = useState(initial);
  return (
    <DrillSection id="s1" title="Revenue" summary="3 paying" open={open} onOpenChange={setOpen}>
      <Probe onMount={onMount} />
    </DrillSection>
  );
}
function Probe({ onMount }: { onMount: () => void }) {
  onMount();
  return <p>inside</p>;
}

describe('DrillSection', () => {
  it('shows title and summary but mounts nothing while closed', () => {
    const onMount = vi.fn();
    render(<Harness onMount={onMount} />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('3 paying')).toBeInTheDocument();
    expect(onMount).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Revenue/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('mounts the body on open and unmounts it on close', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Revenue/ }));
    expect(screen.getByText('inside')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revenue/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Revenue/ }));
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
  });

  it('exposes its id as an anchor', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('#s1')).not.toBeNull();
  });
});
