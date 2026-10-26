import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pickNewestGreen,
  computeLag,
  commitState,
  run,
} from './check-deploy-lag.mjs';

const T = (offsetMin) => new Date(Date.now() + offsetMin * 60000).toISOString();

// ---------- pickNewestGreen ----------

test('picks first green (success) commit, skipping red ones', () => {
  const commits = [
    { sha: 'aaaa', date: T(0), state: 'failure' },
    { sha: 'bbbb', date: T(-30), state: 'pending' },
    { sha: 'cccc', date: T(-60), state: 'success' },
  ];
  assert.equal(pickNewestGreen(commits).sha, 'cccc');
});

test('treats commits with no CI attached as green', () => {
  const commits = [{ sha: 'aaaa', date: T(0), state: null }];
  assert.equal(pickNewestGreen(commits).sha, 'aaaa');
});

test('returns null when no commit is green', () => {
  const commits = [
    { sha: 'aaaa', date: T(0), state: 'failure' },
    { sha: 'bbbb', date: T(-30), state: 'pending' },
  ];
  assert.equal(pickNewestGreen(commits), null);
});

// ---------- computeLag ----------

test('equal shas are never behind', () => {
  const lag = computeLag({ greenSha: 'abc123', greenDate: T(-5), prodSha: 'abc123' });
  assert.deepEqual(lag, { behind: false, basis: 'sha', lagMinutes: 0 });
});

test('sha basis: prod commit older than green commit = behind', () => {
  const lag = computeLag({
    greenSha: 'gggg',
    greenDate: T(-180),
    prodSha: 'pppp',
    prodDate: T(-180),
  });
  assert.equal(lag.behind, false); // equal dates -> not behind
  const lag2 = computeLag({
    greenSha: 'gggg',
    greenDate: T(-60),
    prodSha: 'pppp',
    prodDate: T(-300),
  });
  assert.equal(lag2.behind, true);
  assert.equal(lag2.basis, 'sha');
  assert.equal(Math.round(lag2.lagMinutes), 240);
});

test('buildTime basis: prod sha unknown falls back to buildTime', () => {
  const lag = computeLag({
    greenSha: 'gggg',
    greenDate: T(-60),
    prodSha: null,
    prodBuildTime: T(-300),
  });
  assert.equal(lag.behind, true);
  assert.equal(lag.basis, 'buildTime');
  assert.equal(Math.round(lag.lagMinutes), 240);
});

test('prod newer than the green commit is not behind (deploy in flight)', () => {
  const lag = computeLag({
    greenSha: 'gggg',
    greenDate: T(-300),
    prodSha: 'pppp',
    prodDate: T(-60),
  });
  assert.equal(lag.behind, false);
});

test('no usable data -> basis none, not behind', () => {
  const lag = computeLag({ greenSha: 'gggg', greenDate: T(-5), prodSha: null, prodBuildTime: null });
  assert.equal(lag.behind, false);
  assert.equal(lag.basis, 'none');
});

// ---------- commitState ----------

test('no statuses and no check runs -> null (no CI)', async () => {
  const io = githubIo({
    '/repos/r/commits/aaa/status': { status: 200, json: { statuses: [] } },
    '/repos/r/commits/aaa/check-runs?per_page=100': { status: 200, json: { check_runs: [] } },
  });
  assert.equal(await commitState(io, 'tok', 'r', 'aaa'), null);
});

test('in-progress check run -> pending', async () => {
  const io = githubIo({
    '/repos/r/commits/aaa/status': { status: 200, json: { statuses: [] } },
    '/repos/r/commits/aaa/check-runs?per_page=100': {
      status: 200,
      json: { check_runs: [{ status: 'in_progress', conclusion: null }] },
    },
  });
  assert.equal(await commitState(io, 'tok', 'r', 'aaa'), 'pending');
});

test('all checks success -> success; a failing check -> failure', async () => {
  const io = githubIo({
    '/repos/r/commits/aaa/status': { status: 200, json: { statuses: [] } },
    '/repos/r/commits/aaa/check-runs?per_page=100': {
      status: 200,
      json: { check_runs: [{ status: 'completed', conclusion: 'success' }] },
    },
    '/repos/r/commits/bbb/status': { status: 200, json: { statuses: [] } },
    '/repos/r/commits/bbb/check-runs?per_page=100': {
      status: 200,
      json: { check_runs: [{ status: 'completed', conclusion: 'failure' }] },
    },
  });
  assert.equal(await commitState(io, 'tok', 'r', 'aaa'), 'success');
  assert.equal(await commitState(io, 'tok', 'r', 'bbb'), 'failure');
});

// ---------- run() end-to-end with fake io ----------

function githubIo(routes) {
  return {
    async github(token, path, { method = 'GET', body } = {}) {
      const route = routes[path];
      if (route) {
        if (method === 'GET') return route;
        return route[method] || { status: 404, json: null };
      }
      if (method === 'POST' && path === '/repos/r/issues') {
        return { status: 201, json: { number: 99 } };
      }
      if (method === 'POST' && path.endsWith('/comments')) return { status: 201, json: {} };
      if (method === 'PATCH') return { status: 200, json: {} };
      if (method === 'POST' && path === '/repos/r/labels') return { status: 201, json: {} };
      return { status: 404, json: null };
    },
  };
}

const HEAD = { sha: 'deadbe11', commit: { committer: { date: T(-20) } } };
const GREEN = { sha: 'cafe2222', commit: { committer: { date: T(-30) } } };

function baseRoutes(prodSha = HEAD.sha, openIssues = []) {
  return {
    '/repos/r/commits/master': { status: 200, json: HEAD },
    [`/repos/r/commits/${prodSha}`]: { status: 200, json: { sha: prodSha, commit: { committer: { date: T(-30) } } } },
    '/repos/r/issues?state=open&labels=deploy-lag&per_page=10': { status: 200, json: openIssues },
    '/repos/r/commits?sha=master&per_page=10': { status: 200, json: [HEAD] },
    [`/repos/r/commits/${HEAD.sha}/status`]: { status: 200, json: { statuses: [] } },
    [`/repos/r/commits/${HEAD.sha}/check-runs?per_page=100`]: {
      status: 200,
      json: { check_runs: [{ status: 'completed', conclusion: 'success' }] },
    },
  };
}

function prodIo(overrides = {}) {
  return {
    async getJson(url) {
      return overrides[url] || { ok: true, json: { buildTime: T(-30), commit: HEAD.sha } };
    },
    log: () => {},
    ...('github' in overrides ? { github: overrides.github } : {}),
  };
}

const env = {
  GITHUB_TOKEN: 'tok',
  GUARD_REPO: 'r',
  GUARD_BRANCH: 'master',
  GUARD_VERSION_URL: 'https://prod.test/api/version',
  GUARD_HEALTH_URL: 'https://prod.test/api/health',
  GUARD_THRESHOLD_MINUTES: '120',
};

test('run: prod up to date -> ok, no issue writes', async () => {
  const calls = [];
  const io = prodIo({
    github: async (token, path, opts = {}) => {
      calls.push([path, opts.method || 'GET']);
      return githubIo(baseRoutes()).github(token, path, opts);
    },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'ok');
  assert.ok(!calls.some(([p, m]) => m !== 'GET'), 'expected read-only run');
});

test('run: lag below threshold -> ok', async () => {
  const prodSha = 'b00b0003';
  const routes = baseRoutes(prodSha);
  routes['/repos/r/commits?sha=master&per_page=10'] = { status: 200, json: [HEAD, GREEN] };
  routes[`/repos/r/commits/${GREEN.sha}`] = { status: 200, json: { sha: GREEN.sha, commit: { committer: { date: T(-100) } } } };
  routes[`/repos/r/commits/${GREEN.sha}/status`] = { status: 200, json: { statuses: [] } };
  routes[`/repos/r/commits/${GREEN.sha}/check-runs?per_page=100`] = { status: 200, json: { check_runs: [] } };
  const io = prodIo({
    github: async (token, path, opts = {}) => githubIo(routes).github(token, path, opts),
    'https://prod.test/api/version': { ok: true, json: { buildTime: T(-100), commit: prodSha } },
    'https://prod.test/api/health': { ok: true, json: { commit: prodSha } },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'ok');
  assert.equal(res.lag.behind, true);
  assert.ok(res.lag.lagMinutes < 120);
});

test('run: lag above threshold -> opens one issue + ensures label', async () => {
  const prodSha = 'b00b0003';
  const routes = baseRoutes(prodSha);
  routes['/repos/r/commits?sha=master&per_page=10'] = { status: 200, json: [HEAD] };
  // head check runs: success; prod commit is 300 min old -> lag ~280 min
  routes[`/repos/r/commits/${prodSha}`] = { status: 200, json: { sha: prodSha, commit: { committer: { date: T(-320) } } } };
  const seen = [];
  const io = prodIo({
    github: async (token, path, opts = {}) => {
      seen.push([path, opts.method || 'GET']);
      return githubIo(routes).github(token, path, opts);
    },
    'https://prod.test/api/version': { ok: true, json: { buildTime: T(-320), commit: prodSha } },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'opened');
  assert.ok(res.lag.lagMinutes > 120);
  assert.ok(seen.some(([p, m]) => m === 'POST' && p === '/repos/r/labels'));
  assert.ok(seen.some(([p, m]) => m === 'POST' && p === '/repos/r/issues'));
});

test('run: lag above threshold but alert already open -> comments, no new issue', async () => {
  const prodSha = 'b00b0003';
  const routes = baseRoutes(prodSha, [{ number: 7 }]);
  routes[`/repos/r/commits/${prodSha}`] = { status: 200, json: { sha: prodSha, commit: { committer: { date: T(-320) } } } };
  const seen = [];
  const io = prodIo({
    github: async (token, path, opts = {}) => {
      seen.push([path, opts.method || 'GET']);
      return githubIo(routes).github(token, path, opts);
    },
    'https://prod.test/api/version': { ok: true, json: { buildTime: T(-320), commit: prodSha } },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'updated');
  assert.ok(!seen.some(([p, m]) => m === 'POST' && p === '/repos/r/issues'));
  assert.ok(seen.some(([p, m]) => m === 'POST' && p === '/repos/r/issues/7/comments'));
});

test('run: lag resolved -> closes open alert with a comment', async () => {
  const routes = baseRoutes(HEAD.sha, [{ number: 7 }]);
  const seen = [];
  const io = prodIo({
    github: async (token, path, opts = {}) => {
      seen.push([path, opts.method || 'GET']);
      return githubIo(routes).github(token, path, opts);
    },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'closed');
  assert.ok(seen.some(([p, m]) => m === 'PATCH' && p === '/repos/r/issues/7'));
  assert.ok(seen.some(([p, m]) => m === 'POST' && p === '/repos/r/issues/7/comments'));
});

test('run: prod endpoints unreachable -> skips (keep-alive owns downtime)', async () => {
  const io = prodIo({
    github: (token, path, opts = {}) => githubIo(baseRoutes()).github(token, path, opts),
    'https://prod.test/api/version': { ok: false, json: null },
    'https://prod.test/api/health': { ok: false, json: null },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'skip-unreachable');
});

test('run: red head commit, older green used for lag', async () => {
  const prodSha = 'b00b0003';
  const redHead = { sha: 'dead4444', commit: { committer: { date: T(-10) } } };
  const routes = baseRoutes(prodSha);
  routes['/repos/r/commits/master'] = { status: 200, json: redHead };
  routes['/repos/r/commits?sha=master&per_page=10'] = { status: 200, json: [redHead, GREEN] };
  routes[`/repos/r/commits/${redHead.sha}/status`] = { status: 200, json: { statuses: [] } };
  routes[`/repos/r/commits/${redHead.sha}/check-runs?per_page=100`] = {
    status: 200,
    json: { check_runs: [{ status: 'completed', conclusion: 'failure' }] },
  };
  routes[`/repos/r/commits/${GREEN.sha}/status`] = { status: 200, json: { statuses: [] } };
  routes[`/repos/r/commits/${GREEN.sha}/check-runs?per_page=100`] = {
    status: 200,
    json: { check_runs: [{ status: 'completed', conclusion: 'success' }] },
  };
  routes[`/repos/r/commits/${GREEN.sha}`] = { status: 200, json: { sha: GREEN.sha, commit: { committer: { date: T(-300) } } } };
  routes[`/repos/r/commits/${prodSha}`] = { status: 200, json: { sha: prodSha, commit: { committer: { date: T(-480) } } } };
  const io = prodIo({
    github: (token, path, opts = {}) => githubIo(routes).github(token, path, opts),
    'https://prod.test/api/version': { ok: true, json: { buildTime: T(-480), commit: prodSha } },
  });
  const res = await run(env, io);
  assert.equal(res.action, 'opened');
  assert.equal(res.lag.basis, 'sha');
  assert.ok(res.lag.lagMinutes > 120); // lag vs the older GREEN commit, ignoring the red head
});
