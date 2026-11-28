const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const RECENT = 20261113000000n;

describe('migration versions', () => {
  it('Given two recent migrations, then they never share a version, because the deploy applier records one and skips the other', () => {
    const seen = new Map();
    const clashes = [];
    for (const f of fs.readdirSync(dir)) {
      const m = /^(\d+)_.+\.sql$/.exec(f);
      if (!m || BigInt(m[1]) < RECENT) continue;
      if (seen.has(m[1])) clashes.push(`${seen.get(m[1])} + ${f}`);
      else seen.set(m[1], f);
    }
    expect(clashes).toEqual([]);
  });
});
