// Writes every email sample to <outDir>/<name>.<locale>.html with art served from public/.
// npx tsx scripts/render-email-previews.ts <outDir>
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EmailSample } from '../lib/email/samples/types';

const out = resolve(process.argv[2] ?? 'email-previews');
const pub = 'file://' + resolve(__dirname, '..', 'public');
mkdirSync(out, { recursive: true });
const dir = resolve(__dirname, '..', 'lib', 'email', 'samples');
(async () => {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sample.ts'))) {
    const { samples } = (await import(join(dir, f))) as { samples: EmailSample[] };
    for (const s of samples) {
      const { subject, html } = await s.render();
      writeFileSync(join(out, `${s.name}.${s.locale}.html`), html.replace(/https:\/\/www\.lexiclash\.live\/(email\/|icon-192\.png)/g, `${pub}/$1`).replace('<body', `<!-- ${subject.replace(/--/g, '')} --><body`));
    }
  }
  console.log('wrote', readdirSync(out).length, 'files to', out);
})();
