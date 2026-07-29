// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: class {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
  },
}));

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabase),
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fakepng')),
  })),
}));

vi.mock('@/components/avatar/AvatarRendererSsr', () => ({
  default: () => null,
}));

vi.mock('react-dom/server', () => ({
  renderToStaticMarkup: vi.fn(() => '<svg></svg>'),
}));

describe('GET /api/avatar/png/[playerId]', () => {
  let GET: (req: Request, ctx: { params: Promise<{ playerId: string }> }) => Promise<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import('../route'));
  });

  const makeCtx = (id: string) => ({
    params: Promise.resolve({ playerId: id }),
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await GET(new Request('http://x/api/avatar/png/bad-id'), makeCtx('bad-id'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when supabase unavailable', async () => {
    const { getSupabaseAdmin } = await import('@/lib/email');
    (getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const id = '4d68a876-a3ee-4687-8a66-65b93f0c12c7';
    const res = await GET(new Request(`http://x/api/avatar/png/${id}`), makeCtx(id));
    expect(res.status).toBe(404);
  });

  it('returns 404 when no avatar_config found', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const id = '4d68a876-a3ee-4687-8a66-65b93f0c12c7';
    const res = await GET(new Request(`http://x/api/avatar/png/${id}`), makeCtx(id));
    expect(res.status).toBe(404);
  });

  it('returns 200 PNG for valid avatar_config', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { avatar_config: { base: 'round', skinColor: '#FFD700', bgColor: '#000', eyes: 'round', mouth: 'smile', hair: 'none', hairColor: '#000', accessory: 'none', accessoryColor: '#000', shirtColor: '#000' } },
    });
    const id = '4d68a876-a3ee-4687-8a66-65b93f0c12c7';
    const res = await GET(new Request(`http://x/api/avatar/png/${id}`), makeCtx(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
