#!/usr/bin/env node

/**
 * Icon Generator for Tauri Desktop App
 *
 * Generates all required icon sizes from the source SVG.
 * Requires: sharp, @aspect-ratio/png-to-icns (for .icns), @aspect-ratio/png-to-ico (for .ico)
 *
 * Usage: node scripts/generate-icons.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');
const SOURCE_SVG = path.join(ROOT, 'public', 'icon.svg');

const SIZES = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },  // For system tray
];

async function main() {
  console.log('🎨 Generating icons for Tauri app...\n');

  // Check if sharp is available
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.log('📦 Installing sharp...');
    const { execSync } = await import('child_process');
    execSync('npm install --save-dev sharp', { cwd: ROOT, stdio: 'inherit' });
    sharp = (await import('sharp')).default;
  }

  // Ensure icons directory exists
  await fs.mkdir(ICONS_DIR, { recursive: true });

  // Read source SVG
  const svgBuffer = await fs.readFile(SOURCE_SVG);
  console.log(`📄 Source: ${SOURCE_SVG}\n`);

  // Generate PNG icons
  for (const { name, size } of SIZES) {
    const outputPath = path.join(ICONS_DIR, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // Generate .icns (macOS) using png2icons
  console.log('\n📦 Generating platform-specific icons...\n');

  try {
    const png2icons = await import('png2icons').catch(() => null);
    if (png2icons) {
      const input512 = await fs.readFile(path.join(ICONS_DIR, 'icon.png'));

      // Generate .icns
      const icnsOutput = png2icons.createICNS(input512, png2icons.BILINEAR, 0);
      if (icnsOutput) {
        await fs.writeFile(path.join(ICONS_DIR, 'icon.icns'), icnsOutput);
        console.log('  ✅ icon.icns (macOS)');
      }

      // Generate .ico
      const icoOutput = png2icons.createICO(input512, png2icons.BILINEAR, 0, true);
      if (icoOutput) {
        await fs.writeFile(path.join(ICONS_DIR, 'icon.ico'), icoOutput);
        console.log('  ✅ icon.ico (Windows)');
      }
    } else {
      throw new Error('png2icons not available');
    }
  } catch {
    console.log('  ⚠️  Skipping .icns/.ico generation (install png2icons for full support)');
    console.log('  💡 Run: npm install --save-dev png2icons');

    // Create placeholder files
    const placeholder512 = await fs.readFile(path.join(ICONS_DIR, 'icon.png'));
    await fs.writeFile(path.join(ICONS_DIR, 'icon.icns'), placeholder512);
    await fs.writeFile(path.join(ICONS_DIR, 'icon.ico'), placeholder512);
    console.log('  📝 Created placeholder .icns/.ico files');
  }

  console.log('\n✨ Icon generation complete!\n');
  console.log('Generated icons:');
  const files = await fs.readdir(ICONS_DIR);
  for (const file of files.sort()) {
    const stat = await fs.stat(path.join(ICONS_DIR, file));
    console.log(`  - ${file} (${(stat.size / 1024).toFixed(1)}KB)`);
  }
}

main().catch(console.error);
