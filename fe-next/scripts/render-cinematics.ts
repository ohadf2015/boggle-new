/**
 * Remotion MP4 Rendering Script (DEBT-02)
 *
 * Batch renders cinematic components to MP4 files for offline testing
 * and CDN distribution.
 *
 * Usage:
 *   npm run render:cinematics              # Render all cinematics
 *   npm run render:cinematic -- --composition VictoryCinematic
 *   npm run render:cinematic -- --help
 *
 * Output: public/videos/{composition-name}.mp4
 *
 * Settings:
 *   - Codec: H.264
 *   - CRF: 23
 *   - Pixel Format: yuv420p
 *   - Audio Bitrate: 128k
 *   - Video Bitrate: 2M
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ==============================================
// TYPES
// ==============================================

interface CompositionConfig {
  /** Composition ID (must match Remotion composition) */
  id: string;
  /** Duration in frames */
  durationInFrames: number;
  /** Frame rate */
  fps: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Default input props for the composition */
  defaultProps: Record<string, unknown>;
}

interface RenderResult {
  composition: string;
  success: boolean;
  outputPath?: string;
  error?: string;
  durationMs?: number;
}

// Remotion package types (declared for dynamic import)
type BundleFunction = (options: { entryPoint: string; onProgress?: undefined }) => Promise<string>;
type SelectCompositionFunction = (options: {
  serveUrl: string;
  id: string;
  inputProps: Record<string, unknown>;
}) => Promise<unknown>;
type RenderMediaFunction = (options: {
  composition: unknown;
  serveUrl: string;
  codec: string;
  outputLocation: string;
  inputProps: Record<string, unknown>;
  crf: number;
  pixelFormat: string;
  audioBitrate: string;
  videoBitrate: string;
  onProgress: (progress: { progress: number }) => void;
}) => Promise<void>;

// ==============================================
// CONSTANTS
// ==============================================

// ESM-compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'videos');

/** Path to Remotion entry file (if it exists) */
const REMOTION_ENTRY = path.join(PROJECT_ROOT, 'remotion-root', 'index.ts');

/** Render settings optimized for web delivery */
const RENDER_SETTINGS = {
  codec: 'h264' as const,
  crf: 23,
  pixelFormat: 'yuv420p' as const,
  audioBitrate: '128k',
  videoBitrate: '2M',
};

/**
 * Default composition configurations.
 * These match the cinematic components defined in:
 * - components/adventure/boss/cinematics/BossEntranceCinematic.tsx
 * - components/adventure/cinematics/VictoryCinematic.tsx
 * - components/adventure/cinematics/DefeatCinematic.tsx
 */
const COMPOSITIONS: CompositionConfig[] = [
  {
    id: 'BossEntranceCinematic',
    durationInFrames: 240, // 8 seconds at 30fps
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {
      bossName: 'Wordzilla',
      bossTitle: 'Guardian of World 1',
      bossImagePath: '/bosses/wordzilla.webp',
      primaryColor: '#FFE135',
      worldNumber: 1,
    },
  },
  {
    id: 'VictoryCinematic',
    durationInFrames: 180, // 6 seconds at 30fps
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {
      starsEarned: 3,
      wordsFound: 42,
      finalScore: 12500,
      timeRemaining: 15,
    },
  },
  {
    id: 'DefeatCinematic',
    durationInFrames: 150, // 5 seconds at 30fps
    fps: 30,
    width: 1920,
    height: 1080,
    defaultProps: {
      wordsFound: 18,
      bestWord: 'MAGNIFICENT',
      finalScore: 5400,
    },
  },
];

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

function printHelp(): void {
  console.log(`
Remotion MP4 Rendering Script

USAGE:
  npx tsx scripts/render-cinematics.ts [options]

OPTIONS:
  --help, -h              Show this help message
  --composition, -c NAME  Render a single composition by name
  --list                  List available compositions
  --dry-run               Check setup without rendering

EXAMPLES:
  # Render all cinematics
  npx tsx scripts/render-cinematics.ts

  # Render only the victory cinematic
  npx tsx scripts/render-cinematics.ts --composition VictoryCinematic

  # List available compositions
  npx tsx scripts/render-cinematics.ts --list

OUTPUT:
  Files are written to: public/videos/{composition-name}.mp4

REQUIREMENTS:
  - Remotion project at remotion-root/index.ts
  - @remotion/bundler and @remotion/renderer packages installed
`);
}

function listCompositions(): void {
  console.log('\nAvailable Compositions:\n');
  COMPOSITIONS.forEach((comp) => {
    const durationSec = comp.durationInFrames / comp.fps;
    console.log(`  - ${comp.id}`);
    console.log(`    Duration: ${durationSec}s (${comp.durationInFrames} frames @ ${comp.fps}fps)`);
    console.log(`    Resolution: ${comp.width}x${comp.height}`);
    console.log('');
  });
}

function checkRemotionSetup(): { ready: boolean; message: string } {
  // Check if remotion entry file exists
  if (!fs.existsSync(REMOTION_ENTRY)) {
    return {
      ready: false,
      message: `Remotion entry file not found at: ${REMOTION_ENTRY}

To set up Remotion for rendering:
1. Create remotion-root/index.ts with your composition registrations
2. Install @remotion/bundler and @remotion/renderer:
   npm install @remotion/bundler @remotion/renderer

Example remotion-root/index.ts:
\`\`\`typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);
\`\`\`
`,
    };
  }

  // Check if bundler and renderer are installed
  try {
    // Check in node_modules
    const bundlerPath = path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'bundler');
    const rendererPath = path.join(PROJECT_ROOT, 'node_modules', '@remotion', 'renderer');

    if (!fs.existsSync(bundlerPath)) {
      return {
        ready: false,
        message: `@remotion/bundler not installed.

Run: npm install @remotion/bundler
`,
      };
    }

    if (!fs.existsSync(rendererPath)) {
      return {
        ready: false,
        message: `@remotion/renderer not installed.

Run: npm install @remotion/renderer
`,
      };
    }

    return { ready: true, message: 'Remotion setup looks good!' };
  } catch (error) {
    return {
      ready: false,
      message: `Error checking Remotion packages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function renderComposition(config: CompositionConfig): Promise<RenderResult> {
  const startTime = Date.now();
  const outputPath = path.join(OUTPUT_DIR, `${config.id}.mp4`);

  console.log(`\nRendering: ${config.id}`);
  console.log(`  Duration: ${config.durationInFrames} frames @ ${config.fps}fps`);
  console.log(`  Output: ${outputPath}`);

  try {
    // Dynamic import to handle case where packages aren't installed
    // Note: These packages are optional - the script checks for them before calling renderComposition
    const bundlerModule = await import('@remotion/bundler') as { bundle: BundleFunction };
    // @ts-expect-error - Optional dependency, may not be installed
    const rendererModule = await import('@remotion/renderer') as {
      renderMedia: RenderMediaFunction;
      selectComposition: SelectCompositionFunction;
    };
    const { bundle } = bundlerModule;
    const { renderMedia, selectComposition } = rendererModule;

    // Bundle the Remotion project
    console.log('  Bundling...');
    const bundled = await bundle({
      entryPoint: REMOTION_ENTRY,
      // Disable progress for cleaner output
      onProgress: undefined,
    });

    // Select the composition
    console.log('  Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundled,
      id: config.id,
      inputProps: config.defaultProps,
    });

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Render to MP4
    console.log('  Rendering to MP4...');
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: RENDER_SETTINGS.codec,
      outputLocation: outputPath,
      inputProps: config.defaultProps,
      crf: RENDER_SETTINGS.crf,
      pixelFormat: RENDER_SETTINGS.pixelFormat,
      audioBitrate: RENDER_SETTINGS.audioBitrate,
      videoBitrate: RENDER_SETTINGS.videoBitrate,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  Progress: ${Math.round(progress * 100)}%`);
      },
    });

    console.log('\n  Done!');

    const durationMs = Date.now() - startTime;
    return {
      composition: config.id,
      success: true,
      outputPath,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`\n  Failed: ${errorMessage}`);

    return {
      composition: config.id,
      success: false,
      error: errorMessage,
      durationMs,
    };
  }
}

// ==============================================
// MAIN
// ==============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle --help
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Handle --list
  if (args.includes('--list')) {
    listCompositions();
    process.exit(0);
  }

  // Handle --dry-run
  if (args.includes('--dry-run')) {
    console.log('\nDry run: Checking Remotion setup...\n');
    const setup = checkRemotionSetup();
    if (setup.ready) {
      console.log('Status: Ready to render');
      console.log(setup.message);
      listCompositions();
      process.exit(0);
    } else {
      console.log('Status: Not ready');
      console.log(setup.message);
      process.exit(1);
    }
  }

  // Check Remotion setup before attempting render
  const setup = checkRemotionSetup();
  if (!setup.ready) {
    console.log('\nRemotionSetup Check Failed:');
    console.log(setup.message);
    console.log('\nNote: This script requires Remotion to be fully configured.');
    console.log('Cinematics can still be played in-app using @remotion/player.');
    process.exit(1);
  }

  // Handle --composition for single render
  const compositionIndex = args.findIndex((arg) => arg === '--composition' || arg === '-c');
  let compositionsToRender = COMPOSITIONS;

  if (compositionIndex !== -1) {
    const compositionName = args[compositionIndex + 1];
    if (!compositionName) {
      console.error('Error: --composition requires a composition name');
      console.error('Use --list to see available compositions');
      process.exit(1);
    }

    const found = COMPOSITIONS.find(
      (c) => c.id.toLowerCase() === compositionName.toLowerCase()
    );
    if (!found) {
      console.error(`Error: Composition "${compositionName}" not found`);
      console.error('Use --list to see available compositions');
      process.exit(1);
    }

    compositionsToRender = [found];
  }

  // Render cinematics
  console.log('='.repeat(60));
  console.log('Remotion MP4 Rendering');
  console.log('='.repeat(60));
  console.log(`Compositions to render: ${compositionsToRender.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const results: RenderResult[] = [];

  for (const composition of compositionsToRender) {
    const result = await renderComposition(composition);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Render Summary');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log('\nSuccessful renders:');
    successful.forEach((r) => {
      const duration = r.durationMs ? `(${(r.durationMs / 1000).toFixed(1)}s)` : '';
      console.log(`  + ${r.composition} -> ${r.outputPath} ${duration}`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFailed renders:');
    failed.forEach((r) => {
      console.log(`  - ${r.composition}: ${r.error}`);
    });
  }

  console.log(`\nTotal: ${successful.length}/${results.length} successful`);

  // Exit with error code if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
