import { writeFileSync } from 'fs';

const m = await import('@/lib/holidays/arcade/content.server');
const build = (m.buildContent ?? (m as unknown as { default: typeof m }).default.buildContent) as typeof m.buildContent;
const games = ['oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap'] as const;
const content: Record<string, unknown> = {};
for (const g of games) content[g] = await build(g, 'en', 1234, () => false);
writeFileSync(process.argv[2], JSON.stringify(content));
