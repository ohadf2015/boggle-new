#!/usr/bin/env tsx
/**
 * Batch asset pipeline orchestrator
 * Processes multiple assets based on a manifest file or directory.
 *
 * Usage:
 *   npx tsx scripts/asset-pipeline.ts --manifest=assets.json
 *   npx tsx scripts/asset-pipeline.ts --dir=raw/ --output=public/assets/
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateAsset } from './generate-asset';

interface AssetManifestEntry {
  input: string;
  output: string;
  removeBg?: boolean;
  targetKb?: number;
}

interface AssetManifest {
  baseInputDir?: string;
  baseOutputDir?: string;
  defaultRemoveBg?: boolean;
  defaultTargetKb?: number;
  assets: AssetManifestEntry[];
}

interface ProcessResult {
  name: string;
  success: boolean;
  sizeKb?: number;
  error?: string;
}

async function processManifest(manifestPath: string): Promise<ProcessResult[]> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  const manifest: AssetManifest = JSON.parse(content);

  const results: ProcessResult[] = [];
  const {
    baseInputDir = '.',
    baseOutputDir = 'public/assets',
    defaultRemoveBg = true,
    defaultTargetKb = 200,
    assets,
  } = manifest;

  console.log(`Processing ${assets.length} assets from manifest...\n`);

  for (const asset of assets) {
    const inputPath = path.join(baseInputDir, asset.input);
    const outputName = asset.output;
    const removeBg = asset.removeBg ?? defaultRemoveBg;
    const targetKb = asset.targetKb ?? defaultTargetKb;

    try {
      const result = await generateAsset(inputPath, outputName, {
        removeBg,
        targetKb,
        outputDir: baseOutputDir,
      });

      results.push({
        name: outputName,
        success: result.sizeKb <= targetKb,
        sizeKb: result.sizeKb,
      });
    } catch (error) {
      results.push({
        name: outputName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    console.log(''); // Blank line between assets
  }

  return results;
}

async function processDirectory(
  inputDir: string,
  outputDir: string,
  removeBg: boolean,
  targetKb: number
): Promise<ProcessResult[]> {
  const extensions = ['.png', '.jpg', '.jpeg'];
  const files = await fs.readdir(inputDir);
  const imageFiles = files.filter((f) =>
    extensions.includes(path.extname(f).toLowerCase())
  );

  console.log(`Processing ${imageFiles.length} images from ${inputDir}...\n`);

  const results: ProcessResult[] = [];

  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputName = path.parse(file).name;

    try {
      const result = await generateAsset(inputPath, outputName, {
        removeBg,
        targetKb,
        outputDir,
      });

      results.push({
        name: outputName,
        success: result.sizeKb <= targetKb,
        sizeKb: result.sizeKb,
      });
    } catch (error) {
      results.push({
        name: outputName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    console.log(''); // Blank line between assets
  }

  return results;
}

function printSummary(results: ProcessResult[]): void {
  console.log('='.repeat(50));
  console.log('PIPELINE SUMMARY');
  console.log('='.repeat(50));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\nTotal: ${results.length}`);
  console.log(`Success: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed assets:');
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error || 'Exceeded size limit'}`);
    }
  }

  const avgSize = successful.reduce((sum, r) => sum + (r.sizeKb || 0), 0) / successful.length;
  if (successful.length > 0) {
    console.log(`\nAverage size: ${avgSize.toFixed(1)}KB`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Batch Asset Pipeline

Usage:
  npx tsx scripts/asset-pipeline.ts --manifest=<path>
  npx tsx scripts/asset-pipeline.ts --dir=<input> --output=<output> [options]

Options:
  --manifest=<path>    Process assets from JSON manifest
  --dir=<path>        Process all images in directory
  --output=<path>     Output directory (default: public/assets)
  --remove-bg         Remove backgrounds (default: true)
  --no-remove-bg      Skip background removal
  --target-kb=N       Target file size (default: 200)

Manifest format (assets.json):
{
  "baseInputDir": "raw/",
  "baseOutputDir": "public/assets",
  "defaultRemoveBg": true,
  "assets": [
    { "input": "lexi.png", "output": "lexi-idle", "removeBg": true },
    { "input": "meadow.png", "output": "world-1-bg", "removeBg": false }
  ]
}
    `);
    process.exit(0);
  }

  const manifestPath = args.find((a) => a.startsWith('--manifest='))?.split('=')[1];
  const inputDir = args.find((a) => a.startsWith('--dir='))?.split('=')[1];
  const outputDir = args.find((a) => a.startsWith('--output='))?.split('=')[1] || 'public/assets';
  const removeBg = !args.includes('--no-remove-bg');
  const targetKb = parseInt(args.find((a) => a.startsWith('--target-kb='))?.split('=')[1] || '200');

  let results: ProcessResult[];

  if (manifestPath) {
    results = await processManifest(manifestPath);
  } else if (inputDir) {
    results = await processDirectory(inputDir, outputDir, removeBg, targetKb);
  } else {
    console.error('Error: Specify --manifest=<path> or --dir=<path>');
    process.exit(1);
  }

  printSummary(results);

  const hasFailures = results.some((r) => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error('Pipeline error:', error);
  process.exit(1);
});
