import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const icon = await fs.readFile('public/icon.svg');
const foreground = await fs.readFile('resources/icon-foreground.svg');
const splash = await fs.readFile('resources/splash.svg');
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [density, factor] of Object.entries(densities)) {
  const dir = path.join('android/app/src/main/res', `mipmap-${density}`);
  const legacySize = Math.round(48 * factor);
  const adaptiveSize = Math.round(108 * factor);
  const legacy = await sharp(icon).resize(legacySize, legacySize).png().toBuffer();
  await fs.writeFile(path.join(dir, 'ic_launcher.png'), legacy);
  await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), legacy);
  await sharp(foreground).resize(adaptiveSize, adaptiveSize).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

const drawableRoot = 'android/app/src/main/res';
const entries = await fs.readdir(drawableRoot, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
  const target = path.join(drawableRoot, entry.name, 'splash.png');
  try {
    const metadata = await sharp(target).metadata();
    if (!metadata.width || !metadata.height) continue;
    await sharp(splash)
      .resize(metadata.width, metadata.height, { fit: 'contain', background: '#f7f5ef' })
      .png()
      .toFile(`${target}.next`);
    await fs.rename(`${target}.next`, target);
  } catch {
    // Some drawable folders do not contain a splash asset.
  }
}

console.log('Icônes et écrans de lancement Android créés.');
