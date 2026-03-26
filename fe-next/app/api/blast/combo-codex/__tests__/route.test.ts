import { vi, type Mock, } from 'vitest';
/**
 * Combo Codex API Route Tests
 *
 * Tests the additive merge logic and handler functions used by the
 * POST and GET endpoints for combo codex persistence.
 *
 * TDD: written before implementation (RED phase).
 */

// Mock next/server and Supabase server client BEFORE any imports
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import {
  handlePostComboCodex,
  handleGetComboCodex,
  mergeDiscoveredCombos,
} from '../route';

// ---- Types ----

interface MockSupabase {
  from: Mock;
}

// ---- Helpers ----

function createMockSupabase({
  selectData = null,
  selectError = null,
  upsertError = null,
}: {
  selectData?: { discovered_combos: string[] } | null;
  selectError?: { message: string } | null;
  upsertError?: { message: string } | null;
} = {}): MockSupabase {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: selectData,
            error: selectError,
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({
        error: upsertError,
      }),
    }),
  };
}

// ==================== mergeDiscoveredCombos ====================

describe('mergeDiscoveredCombos', () => {
  it('merges two non-overlapping sets (union)', () => {
    const existing = ['bomb_bomb', 'lightning_lightning'];
    const incoming = ['prism_prism', 'bomb_lightning'];
    const merged = mergeDiscoveredCombos(existing, incoming);
    expect(merged).toHaveLength(4);
    expect(merged).toContain('bomb_bomb');
    expect(merged).toContain('prism_prism');
  });

  it('deduplicates overlapping combos', () => {
    const existing = ['bomb_bomb', 'lightning_lightning'];
    const incoming = ['bomb_bomb', 'prism_prism'];
    const merged = mergeDiscoveredCombos(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.filter(c => c === 'bomb_bomb')).toHaveLength(1);
  });

  it('returns incoming when existing is empty', () => {
    const merged = mergeDiscoveredCombos([], ['bomb_bomb']);
    expect(merged).toEqual(['bomb_bomb']);
  });

  it('returns existing when incoming is empty', () => {
    const merged = mergeDiscoveredCombos(['bomb_bomb'], []);
    expect(merged).toEqual(['bomb_bomb']);
  });

  it('never shrinks — always additive', () => {
    const existing = ['bomb_bomb', 'lightning_lightning', 'prism_prism'];
    const incoming = ['bomb_bomb']; // subset
    const merged = mergeDiscoveredCombos(existing, incoming);
    expect(merged.length).toBeGreaterThanOrEqual(existing.length);
    expect(merged).toContain('lightning_lightning');
    expect(merged).toContain('prism_prism');
  });
});

// ==================== handleGetComboCodex ====================

describe('handleGetComboCodex', () => {
  it('returns discovered_combos for authenticated user with existing record', async () => {
    const mockSupabase = createMockSupabase({
      selectData: { discovered_combos: ['bomb_bomb', 'lightning_lightning'] },
    });

    const result = await handleGetComboCodex('user-123', mockSupabase);
    expect(result.status).toBe(200);
    expect(result.data.discoveredCombos).toEqual(['bomb_bomb', 'lightning_lightning']);
  });

  it('returns empty array when no record exists (no error)', async () => {
    const mockSupabase = createMockSupabase({
      selectData: null,
      selectError: { message: 'No rows found' },
    });

    const result = await handleGetComboCodex('user-123', mockSupabase);
    expect(result.status).toBe(200);
    expect(result.data.discoveredCombos).toEqual([]);
  });

  it('returns 500 on unexpected database error', async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('db crash')),
        }),
      }),
    });
    const result = await handleGetComboCodex('user-123', { from });
    expect(result.status).toBe(500);
  });
});

// ==================== handlePostComboCodex ====================

describe('handlePostComboCodex', () => {
  it('merges incoming combos with existing and upserts result', async () => {
    const mockSupabase = createMockSupabase({
      selectData: { discovered_combos: ['bomb_bomb'] },
    });

    const result = await handlePostComboCodex(
      'user-123',
      { discoveredCombos: ['lightning_lightning', 'prism_prism'] },
      mockSupabase,
    );

    expect(result.status).toBe(200);
    expect(result.data.discoveredCombos).toContain('bomb_bomb');
    expect(result.data.discoveredCombos).toContain('lightning_lightning');
    expect(result.data.discoveredCombos).toContain('prism_prism');
  });

  it('upserts incoming combos when no existing record', async () => {
    const mockSupabase = createMockSupabase({
      selectData: null,
      selectError: { message: 'No rows found' },
    });

    const result = await handlePostComboCodex(
      'user-123',
      { discoveredCombos: ['bomb_bomb'] },
      mockSupabase,
    );

    expect(result.status).toBe(200);
    expect(result.data.discoveredCombos).toContain('bomb_bomb');
  });

  it('deduplicates overlapping combos on upsert', async () => {
    const mockSupabase = createMockSupabase({
      selectData: { discovered_combos: ['bomb_bomb', 'prism_prism'] },
    });

    const result = await handlePostComboCodex(
      'user-123',
      { discoveredCombos: ['bomb_bomb'] }, // already known
      mockSupabase,
    );

    expect(result.status).toBe(200);
    const discoveredCombos = result.data.discoveredCombos as string[];
    expect(discoveredCombos.filter((c: string) => c === 'bomb_bomb')).toHaveLength(1);
    expect(discoveredCombos).toContain('prism_prism');
  });

  it('returns 400 when discoveredCombos is missing from body', async () => {
    const mockSupabase = createMockSupabase();
    const result = await handlePostComboCodex('user-123', {}, mockSupabase);
    expect(result.status).toBe(400);
  });

  it('returns 400 when discoveredCombos is not an array', async () => {
    const mockSupabase = createMockSupabase();
    const result = await handlePostComboCodex(
      'user-123',
      { discoveredCombos: 'bomb_bomb' as unknown as string[] },
      mockSupabase,
    );
    expect(result.status).toBe(400);
  });

  it('returns 500 when upsert fails', async () => {
    const mockSupabase = createMockSupabase({
      selectData: { discovered_combos: [] },
      upsertError: { message: 'upsert failed' },
    });

    const result = await handlePostComboCodex(
      'user-123',
      { discoveredCombos: ['bomb_bomb'] },
      mockSupabase,
    );

    expect(result.status).toBe(500);
  });
});

// ==================== Auth guard integration ====================

describe('Auth guard (POST/GET route handlers)', () => {
  // These tests verify the route-level auth guard behavior.
  // The actual POST/GET functions handle auth themselves;
  // handlePost/Get take userId directly (after auth check upstream).

  it('handleGetComboCodex with empty userId should still query (auth is upstream)', async () => {
    // Auth is checked in the Next.js route wrapper, not in the handler.
    // Handler receives a pre-validated userId string.
    const mockSupabase = createMockSupabase({
      selectData: { discovered_combos: [] },
    });
    const result = await handleGetComboCodex('', mockSupabase);
    // Handler queries even with empty string — auth gate is in route.ts POST/GET functions
    expect(result.status).toBe(200);
  });
});
