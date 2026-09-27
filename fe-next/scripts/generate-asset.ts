#!/usr/bin/env tsx
/**
 * Asset generation pipeline
 * Takes a raw image (from Image MCP, download, or other source), removes background if needed,
 * and optimizes to WebP format under 200KB.
 *
 * Workflow:
 *   1. Generate image via Image MCP (or obtain from other source)
 *   2. Save PNG to local filesystem
 *   3. Run this script to process: input.png -> output.webp
 *
 * Usage:
 *   npx tsx scripts/generate-asset.ts input.png output-name --remove-bg
 *   npx tsx scripts/generate-asset.ts input.png output-name --no-remove-bg
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

const OUTPUT_DIR = 'public/assets';
const TEMP_DIR = '.asset-temp';
const TARGET_KB = 200;
const QUALITY_STEPS = [80, 75, 70, 65, 60, 55, 50];
const EFFORT = 6;

interface GenerateOptions {
  removeBg: boolean;
  targetKb?: number;
  outputDir?: string;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function cleanup(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function runRembg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'remove-background.sh');

    const proc = spawn('bash', [scriptPath, inputPath, outputPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rembg failed (exit ${code}): ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn rembg: ${err.message}`));
    });
  });
}

async function optimizeToWebp(
  inputPath: string,
  outputPath: string,
  targetKb: number
): Promise<{ sizeKb: number; quality: number }> {
  const targetBytes = targetKb * 1024;
  let image = sharp(inputPath);

  // Get metadata
  const metadata = await image.metadata();

  // Resize if too large
  if (metadata.width && metadata.height) {
    if (metadata.width > 1920 || metadata.height > 1080) {
      image = image.resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  for (const quality of QUALITY_STEPS) {
    const buffer = await image
      .webp({ quality, effort: EFFORT, lossless: false })
      .toBuffer();

    if (buffer.length <= targetBytes) {
      await fs.writeFile(outputPath, buffer);
      return { sizeKb: buffer.length / 1024, quality };
    }
  }

  // Save at lowest quality anyway
  const buffer = await image
    .webp({ quality: QUALITY_STEPS[QUALITY_STEPS.length - 1], effort: EFFORT })
    .toBuffer();

  await fs.writeFile(outputPath, buffer);
  return { sizeKb: buffer.length / 1024, quality: QUALITY_STEPS[QUALITY_STEPS.length - 1] };
}

export async function generateAsset(
  inputPath: string,
  outputName: string,
  options: GenerateOptions
): Promise<{ outputPath: string; sizeKb: number; quality: number }> {
  const { removeBg, targetKb = TARGET_KB, outputDir = OUTPUT_DIR } = options;

  await ensureDir(outputDir);
  await ensureDir(TEMP_DIR);

  const tempFiles: string[] = [];
  let currentPath = inputPath;

  try {
    // Step 1: Remove background if requested
    if (removeBg) {
      const noBgPath = path.join(TEMP_DIR, `${outputName}_nobg.png`);
      console.log(`Removing background from ${path.basename(inputPath)}...`);
      await runRembg(inputPath, noBgPath);
      currentPath = noBgPath;
      tempFiles.push(noBgPath);
      console.log('Background removed.');
    }

    // Step 2: Optimize to WebP
    const outputPath = path.join(outputDir, `${outputName}.webp`);
    console.log(`Optimizing to WebP (target: ${targetKb}KB)...`);
    const { sizeKb, quality } = await optimizeToWebp(currentPath, outputPath, targetKb);

    if (sizeKb > targetKb) {
      console.warn(`⚠ Warning: ${outputName}.webp is ${sizeKb.toFixed(1)}KB (exceeds ${targetKb}KB target)`);
    } else {
      console.log(`✓ ${outputName}.webp: ${sizeKb.toFixed(1)}KB @ quality ${quality}`);
    }

    return { outputPath, sizeKb, quality };
  } finally {
    await cleanup(tempFiles);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Asset Generation Pipeline (Post-Processing)

This script processes raw images through background removal and optimization.
Images can come from any source (Image MCP, downloads, etc.).

Usage:
  npx tsx scripts/generate-asset.ts <input> <output-name> [options]

Arguments:
  input        Path to source image (PNG, JPG)
  output-name  Name for output file (without extension)

Options:
  --remove-bg      Remove background before optimization (default)
  --no-remove-bg   Skip background removal (for backgrounds, full images)
  --target-kb=N    Target file size in KB (default: 200)
  --output-dir=D   Output directory (default: public/assets)

Examples:
  npx tsx scripts/generate-asset.ts raw/lexi.png lexi-idle --remove-bg
  npx tsx scripts/generate-asset.ts raw/meadow-bg.png world-1-bg --no-remove-bg

Workflow with Image MCP:
  1. Use Image MCP to generate an image (in Claude's environment)
  2. Save the generated PNG to raw/ directory
  3. Run: npx tsx scripts/generate-asset.ts raw/generated.png asset-name --remove-bg
    `);
    process.exit(0);
  }

  const removeBg = !args.includes('--no-remove-bg');
  const targetKb = parseInt(
    args.find((a) => a.startsWith('--target-kb='))?.split('=')[1] || String(TARGET_KB)
  );
  const outputDir =
    args.find((a) => a.startsWith('--output-dir='))?.split('=')[1] || OUTPUT_DIR;

  const pathArgs = args.filter((a) => !a.startsWith('--'));

  if (pathArgs.length < 2) {
    console.error('Error: Requires input path and output name');
    process.exit(1);
  }

  const [inputPath, outputName] = pathArgs;

  // Verify input exists
  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const result = await generateAsset(inputPath, outputName, {
      removeBg,
      targetKb,
      outputDir,
    });

    console.log(`\nOutput: ${result.outputPath}`);
  } catch (error) {
    console.error('Pipeline failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Only run main if this is the main module
if (require.main === module) {
  main();
}
