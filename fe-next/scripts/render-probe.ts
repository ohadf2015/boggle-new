import { render } from '@react-email/components';
import AndroidBetaLaunchEmail from '@/emails/androidBetaLaunch';

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const out = await fn();
  console.log(`${label} OK in ${Date.now() - t0}ms`);
  return out;
}

async function main() {
  const props = {
    recipientName: 'Tester',
    language: 'en',
    unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=' + '0'.repeat(64),
    playUrl: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
  };

  const total = Date.now();

  const html = await time('html-only', () => render(AndroidBetaLaunchEmail(props)));
  const text = await time('text-only', () => render(AndroidBetaLaunchEmail(props), { plainText: true }));
  console.log(`  html=${html.length}B text=${text.length}B`);

  const [p1, p2] = await time('parallel', () =>
    Promise.all([
      render(AndroidBetaLaunchEmail(props)),
      render(AndroidBetaLaunchEmail(props), { plainText: true }),
    ]),
  );
  console.log(`  parallel html=${p1.length}B text=${p2.length}B`);

  // Try all 5 languages
  for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
    await time(`lang=${lang} parallel`, () =>
      Promise.all([
        render(AndroidBetaLaunchEmail({ ...props, language: lang })),
        render(AndroidBetaLaunchEmail({ ...props, language: lang }), { plainText: true }),
      ]),
    );
  }

  console.log(`TOTAL ${Date.now() - total}ms`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
