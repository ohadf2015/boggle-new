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

describe('the native callback hop keeps next', () => {
  it.each([
    ['ios', 'ru', '/ru/student/join'],
    ['android', 'en', '/en/education/access?from=teacher'],
  ])('%s: Supabase adds the code, DeepLinkHandler routes it, the callback resolves back to %s', async (platform, locale, origin) => {
    const { buildDeepLinkRoute } = await import('@/components/DeepLinkHandler');
    const { nativeOAuthRedirectUrl, resolveAuthNext } = await import('@/lib/navigation/authReturnPath');
    const returned = `${nativeOAuthRedirectUrl(platform, locale, origin)}&code=abc`;
    const route = buildDeepLinkRoute(returned, 'en')!.route;
    const params = new URL(route, 'https://x').searchParams;
    expect(new URL(route, 'https://x').pathname).toBe(`/${locale}/auth/callback`);
    expect(params.get('code')).toBe('abc');
    expect(resolveAuthNext(params.get('next'), locale).url).toBe(origin);
  });
});
