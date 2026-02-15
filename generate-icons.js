import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const svgPath = path.join(__dirname, 'public', 'icon.svg');
const buildDir = path.join(__dirname, 'build');

// Create build directory
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

// Create icon.iconset directory
const iconsetDir = path.join(buildDir, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
}

async function generateIcons() {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
        // Standard resolution
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(iconsetDir, `icon_${size}x${size}.png`));

        // Retina resolution (2x)
        if (size <= 512) {
            await sharp(svgBuffer)
                .resize(size * 2, size * 2)
                .png()
                .toFile(path.join(iconsetDir, `icon_${size}x${size}@2x.png`));
        }
    }

    console.log('✓ PNG icons generated in build/icon.iconset');
    console.log('Next: Run "iconutil -c icns build/icon.iconset -o build/icon.icns"');
}

generateIcons().catch(console.error);
