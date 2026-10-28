
describe('public subdirectory assets', () => {
  it('passes static files under public/ subdirectories (mascot loader regression)', async () => {
    const { decideNextHandle } = await import('./nextHandleGate');
    for (const p of ['/mascot/winner.webp', '/mascots/styles/arcade.png', '/home/daily-streak.webp', '/mascot/posters/x.jpg', '/sql/sql-wasm.wasm', '/i18n/en.landing.32ac01bc.js']) {
      expect(decideNextHandle(p)).toEqual({ action: 'pass' });
    }
  });
  it('still drops unknown non-public paths and locale probes', async () => {
    const { decideNextHandle } = await import('./nextHandleGate');
    expect(decideNextHandle('/randomscan/x.php').action).toBe('drop');
    expect(decideNextHandle('/he/mascot/x.webp').action).toBe('drop');
  });
  it('PUBLIC_DIRS matches public/ on disk', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { PUBLIC_DIRS } = await import('./nextHandleGate');
    const onDisk = fs.readdirSync(path.join(process.cwd(), 'public'), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();
    expect(onDisk.filter((d) => !PUBLIC_DIRS.has(d))).toEqual([]);
  });
});
