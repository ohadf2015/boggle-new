import { performMobileOAuth } from '../mobileOAuth';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock('@/utils/platform', () => ({ isNative: () => true }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

function onNativePage(platform: string, path: string): void {
  (globalThis as any).Capacitor = { getPlatform: () => platform, Plugins: { Browser: { open: vi.fn() } } };
  window.history.replaceState(null, '', path);
}

describe('native sign-in keeps the classroom return path', () => {
  beforeEach(() => {
    (supabase!.auth.signInWithOAuth as any).mockResolvedValue({ data: { url: 'https://accounts.example/x' }, error: null });
  });
  afterEach(() => {
    delete (globalThis as any).Capacitor;
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['android', '/en/teacher', 'https://www.lexiclash.live/en/auth/callback?from_app=true&next=%2Fen%2Fteacher'],
    ['ios', '/ru/student/join?code=AB12', 'lexiclash://auth/callback?locale=ru&next=%2Fru%2Fstudent%2Fjoin%3Fcode%3DAB12'],
    ['android', '/en/education/access?from=teacher', 'https://www.lexiclash.live/en/auth/callback?from_app=true&next=%2Fen%2Feducation%2Faccess%3Ffrom%3Dteacher'],
    ['android', '/en', 'https://www.lexiclash.live/en/auth/callback?from_app=true'],
    ['ios', '/en/daily', 'lexiclash://auth/callback?locale=en'],
  ])('%s sign-in from %s', async (platform, path, expected) => {
    onNativePage(platform, path);
    await performMobileOAuth('google');
    const { redirectTo } = (supabase!.auth.signInWithOAuth as any).mock.calls.at(-1)[0].options;
    expect(redirectTo).toBe(expected);
  });
});
