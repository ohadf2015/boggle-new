import { render } from '@testing-library/react';
import NodeScreen from '../NodeScreen';
import type { NodeState } from '@/lib/adventure/play/nodeResolve';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data: unknown) => mockTrackGrowthEvent(event, data),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

vi.mock('../EventScreen', () => ({ default: () => null }));
vi.mock('../RestScreen', () => ({ default: () => null }));
vi.mock('../ShopScreen', () => ({ default: () => null }));
vi.mock('../TreasureScreen', () => ({ default: () => null }));

const mockRun: PublicRun = {
  node: 'shop-1',
  path: ['start', 'shop-1'],
  words: [],
  score: 100,
  phrase: [],
  hp: 3,
  pockets: { coins: 500 },
};

const mockShopState: NodeState = {
  kind: 'shop',
  items: [],
  bought: {},
};

const mockRestState: NodeState = {
  kind: 'rest',
  heal: 1,
  taken: false,
};

describe('NodeScreen growth tracking', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('fires adventure_node_entered once per unique node', () => {
    render(
      <NodeScreen
        state={mockShopState}
        run={mockRun}
        world={1}
        busy={false}
        onChoice={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_node_entered', {
      world: 1,
      nodeKind: 'shop',
    });
  });

  it('does not fire again when component rerenders but node is same', () => {
    const { rerender } = render(
      <NodeScreen
        state={mockShopState}
        run={mockRun}
        world={1}
        busy={false}
        onChoice={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const callCountBefore = mockTrackGrowthEvent.mock.calls.length;

    // Rerender with same node
    rerender(
      <NodeScreen
        state={mockShopState}
        run={mockRun}
        world={1}
        busy={true} // Change a prop
        onChoice={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const callCountAfter = mockTrackGrowthEvent.mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore); // No new calls
  });

  it('fires again when node identity changes', () => {
    const { rerender } = render(
      <NodeScreen
        state={mockShopState}
        run={mockRun}
        world={1}
        busy={false}
        onChoice={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    mockTrackGrowthEvent.mockClear();

    // Change to a different node
    const newRun = { ...mockRun, node: 'rest-1' };
    rerender(
      <NodeScreen
        state={mockRestState}
        run={newRun}
        world={1}
        busy={false}
        onChoice={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_node_entered', {
      world: 1,
      nodeKind: 'rest',
    });
  });
});
