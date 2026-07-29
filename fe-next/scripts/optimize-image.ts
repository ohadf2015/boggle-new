#!/usr/bin/env tsx
/**
 * Image optimization script using Sharp
 * Converts images to WebP format with <200KB target size
 *
 * Usage:
 *   npx tsx scripts/optimize-image.ts input.png output.webp
 *   npx tsx scripts/optimize-image.ts input.png output.webp --target-kb=150
 *   npx tsx scripts/optimize-image.ts --batch public/assets/raw/ public/assets/
 */

import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

const DEFAULT_TARGET_KB = 200;
const QUALITY_STEPS = [80, 75, 70, 65, 60, 55, 50];
const EFFORT = 6; // Maximum compression effort

interface OptimizeOptions {
  targetKb?: number;
  maxWidth?: number;
  maxHeight?: number;
}

async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizeOptions = {}
): Promise<{ success: boolean; sizeKb: number; quality: number }> {
  const { targetKb = DEFAULT_TARGET_KB, maxWidth = 1920, maxHeight = 1080 } = options;
  const targetBytes = targetKb * 1024;

  let image = sharp(inputPath);

  // Get metadata to check dimensions
  const metadata = await image.metadata();

  // Resize if larger than max dimensions (preserving aspect ratio)
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  // Try quality levels until we hit target size
  for (const quality of QUALITY_STEPS) {
    const buffer = await image
      .webp({ quality, effort: EFFORT, lossless: false })
      .toBuffer();

    const sizeKb = buffer.length / 1024;

    if (buffer.length <= targetBytes) {
      await fs.writeFile(outputPath, buffer);
      console.log(`✓ ${path.basename(inputPath)} -> ${path.basename(outputPath)} (${sizeKb.toFixed(1)}KB @ q${quality})`);
      return { success: true, sizeKb, quality };
    }
  }

  // If still too large after lowest quality, save anyway but warn
  const buffer = await image
    .webp({ quality: QUALITY_STEPS[QUALITY_STEPS.length - 1], effort: EFFORT })
    .toBuffer();

  const sizeKb = buffer.length / 1024;
  await fs.writeFile(outputPath, buffer);
  console.warn(`⚠ ${path.basename(inputPath)} -> ${path.basename(outputPath)} (${sizeKb.toFixed(1)}KB) exceeds ${targetKb}KB target`);

  return { success: false, sizeKb, quality: QUALITY_STEPS[QUALITY_STEPS.length - 1] };
}

async function processBatch(
  inputDir: string,
  outputDir: string,
  options: OptimizeOptions = {}
): Promise<{ success: number; failed: number; warnings: string[] }> {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.tiff'];
  const files = await fs.readdir(inputDir);
  const imageFiles = files.filter((f) =>
    extensions.includes(path.extname(f).toLowerCase())
  );

  await fs.mkdir(outputDir, { recursive: true });

  let success = 0;
  let failed = 0;
  const warnings: string[] = [];

  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, `${path.parse(file).name}.webp`);

    try {
      const result = await optimizeImage(inputPath, outputPath, options);
      if (result.success) {
        success++;
      } else {
        failed++;
        warnings.push(`${file}: ${result.sizeKb.toFixed(1)}KB exceeds target`);
      }
    } catch (error) {
      failed++;
      warnings.push(`${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { success, failed, warnings };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Image Optimization Script

Usage:
  npx tsx scripts/optimize-image.ts <input> <output> [options]
  npx tsx scripts/optimize-image.ts --batch <input-dir> <output-dir> [options]

Options:
  --target-kb=<number>  Target file size in KB (default: 200)
  --max-width=<number>  Maximum width in pixels (default: 1920)
  --max-height=<number> Maximum height in pixels (default: 1080)
  --batch              Process entire directory

Examples:
  npx tsx scripts/optimize-image.ts hero.png hero.webp
  npx tsx scripts/optimize-image.ts hero.png hero.webp --target-kb=150
  npx tsx scripts/optimize-image.ts --batch ./raw/ ./optimized/
    `);
    process.exit(0);
  }

  const isBatch = args.includes('--batch');
  const targetKb = parseInt(args.find((a) => a.startsWith('--target-kb='))?.split('=')[1] || String(DEFAULT_TARGET_KB));
  const maxWidth = parseInt(args.find((a) => a.startsWith('--max-width='))?.split('=')[1] || '1920');
  const maxHeight = parseInt(args.find((a) => a.startsWith('--max-height='))?.split('=')[1] || '1080');

  const options: OptimizeOptions = { targetKb, maxWidth, maxHeight };
  const pathArgs = args.filter((a) => !a.startsWith('--'));

  if (isBatch) {
    if (pathArgs.length < 2) {
      console.error('Error: --batch requires input and output directories');
      process.exit(1);
    }
    const [inputDir, outputDir] = pathArgs;
    const result = await processBatch(inputDir, outputDir, options);
    console.log(`\nCompleted: ${result.success} success, ${result.failed} failed`);
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach((w) => console.log(`  - ${w}`));
    }
    process.exit(result.failed > 0 ? 1 : 0);
  } else {
    if (pathArgs.length < 2) {
      console.error('Error: Requires input and output paths');
      process.exit(1);
    }
    const [input, output] = pathArgs;
    const result = await optimizeImage(input, output, options);
    process.exit(result.success ? 0 : 1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
