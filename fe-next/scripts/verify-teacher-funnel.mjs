#!/usr/bin/env node
// Real-HTTP Teacher Pro trial→paid proof. Disposable Postgres. `npm run check`.
// Never talks to hosted Supabase. A prod URL here is a hard stop.
import { spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertDisposableSupabase, stripHostedSupabaseEnv } from './disposableSupabase.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const feNext = join(here, '..');

if (!process.env.VERIFY_TEACHER_FUNNEL_HOOKED) {
  const childEnv = { ...process.env, VERIFY_TEACHER_FUNNEL_HOOKED: '1', LD_LIBRARY_PATH: '' };
  // A shell that already points at LexiClash prod must not be inherited. The child
  // only talks to the local stub it starts below.
  stripHostedSupabaseEnv(childEnv);
  const child = spawnSync(process.execPath, [
    '--import', 'tsx',
    '--import', join(here, 'verify-teacher-funnel-register.mjs'),
    fileURLToPath(import.meta.url),
  ], {
    stdio: 'inherit',
    cwd: feNext,
    env: childEnv,
  });
  process.exit(child.status ?? 1);
}

// Sync hook — module.register() from --import loses the race against route imports.
// Strip again in this process: a direct --import run must not keep a hosted URL either.
stripHostedSupabaseEnv(process.env);
const shimUrl = pathToFileURL(join(here, 'verify-teacher-funnel-next-headers.mjs')).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers') {
      return { url: shimUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { SignJWT, jwtVerify } = await import('jose');
const { NextRequest } = await import('next/server');
const { requestStore } = await import(shimUrl);

const JWT_SECRET = 'verify-teacher-funnel-jwt-secret-32b!!';
const WEBHOOK_SECRET = 'verify-teacher-funnel-webhook-secret';
const PRODUCT_ID = 'prod_teacher_pro_e2e';
const TEACHER_ID = randomUUID();
const ADMIN_ID = randomUUID();
const TEACHER_EMAIL = 'funnel.teacher@school.edu';
const ADMIN_EMAIL = 'funnel.admin@school.edu';
const base = 20000 + (process.pid % 20000);
const PG_PORT = base;
const PGRST_PORT = base + 1;
const SUPA_PORT = base + 2;
const APP_PORT = base + 3;
const key = new TextEncoder().encode(JWT_SECRET);
const transcript = [];
const failures = [];

function check(name, ok, detail = '') {
  const line = `${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  if (!ok) failures.push(line);
}

function pgBin() {
  if (process.env.POSTGRES_BIN && existsSync(process.env.POSTGRES_BIN)) return process.env.POSTGRES_BIN;
  const known = '/home/hermes/.hermes/profiles/vp-engineering/home/pg18/bin/postgres';
  if (existsSync(known)) return known;
  const found = spawnSync('bash', ['-lc', 'command -v postgres'], { encoding: 'utf8' }).stdout.trim();
  if (found) return found;
  throw new Error('postgres binary not found — set POSTGRES_BIN');
}

function psqlBin(postgres) {
  if (process.env.PSQL_BIN && existsSync(process.env.PSQL_BIN)) return process.env.PSQL_BIN;
  const beside = join(dirname(postgres), 'psql');
  if (existsSync(beside)) return beside;
  const known = '/home/hermes/.hermes/profiles/vp-engineering/home/pg15root/usr/lib/postgresql/15/bin/psql';
  if (existsSync(known)) return known;
  const found = spawnSync('bash', ['-lc', 'command -v psql'], { encoding: 'utf8' }).stdout.trim();
  if (found) return found;
  throw new Error('psql binary not found — set PSQL_BIN');
}
function pgEnv(bin) {
  return { ...process.env, LD_LIBRARY_PATH: join(dirname(bin), '../lib'), LC_ALL: 'C' };
}
function run(bin, args, env, cwd) {
  const res = spawnSync(bin, args, { env, cwd, encoding: 'utf8' });
  if (res.status !== 0) {
    const detail = res.stderr || res.stdout || res.error?.message || `status ${res.status}`;
    throw new Error(`${bin} ${args[0]} failed: ${detail}`);
  }
  return res.stdout;
}
async function signToken(claims, subject) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key);
}
function sessionCookie(accessToken, user) {
  const session = {
    access_token: accessToken,
    refresh_token: 'unused',
    expires_in: 7200,
    expires_at: Math.floor(Date.now() / 1000) + 7200,
    token_type: 'bearer',
    user,
  };
  const raw = Buffer.from(JSON.stringify(session)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `sb-127-auth-token=base64-${raw}`;
}
function signWebhook(body) {
  const id = `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', Buffer.from(WEBHOOK_SECRET)).update(`${id}.${timestamp}.${body}`).digest('base64');
  return {
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sig}`,
    'content-type': 'application/json',
  };
}
function listen(server, port) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function main() {
  delete process.env.LD_LIBRARY_PATH;
  const postgres = pgBin();
  const sqlBin = psqlBin(postgres);
  const env = pgEnv(postgres);
  const binDir = dirname(postgres);
  const dataDir = join(process.env.TMPDIR || '/tmp', `teacher-funnel-pg-${process.pid}`);
  mkdirSync(dataDir, { recursive: true });
  run(join(binDir, 'initdb'), ['-D', dataDir, '--username=postgres', '--auth=trust', '--no-sync'], env);
  const log = join(dataDir, 'server.log');
  run(join(binDir, 'pg_ctl'), ['-D', dataDir, '-l', log, '-o', `-p ${PG_PORT} -c listen_addresses=127.0.0.1`, 'start'], env);
  const psql = (sql, db = 'postgres') => run(sqlBin, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql], env).trim();
  const stopPg = () => spawnSync(join(binDir, 'pg_ctl'), ['-D', dataDir, 'stop', '-m', 'fast'], { env });

  let pgrst;
  let supa;
  let app;
  try {
    psql('CREATE DATABASE teacher_funnel');
    const schema = readFileSync(join(here, 'verify-teacher-funnel.schema.sql'), 'utf8');
    const applied = spawnSync(sqlBin, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'teacher_funnel', '-v', 'ON_ERROR_STOP=1'], {
      env, input: schema, encoding: 'utf8',
    });
    if (applied.status !== 0) throw new Error(applied.stderr || applied.stdout);

    psql(`INSERT INTO auth.users (id, email) VALUES ('${TEACHER_ID}', '${TEACHER_EMAIL}'), ('${ADMIN_ID}', '${ADMIN_EMAIL}')`, 'teacher_funnel');
    psql(`INSERT INTO public.profiles (id, username, display_name, user_role, is_admin) VALUES
      ('${TEACHER_ID}', 'funnelteacher', 'Funnel Teacher', 'student', false),
      ('${ADMIN_ID}', 'funneladmin', 'Funnel Admin', 'admin', true)`, 'teacher_funnel');

    const pgrstBin = process.env.POSTGREST_BIN || '/home/hermes/.hermes/profiles/dev/cache/scratch/postgrest/postgrest';
    if (!existsSync(pgrstBin)) throw new Error(`postgrest not found at ${pgrstBin} — set POSTGREST_BIN`);
    const conf = join(dataDir, 'postgrest.conf');
    writeFileSync(conf, [
      `db-uri = "postgres://authenticator:funnel-auth@127.0.0.1:${PG_PORT}/teacher_funnel"`,
      'db-schemas = "public"',
      'db-anon-role = "anon"',
      `jwt-secret = "${JWT_SECRET}"`,
      'server-host = "127.0.0.1"',
      `server-port = ${PGRST_PORT}`,
    ].join('\n'));
    const { spawn } = await import('node:child_process');
    const pgrstProc = spawn(pgrstBin, [conf], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LD_LIBRARY_PATH: '' } });
    pgrst = pgrstProc;
    let pgrstLog = '';
    pgrstProc.stderr.on('data', (c) => { pgrstLog += c; });
    pgrstProc.stdout.on('data', (c) => { pgrstLog += c; });

    const teacherToken = await signToken({ role: 'authenticated', email: TEACHER_EMAIL }, TEACHER_ID);
    const adminToken = await signToken({ role: 'authenticated', email: ADMIN_EMAIL }, ADMIN_ID);
    const serviceKey = await signToken({ role: 'service_role' }, '00000000-0000-0000-0000-000000000000');
    const anonKey = await signToken({ role: 'anon' }, '00000000-0000-0000-0000-000000000001');
    const users = new Map([
      [TEACHER_ID, { id: TEACHER_ID, aud: 'authenticated', role: 'authenticated', email: TEACHER_EMAIL, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: 'Funnel Teacher' } }],
      [ADMIN_ID, { id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: ADMIN_EMAIL, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: 'Funnel Admin' } }],
    ]);

    supa = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/auth/v1/user') {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        jwtVerify(token, key).then(({ payload }) => {
          const user = users.get(payload.sub);
          if (!user) {
            res.writeHead(401, { 'content-type': 'application/json' });
            res.end('{"message":"no user"}');
            return;
          }
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(user));
        }).catch(() => {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end('{"message":"invalid jwt"}');
        });
        return;
      }
      if (!url.pathname.startsWith('/rest/v1')) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const target = (url.pathname.replace(/^\/rest\/v1/, '') || '/') + url.search;
      const preq = httpRequest({
        hostname: '127.0.0.1', port: PGRST_PORT, path: target, method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${PGRST_PORT}` },
      }, (pres) => {
        res.writeHead(pres.statusCode || 502, pres.headers);
        pres.pipe(res);
      });
      preq.on('error', (err) => {
        res.writeHead(502);
        res.end(String(err));
      });
      req.pipe(preq);
    });
    await listen(supa, SUPA_PORT);

    process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${SUPA_PORT}`;
    assertDisposableSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
    process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
    process.env.POLAR_ACCESS_TOKEN = 'polar_e2e_token';
    process.env.POLAR_PRO_PRODUCT_ID = PRODUCT_ID;
    process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.POLAR_ENVIRONMENT = 'production';
    process.env.NEXT_PUBLIC_APP_URL = `http://127.0.0.1:${APP_PORT}`;
    delete process.env.RESEND_API_KEY;

    let checkoutBody = null;
    const realFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const parsed = new URL(url);
      if (parsed.host.endsWith('polar.sh')) {
        if (parsed.pathname.includes('/v1/checkouts')) {
          checkoutBody = JSON.parse(init?.body || '{}');
          return new Response(JSON.stringify({ url: `http://127.0.0.1:${APP_PORT}/polar-checkout/trial`, id: 'chk_e2e' }), {
            status: 201, headers: { 'content-type': 'application/json' },
          });
        }
        if (parsed.pathname.includes('/v1/customer-sessions')) {
          return new Response(JSON.stringify({ customer_portal_url: 'https://polar.sh/e2e/portal' }), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('unmocked polar path ' + parsed.pathname, { status: 404 });
      }
      return realFetch(input, init);
    };

    for (let i = 0; i < 40; i++) {
      try {
        const res = await realFetch(`http://127.0.0.1:${PGRST_PORT}/`);
        if (res.status < 500) break;
      } catch { /* not up */ }
      await new Promise((r) => setTimeout(r, 150));
      if (i === 39) throw new Error(`postgrest did not start: ${pgrstLog.slice(-800)}`);
    }

    const access = await import('../app/api/education/access-request/route.ts');
    const approve = await import('../app/api/admin/teacher-access/[id]/approve/route.ts');
    const funnel = await import('../app/api/education/teacher/funnel-step/route.ts');
    const checkout = await import('../app/api/subscription/checkout/route.ts');
    const webhook = await import('../app/api/webhook/polar/route.ts');
    const status = await import('../app/api/subscription/status/route.ts');

    app = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${APP_PORT}`);
        if (req.method === 'GET' && url.pathname.startsWith('/polar-checkout/')) {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end('<html>trial checkout</html>');
          return;
        }
        const body = await readBody(req);
        const headerMap = new Map();
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === 'string') headerMap.set(k.toLowerCase(), v);
        }
        const jar = new Map();
        for (const part of (headerMap.get('cookie') || '').split(';')) {
          const eq = part.indexOf('=');
          if (eq > 0) jar.set(part.slice(0, eq).trim(), decodeURIComponent(part.slice(eq + 1).trim()));
        }
        const headers = new Headers();
        for (const [k, v] of headerMap) headers.set(k, v);
        const nextReq = new NextRequest(url, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });
        const approveMatch = url.pathname.match(/^\/api\/admin\/teacher-access\/([^/]+)\/approve$/);
        let handler = null;
        let params = {};
        if (req.method === 'POST' && url.pathname === '/api/education/access-request') handler = access.POST;
        else if (req.method === 'GET' && url.pathname === '/api/education/access-request') handler = access.GET;
        else if (req.method === 'POST' && approveMatch) { handler = approve.POST; params = { id: approveMatch[1] }; }
        else if (req.method === 'POST' && url.pathname === '/api/education/teacher/funnel-step') handler = funnel.POST;
        else if (req.method === 'POST' && url.pathname === '/api/subscription/checkout') handler = checkout.POST;
        else if (req.method === 'POST' && url.pathname === '/api/webhook/polar') handler = webhook.POST;
        else if (req.method === 'GET' && url.pathname === '/api/subscription/status') handler = status.GET;
        if (!handler) {
          res.writeHead(404);
          res.end('no route');
          return;
        }
        const result = await requestStore.run({ jar, headerMap }, () => handler(nextReq, { params: Promise.resolve(params) }));
        const text = await result.text();
        const out = {};
        result.headers.forEach((v, k) => { out[k] = v; });
        res.writeHead(result.status, out);
        res.end(text);
      } catch (err) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(err instanceof Error ? err.stack : String(err));
      }
    });
    await listen(app, APP_PORT);

    const teacherUser = users.get(TEACHER_ID);
    const adminUser = users.get(ADMIN_ID);
    const teacherCookie = sessionCookie(teacherToken, teacherUser);
    const adminCookie = sessionCookie(adminToken, adminUser);

    async function call(step, method, path, { cookie, headers = {}, body } = {}) {
      const res = await realFetch(`http://127.0.0.1:${APP_PORT}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
          ...headers,
        },
        body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        redirect: 'manual',
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* html or empty */ }
      transcript.push({ step, method, path, status: res.status, request: body ?? null, response: json ?? text.slice(0, 500) });
      console.log(`HTTP ${method} ${path} → ${res.status}`);
      return { status: res.status, json, text };
    }

    const requested = await call('access-request', 'POST', '/api/education/access-request', {
      cookie: teacherCookie,
      body: { locale: 'en', role: 'teacher', use_case: 'I teach vocabulary three times a week.', school_or_org: 'E2E School' },
    });
    check('access request approves on submit', requested.status === 200 && requested.json?.ok === true, `status=${requested.status} body=${requested.text.slice(0, 180)}`);

    const listed = await call('access-request-read', 'GET', '/api/education/access-request', { cookie: teacherCookie });
    const requestId = listed.json?.row?.id;
    check('access request row is approved', listed.json?.row?.status === 'approved', JSON.stringify(listed.json?.row));

    const approved = await call('admin-approve', 'POST', `/api/admin/teacher-access/${requestId}/approve`, {
      cookie: adminCookie,
      body: {},
    });
    check('admin approve route answers 200', approved.status === 200 && approved.json?.ok === true, approved.text.slice(0, 180));

    const role = psql(`SELECT user_role FROM public.profiles WHERE id = '${TEACHER_ID}'`, 'teacher_funnel');
    check('profile promoted to teacher', role === 'teacher', role);

    const onboarded = await call('onboarding', 'POST', '/api/education/teacher/funnel-step', {
      cookie: teacherCookie,
      body: { step: 'onboarding_completed' },
    });
    check('onboarding beacon 200', onboarded.status === 200, onboarded.text.slice(0, 120));

    const started = await call('start-trial', 'POST', '/api/subscription/checkout', {
      cookie: teacherCookie,
      headers: { 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin', 'user-agent': 'Mozilla/5.0 verify-teacher-funnel' },
      body: { trial: true, locale: 'en' },
    });
    check('trial checkout returns a URL', started.status === 200 && typeof started.json?.url === 'string', started.text.slice(0, 200));
    check('Polar was asked for a 14-day trial', checkoutBody?.allow_trial === true && checkoutBody?.trial_interval_count === 14, JSON.stringify({
      allow_trial: checkoutBody?.allow_trial, trial_interval_count: checkoutBody?.trial_interval_count,
    }));

    const forged = await call('webhook-forged', 'POST', '/api/webhook/polar', {
      headers: { 'webhook-id': 'x', 'webhook-timestamp': '1', 'webhook-signature': 'v1,nope' },
      body: '{"type":"subscription.active"}',
    });
    check('forged webhook signature is 401', forged.status === 401, String(forged.status));

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const trialPayload = {
      type: 'subscription.active',
      data: {
        id: 'sub_e2e_1', status: 'trialing', product_id: PRODUCT_ID,
        metadata: { user_id: TEACHER_ID, trial: true, locale: 'en' },
        trial_end: trialEnd, current_period_end: trialEnd,
        created_at: new Date().toISOString(), modified_at: new Date().toISOString(),
      },
    };
    const trialBody = JSON.stringify(trialPayload);
    const trialed = await call('trial-webhook', 'POST', '/api/webhook/polar', {
      headers: signWebhook(trialBody),
      body: trialBody,
    });
    check('trial_started webhook 200', trialed.status === 200, trialed.text.slice(0, 160));

    const trialing = psql(`SELECT tier || '/' || status FROM public.subscriptions WHERE user_id = '${TEACHER_ID}'`, 'teacher_funnel');
    check('subscription row is pro/trialing', trialing === 'pro/trialing', trialing);

    const trialRead = await call('status-while-trialing', 'GET', '/api/subscription/status', { cookie: teacherCookie });
    check('status API reads trialing teacher as pro', trialRead.json?.has_pro === true && trialRead.json?.status === 'trialing', trialRead.text.slice(0, 220));

    const paidAt = new Date(Date.now() + 1000).toISOString();
    const paidPayload = {
      type: 'subscription.updated',
      data: {
        id: 'sub_e2e_1', status: 'active', product_id: PRODUCT_ID,
        metadata: { user_id: TEACHER_ID, locale: 'en' },
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: trialPayload.data.created_at, modified_at: paidAt,
      },
    };
    const paidBody = JSON.stringify(paidPayload);
    const paid = await call('paid-webhook', 'POST', '/api/webhook/polar', {
      headers: signWebhook(paidBody),
      body: paidBody,
    });
    check('paid-conversion webhook 200', paid.status === 200, paid.text.slice(0, 160));

    const flipped = psql(`SELECT tier || '/' || status FROM public.subscriptions WHERE user_id = '${TEACHER_ID}'`, 'teacher_funnel');
    check('teacher row flipped to pro/active', flipped === 'pro/active', flipped);

    const paidRead = await call('status-after-paid', 'GET', '/api/subscription/status', { cookie: teacherCookie });
    check('status API reads paid teacher as pro', paidRead.json?.has_pro === true && paidRead.json?.tier === 'pro' && paidRead.json?.status === 'active', paidRead.text.slice(0, 240));

    const events = psql(`SELECT event_type FROM public.subscription_events WHERE user_id = '${TEACHER_ID}' ORDER BY created_at`, 'teacher_funnel');
    const written = new Set(events.split('\n').filter(Boolean));
    const trialSql = readFileSync(join(feNext, 'supabase/reports/teacher_trial_funnel.sql'), 'utf8');
    const stepsSql = readFileSync(join(feNext, 'supabase/reports/teacher_funnel_steps_30d.sql'), 'utf8');
    for (const eventType of ['teacher_trial_started', 'teacher_subscription_active', 'checkout_started']) {
      check(`writer key ${eventType} was written`, written.has(eventType), [...written].join(','));
      check(`reader SQL contains ${eventType}`, trialSql.includes(`'${eventType}'`), eventType);
    }
    check('onboarding writer key was written', written.has('teacher_funnel_step'), [...written].join(','));
    check('30d reader queries teacher_funnel_step + onboarding_completed', stepsSql.includes("event_type = 'teacher_funnel_step'") && stepsSql.includes("payload->>'step' = 'onboarding_completed'"));
    check('30d reader queries teacher_trial_started', stepsSql.includes("'teacher_trial_started'"));

    const trialReport = spawnSync(sqlBin, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'teacher_funnel', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', '|', '-f', join(feNext, 'supabase/reports/teacher_trial_funnel.sql')], { env, encoding: 'utf8' });
    check('trial funnel SQL runs', trialReport.status === 0, (trialReport.stderr || '').slice(0, 300));
    const trialRows = Object.fromEntries((trialReport.stdout || '').split('\n').filter(Boolean).map((line) => {
      const [idx, step, teachers] = line.split('|');
      return [step, Number(teachers)];
    }));
    check('reader counts trial_started', trialRows.trial_started >= 1, JSON.stringify(trialRows));
    check('reader counts subscription_active', trialRows.subscription_active >= 1, JSON.stringify(trialRows));
    check('reader counts checkout_started', trialRows.checkout_started >= 1, JSON.stringify(trialRows));

    const stepsReport = spawnSync(sqlBin, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'teacher_funnel', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', '|', '-f', join(feNext, 'supabase/reports/teacher_funnel_steps_30d.sql')], { env, encoding: 'utf8' });
    check('30d funnel SQL runs', stepsReport.status === 0, (stepsReport.stderr || '').slice(0, 300));
    const stepRows = Object.fromEntries((stepsReport.stdout || '').split('\n').filter(Boolean).map((line) => {
      const [step, , teachers] = line.split('|');
      return [step, Number(teachers)];
    }));
    check('reader counts teacher_approved', stepRows.teacher_approved >= 1, JSON.stringify(stepRows));
    check('reader counts onboarding_completed', stepRows.onboarding_completed >= 1, JSON.stringify(stepRows));
    check('reader counts trial_started in the 30d funnel', stepRows.trial_started >= 1, JSON.stringify(stepRows));

    const outPath = join(dataDir, 'transcript.json');
    writeFileSync(outPath, JSON.stringify({ transcript, checkoutBody, events: [...written], trialRows, stepRows, failures }, null, 2));
    console.log(`TRANSCRIPT ${outPath}`);
  } finally {
    app?.close();
    supa?.close();
    if (pgrst && typeof pgrst.kill === 'function') pgrst.kill('SIGTERM');
    stopPg();
  }

  if (failures.length) {
    console.error(`\n${failures.length} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nTeacher Pro trial→paid funnel verified over real HTTP.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
