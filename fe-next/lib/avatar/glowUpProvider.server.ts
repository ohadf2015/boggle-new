/**
 * Server-only Glow-Up provider — shells the Higgsfield CLI + rasterizes with sharp.
 *
 * SERVER ONLY: imports child_process / fs / sharp. Never import from client code.
 * Keeps node-only deps out of the client bundle (the pure interface lives in
 * ./glowUpProvider.ts). Wired into the admin-only glow-up API route.
 *
 * Prod note: the CLI authenticates with a device-login bearer token. On a worker
 * the token must be present + refreshed. This file is the single seam to swap the
 * CLI for a direct backend call later. See the design spec (Track B, §6b).
 */

import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { GLOW_UP_PROMPT, type GlowUpProvider, type GlowUpResult } from './glowUpProvider';
import { getHiggsfieldToken } from './higgsfieldToken';

const HIGGSFIELD_BIN = process.env.HIGGSFIELD_BIN || 'higgsfield';
const MODEL = 'nano_banana_2';

/** Rasterize serialized avatar SVG to a square PNG buffer (navy backdrop). */
export async function rasterizeSvgToPng(svgString: string, size = 512): Promise<Buffer> {
  return sharp(Buffer.from(svgString), { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 26, g: 26, b: 46, alpha: 1 } })
    .png()
    .toBuffer();
}

interface CliJob {
  status?: string;
  result_url?: string;
}

/** Parse `higgsfield generate create --json` stdout → first result_url. */
export function parseResultUrl(stdout: string): string {
  const jobs = JSON.parse(stdout) as CliJob[];
  const url = Array.isArray(jobs) ? jobs.find((j) => j.result_url)?.result_url : undefined;
  if (!url) throw new Error('Higgsfield returned no result_url');
  return url;
}

function runHiggsfield(args: string[], timeoutMs = 8 * 60 * 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(HIGGSFIELD_BIN, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Higgsfield CLI failed: ${stderr || err.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * CLI-backed provider: writes the reference PNG to a temp file, runs Nano Banana
 * with it as `--image`, returns the hosted result URL.
 */
function toBuffer(ref: ArrayBuffer | Uint8Array | Blob): Buffer {
  if (ref instanceof ArrayBuffer) return Buffer.from(ref);
  return Buffer.from(ref as unknown as Uint8Array);
}

export const cliGlowUpProvider: GlowUpProvider = {
  async generate(req): Promise<GlowUpResult> {
    const buf = toBuffer(req.referencePng as ArrayBuffer | Uint8Array);

    const dir = await mkdtemp(join(tmpdir(), 'glowup-'));
    const refPath = join(dir, 'ref.png');
    try {
      await writeFile(refPath, buf);
      const stdout = await runHiggsfield([
        'generate', 'create', MODEL,
        '--prompt', req.prompt || GLOW_UP_PROMPT,
        '--image', refPath,
        '--aspect_ratio', '1:1',
        '--resolution', '2k',
        '--wait', '--wait-timeout', '8m',
        '--json',
      ]);
      return { url: parseResultUrl(stdout) };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
};

// ─────────────────────────── HTTP provider (PROD) ───────────────────────────
// Calls the Higgsfield REST API directly with a bearer token — no CLI binary.
// Verified contract (2026-06-20): upload(?type=image) → PUT bytes → confirm →
// POST /agents/jobs → poll GET /agents/jobs/{id}. Token: same value as
// `higgsfield auth token`; set HIGGSFIELD_TOKEN on the server.

const HF_API_BASE = process.env.HIGGSFIELD_API_BASE || 'https://fnf.higgsfield.ai';

function hfHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Extract the first job id from `POST /agents/jobs` → `["<id>"]`. */
export function extractJobId(createResponse: unknown): string {
  if (Array.isArray(createResponse) && typeof createResponse[0] === 'string') {
    return createResponse[0];
  }
  throw new Error('Higgsfield job create returned no job id');
}

async function hfUpload(token: string, png: Buffer): Promise<string> {
  const qs = new URLSearchParams({
    type: 'image',
    content_type: 'image/png',
    filename: 'ref.png',
    length: String(png.length),
  });
  const createRes = await fetch(`${HF_API_BASE}/agents/uploads?${qs}`, {
    method: 'POST',
    headers: hfHeaders(token),
  });
  if (!createRes.ok) throw new Error(`upload create failed: ${createRes.status}`);
  const { id, upload_url } = (await createRes.json()) as { id: string; upload_url: string };

  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: new Uint8Array(png),
  });
  if (!putRes.ok) throw new Error(`upload PUT failed: ${putRes.status}`);

  const confirmRes = await fetch(`${HF_API_BASE}/agents/uploads/${id}/confirm?type=image`, {
    method: 'POST',
    headers: hfHeaders(token),
  });
  if (!confirmRes.ok) throw new Error(`upload confirm failed: ${confirmRes.status}`);
  return id;
}

async function hfPoll(token: string, jobId: string, timeoutMs = 8 * 60 * 1000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${HF_API_BASE}/agents/jobs/${jobId}`, { headers: hfHeaders(token) });
    if (res.ok) {
      const job = (await res.json()) as { status?: string; result_url?: string };
      if (job.status === 'completed' && job.result_url) return job.result_url;
      if (job.status === 'failed' || job.status === 'nsfw' || job.status === 'canceled') {
        throw new Error(`Higgsfield job ${job.status}`);
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('Higgsfield job timed out');
}

/** Prod provider: pure HTTP via HIGGSFIELD_TOKEN. */
export const httpGlowUpProvider: GlowUpProvider = {
  async generate(req): Promise<GlowUpResult> {
    const token = await getHiggsfieldToken();
    if (!token) throw new Error('No Higgsfield token (set via admin token endpoint or HIGGSFIELD_TOKEN)');

    const uploadId = await hfUpload(token, toBuffer(req.referencePng as ArrayBuffer | Uint8Array));
    const createRes = await fetch(`${HF_API_BASE}/agents/jobs`, {
      method: 'POST',
      headers: { ...hfHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_set_type: MODEL,
        params: {
          prompt: req.prompt || GLOW_UP_PROMPT,
          aspect_ratio: '1:1',
          resolution: '2k',
          input_images: [{ id: uploadId, type: 'media_input' }],
        },
      }),
    });
    if (!createRes.ok) throw new Error(`job create failed: ${createRes.status}`);
    const jobId = extractJobId(await createRes.json());
    return { url: await hfPoll(token, jobId) };
  },
};

/**
 * Select the active server provider:
 *  - production, or HIGGSFIELD_TOKEN / HIGGSFIELD_USE_HTTP set → HTTP
 *    (token resolved at call time from DB → env, so it can be rotated live)
 *  - else → CLI (local dev with an authed `higgsfield` binary)
 */
export function getServerGlowUpProvider(): GlowUpProvider {
  const useHttp =
    process.env.NODE_ENV === 'production' ||
    !!process.env.HIGGSFIELD_TOKEN ||
    process.env.HIGGSFIELD_USE_HTTP === '1';
  return useHttp ? httpGlowUpProvider : cliGlowUpProvider;
}
