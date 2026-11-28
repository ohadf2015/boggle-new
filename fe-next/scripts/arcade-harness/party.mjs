import { chromium } from 'playwright';
const [base, game = 'catch', out = '/tmp'] = process.argv.slice(2);
const hol = game === 'catch' ? 'hanukkah' : 'christmas';
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errs = [];
const tv = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
tv.on('pageerror', (e) => errs.push('tv ' + e.message));
await tv.goto(`${base}/?g=${game}&h=${hol}&mode=tv`);
await tv.waitForSelector('[data-testid=party-code]');
const code = (await tv.getByTestId('party-code').textContent()).trim();
const phones = [];
for (const name of ['Ana', 'Ben', 'Cy']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  p.on('pageerror', (e) => errs.push(name + ' ' + e.message));
  await p.goto(`${base}/?party=${code}`);
  await p.getByRole('textbox').fill(name);
  await p.getByRole('button').last().click();
  await p.waitForSelector('[data-testid=party-waiting]');
  phones.push(p);
}
await tv.waitForTimeout(600);
await tv.screenshot({ path: `${out}/party-${game}-tv-lobby.png` });
await phones[0].screenshot({ path: `${out}/party-${game}-phone-lobby.png` });
const t0 = Date.now();
await tv.getByTestId('party-start').click();
await phones[0].waitForSelector('[data-testid^=party-]:is([data-testid=party-hold],[data-testid=party-slide],[data-testid=party-field])');
console.log('lobby->controller ms', Date.now() - t0);
const pad = game === 'dash' ? 'party-hold' : game === 'catch' ? 'party-slide' : 'party-field';
for (let i = 0; i < 40; i++) {
  for (const [k, p] of phones.entries()) {
    const box = await p.getByTestId(pad).boundingBox();
    const x = box.x + box.width * ((i * 0.13 + k * 0.3) % 1), y = box.y + box.height * (0.3 + ((i + k) % 5) * 0.12);
    if (game === 'dash') { await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up(); }
    else if (game === 'catch') { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 20, y); await p.mouse.up(); }
    else {
      const forts = p.locator('[data-testid=party-field] button');
      await forts.nth((i + k) % (await forts.count())).click();
    }
  }
  if (i === 15) { await tv.screenshot({ path: `${out}/party-${game}-tv-mid.png` }); await phones[0].screenshot({ path: `${out}/party-${game}-phone-mid.png` }); }
  await tv.waitForTimeout(150);
}
await tv.waitForSelector('[data-testid=party-podium]', { timeout: 90000 });
await tv.waitForTimeout(900);
await tv.screenshot({ path: `${out}/party-${game}-tv-podium.png` });
await phones[1].screenshot({ path: `${out}/party-${game}-phone-podium.png` });
console.log('podium', (await tv.getByTestId('party-podium').textContent()).slice(0, 80), 'errors', errs.slice(0, 3));
await b.close();
