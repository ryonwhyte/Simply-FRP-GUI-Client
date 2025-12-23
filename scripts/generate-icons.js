#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const ICONS_DIR = path.join(RESOURCES_DIR, 'icons');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

// Icon sizes needed for various platforms
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// Ensure directories exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('Generating icons from SVG...\n');

  const svgBuffer = fs.readFileSync(SVG_PATH);

  // Generate PNG icons at various sizes
  for (const size of SIZES) {
    const outputPath = path.join(ICONS_DIR, `${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created ${size}x${size}.png`);
  }

  // Create main icon.png (256x256 for electron-builder)
  const mainIconPath = path.join(RESOURCES_DIR, 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log('\n  Created icon.png (512x512)');

  // Generate ICO file for Windows (contains multiple sizes)
  console.log('\n  Generating icon.ico...');
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of icoSizes) {
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buffer);
  }

  // Use the 256x256 as base for ICO
  const largeBuffer = await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toBuffer();

  const icoBuffer = png2icons.createICO(largeBuffer, png2icons.BILINEAR, 0, true, true);
  if (icoBuffer) {
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer);
    console.log('  Created icon.ico');
  }

  // Generate ICNS for macOS
  console.log('\n  Generating icon.icns...');
  const icnsBuffer = png2icons.createICNS(largeBuffer, png2icons.BILINEAR, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.icns'), icnsBuffer);
    console.log('  Created icon.icns');
  }

  console.log('\nIcon generation complete!');
  console.log(`\nFiles created in ${RESOURCES_DIR}:`);
  console.log('  - icon.svg (source)');
  console.log('  - icon.png (512x512)');
  console.log('  - icon.ico (Windows)');
  console.log('  - icon.icns (macOS)');
  console.log(`  - icons/ (PNG sizes: ${SIZES.join(', ')})`);
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
