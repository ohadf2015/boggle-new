import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const BOSS_DIR = 'public/images/bosses';
const TARGET_KB = 200;

async function convertToWebP() {
  console.log('Converting boss images to WebP...\n');

  const files = await readdir(BOSS_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png') && !f.includes('-raw'));

  for (const pngFile of pngFiles) {
    const inputPath = join(BOSS_DIR, pngFile);
    const outputPath = join(BOSS_DIR, pngFile.replace('.png', '.webp'));

    await sharp(inputPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);

    const stats = await stat(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    const status = stats.size > TARGET_KB * 1024 ? 'WARNING' : 'OK';

    console.log(`[${status}] ${pngFile} -> ${pngFile.replace('.png', '.webp')} (${sizeKB}KB)`);
  }

  console.log('\nWebP conversion complete!');
}

convertToWebP().catch(console.error);
