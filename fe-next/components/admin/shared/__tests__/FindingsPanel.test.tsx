import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Finding } from '@/lib/admin/findings';
import { FindingsPanel } from '../FindingsPanel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string, p?: Record<string, string | number>) => (fb ?? k).replace(/\{(\w+)\}/g, (_, n: string) => String(p?.[n] ?? `{${n}}`)),
    language: 'en',
  }),
}));

const f = (id: string, tone: Finding['tone'], drill?: Finding['drill']): Finding => ({ id, tone, params: {}, drill });
const describe_ = (x: Finding) => `says ${x.id}`;

describe('FindingsPanel', () => {
  it('puts each tone where it belongs: early on top, wins and problems in their columns, facts as chips', () => {
    render(<FindingsPanel findings={[f('a', 'early'), f('b', 'win'), f('c', 'problem'), f('d', 'fact')]} describe={describe_} />);
    expect(within(screen.getByTestId('findings-early')).getByText('says a')).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-working')).getByText('says b')).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-broken')).getByText('says c')).toBeInTheDocument();
    expect(within(screen.getByTestId('findings-facts')).getByText('says d')).toBeInTheDocument();
  });

  it('says so in each empty column instead of leaving a blank box', () => {
    render(<FindingsPanel findings={[]} describe={describe_} />);
    expect(screen.getByText('No early warning signs. Nothing is slipping yet.')).toBeInTheDocument();
    expect(screen.getByText(/No clear win yet/)).toBeInTheDocument();
    expect(screen.getByText('Nothing is breaking right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('findings-facts')).toBeNull();
  });

  it('offers a drill only when the finding has ids and the page can act on them', () => {
    const onDrill = vi.fn();
    const withIds = f('x', 'problem', { kind: 'teachers', ids: ['t1', 't2'] });
    const { rerender } = render(<FindingsPanel findings={[withIds]} describe={describe_} onDrill={onDrill} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show them (2)' }));
    expect(onDrill).toHaveBeenCalledWith({ kind: 'teachers', ids: ['t1', 't2'], title: 'says x' });
    rerender(<FindingsPanel findings={[withIds]} describe={describe_} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
