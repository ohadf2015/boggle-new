import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const files = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : files(rel);
    return /\.tsx?$/.test(e.name) ? [rel] : [];
  });
const staticImport = /^import (?!type\b)[^;]*from '(pixi\.js|matter-js|@\/lib\/gameEngine(\/index)?|@\/lib\/gameEngine\/ParticleSystem)';/m;

describe('holiday arcade bundle boundary', () => {
  it('Given the hub, tile, shell and game list, then none of them pulls pixi, matter or the kit into the page bundle', () => {
    for (const f of ['ArcadeHub.tsx', 'ArcadeTile.tsx', 'ArcadeShell.tsx', 'ArcadeGameHost.tsx', 'ArcadeCard.tsx', '../../../lib/holidays/arcade/games.ts']) {
      const src = read(f);
      expect(src, f).not.toMatch(staticImport);
      expect(src, f).not.toMatch(/from '\.\/(kit|family)\//);
    }
  });

  it('Given the family games, then the host loads each one lazily', () => {
    const host = read('ArcadeGameHost.tsx');
    for (const g of ['LatkeFlip', 'SpinOff', 'PresentStack', 'SnowballSplat']) expect(host).toContain(`dynamic(() => import('./family/${g}')`);
  });

  it('Given the kit and family scenes, then pixi is only imported at runtime by the stage', () => {
    for (const f of [...files('kit'), ...files('family')]) expect(read(f), f).not.toMatch(staticImport);
    expect(read('kit/PixiStage.tsx')).toContain("await import('pixi.js')");
  });
});
