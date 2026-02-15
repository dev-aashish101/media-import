import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fdir } from 'fdir';
import sharp from 'sharp';
import exifr from 'exifr';
import { format } from 'date-fns';
import crypto from 'crypto';

// ... imports
import pLimit from 'p-limit';

const SUPPORTED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.arw', '.cr2', '.nef', '.dng', '.mp4', '.mov', '.avi'
]);

// Ensure thumbnail directory exists
const THUMBNAIL_DIR = path.join(app.getPath('userData'), 'thumbnails');
fs.mkdir(THUMBNAIL_DIR, { recursive: true }).catch(console.error);

interface MediaFile {
    path: string;
    name: string;
    size: number;
    dateStr: string; // YYYY-MM-DD
    thumbnail?: string;
}

// Global state for import cancellation
let isImportCancelled = false;

// Concurrency limit for thumbnail generation
const limitThumbnail = pLimit(2);

export function setupHandlers() {
    ipcMain.handle('select-directory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('scan-directory', async (_, sourcePath: string) => {
        if (!sourcePath) return [];

        console.log(`Scanning ${sourcePath}...`);
        // Fast directory scan
        const api = new fdir()
            .withFullPaths()
            .withErrors()
            .crawl(sourcePath);

        const files = await api.withPromise();

        const mediaFiles: MediaFile[] = [];

        // Process in chunks or parallel if needed, but for now just filter
        for (const filePath of files) {
            if (typeof filePath !== 'string') continue;

            // Ignore macOS sidecar files and hidden files
            const basename = path.basename(filePath);
            if (basename.startsWith('._') || basename.startsWith('.')) continue;

            const ext = path.extname(filePath).toLowerCase();
            if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

            try {
                const stats = await fs.stat(filePath);
                // Basic info first for speed
                mediaFiles.push({
                    path: filePath,
                    name: path.basename(filePath),
                    size: stats.size,
                    dateStr: '', // Fill scan-complete or on-demand
                });
            } catch (e) {
                console.error(`Error statting ${filePath}`, e);
            }
        }

        console.log(`Scan complete for ${sourcePath}. Found ${mediaFiles.length} valid media files.`);
        if (mediaFiles.length > 0) {
            console.log('Sample file:', mediaFiles[0].path);
        }

        return mediaFiles;
    });

    ipcMain.handle('get-thumbnail', (_, filePath: string) => {
        return limitThumbnail(async () => {
            // Skip video files for now (no efficient thumbnail generation without ffmpeg)
            if (filePath.match(/\.(mp4|mov|avi)$/i)) {
                return null;
            }

            // Generate hash of filePath for unique thumbnail name
            const hash = crypto.createHash('md5').update(filePath).digest('hex');
            const thumbPath = path.join(THUMBNAIL_DIR, `${hash}.jpg`);

            try {
                // Check if exists
                await fs.access(thumbPath);
                return `file://${thumbPath}`;
            } catch {
                // Generate
                try {
                    // Special handling for RAW files on macOS using sips (faster and reliable)
                    const ext = path.extname(filePath).toLowerCase();
                    if (process.platform === 'darwin' && ['.arw', '.nef', '.cr2', '.dng'].includes(ext)) {
                        const { exec } = await import('child_process');
                        const { promisify } = await import('util');
                        const execAsync = promisify(exec);

                        // -Z 200: aspect-ratio preserving resize with max dimension 200
                        await execAsync(`sips -Z 200 -s format jpeg "${filePath}" --out "${thumbPath}"`);
                        return `file://${thumbPath}`;
                    }

                    await sharp(filePath)
                        .resize(200, 200, { fit: 'cover' })
                        .jpeg({ quality: 80 })
                        .toFile(thumbPath);
                    return `file://${thumbPath}`;
                } catch (error) {
                    console.error(`Failed to generate thumbnail for ${filePath}:`, error);

                    // Fallback to sips for any other failure on mac
                    if (process.platform === 'darwin') {
                        try {
                            const { exec } = await import('child_process');
                            const { promisify } = await import('util');
                            const execAsync = promisify(exec);
                            await execAsync(`sips -Z 200 -s format jpeg "${filePath}" --out "${thumbPath}"`);
                            return `file://${thumbPath}`;
                        } catch (e) {
                            console.error('Sips fallback also failed', e);
                        }
                    }

                    return null; // Frontend should show placeholder
                }
            }
        });
    });

    ipcMain.handle('get-metadata', async (_, filePath: string) => {
        try {
            const stats = await fs.stat(filePath);
            let date = stats.birthtime;

            // Try EXIF for images
            if (filePath.match(/\.(jpg|jpeg|arw|cr2|dng|nef|png)$/i)) {
                try {
                    const output = await exifr.parse(filePath, ['DateTimeOriginal']);
                    if (output && output.DateTimeOriginal) {
                        date = output.DateTimeOriginal;
                    }
                } catch (e) {
                    // ignore exif error
                }
            }

            return {
                dateStr: format(date, 'yyyy-MM-dd'),
                originalDate: date.toISOString()
            };
        } catch (e) {
            return { dateStr: format(new Date(), 'yyyy-MM-dd') };
        }
    });

    // Start Import
    ipcMain.handle('start-import', async (event, files: string[], destRoot: string) => {
        isImportCancelled = false;
        const total = files.length;
        let success = 0;
        let failed = 0;
        let processed = 0;
        let bytesProcessed = 0;

        // Run in background / parallel (but loop is sequential for safety)
        // We do NOT await the loop here if we want to return immediately? 
        // Logic: The frontend calls this, we want to start and return "Started".
        // The loop continues.

        // We'll proceed async.
        (async () => {
            for (const filePath of files) {
                if (isImportCancelled) {
                    event.sender.send('import-cancelled');
                    break;
                }

                const startTime = Date.now();
                let importedFileName: string | undefined;
                try {
                    const stats = await fs.stat(filePath);
                    // default logic to use file mtime
                    const date = stats.mtime;
                    const dateFolder = format(date, 'yyyyMMdd');
                    const targetDir = path.join(destRoot, dateFolder);

                    await fs.mkdir(targetDir, { recursive: true });

                    const fileName = path.basename(filePath);
                    let targetPath = path.join(targetDir, fileName);

                    // Duplicate check
                    try {
                        await fs.access(targetPath);
                        const name = path.parse(fileName).name;
                        const ext = path.parse(fileName).ext;
                        targetPath = path.join(targetDir, `${name}_copy${ext}`);
                    } catch { }

                    await fs.copyFile(filePath, targetPath);
                    success++;
                    bytesProcessed += stats.size;
                    importedFileName = path.basename(targetPath);
                } catch (e) {
                    console.error(e);
                    failed++;
                }

                processed++;
                const endTime = Date.now();
                const duration = endTime - startTime;

                event.sender.send('import-progress', {
                    processed,
                    total,
                    success,
                    failed,
                    bytesProcessed,
                    lastFileDuration: duration,
                    fileName: importedFileName
                });
            }

            if (!isImportCancelled) {
                event.sender.send('import-complete', { success, failed });
            }
        })();

        return { status: 'started' };
    });

    ipcMain.handle('cancel-import', () => {
        isImportCancelled = true;
        return { status: 'cancelling' };
    });
}
