import { useState, useCallback, useEffect, useRef } from 'react';

export function useMediaScan() {
    const [sourcePath, setSourcePath] = useState<string | null>(null);
    const [destPath, setDestPath] = useState<string | null>(null);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [existingFiles, setExistingFiles] = useState<Set<string>>(new Set());

    const [scanning, setScanning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importStats, setImportStats] = useState<ImportStats | null>(null);

    // Track rolling average of duration for ETR
    const recentDurations = useRef<number[]>([]);

    const refreshDest = useCallback(async () => {
        if (!destPath) return;
        console.log('Refreshing destination scan:', destPath);
        try {
            const files = await window.ipcRenderer.invoke('scan-directory', destPath);
            console.log('Dest scan found files:', files.length);
            const set = new Set<string>();
            files.forEach(f => {
                set.add(f.name);
                set.add(`${f.name}_${f.size}`);
            });
            console.log('Existing files set size:', set.size);
            if (files.length > 0) {
                console.log('Sample existing file:', files[0].name);
            }
            setExistingFiles(set);
        } catch (error) {
            console.error('Failed to scan destination:', error);
        }
    }, [destPath]);

    useEffect(() => {
        const handleProgress = (_: any, stats: ImportStats) => {
            // Update recent durations
            if (stats.lastFileDuration > 0) {
                recentDurations.current.push(stats.lastFileDuration);
                if (recentDurations.current.length > 20) {
                    recentDurations.current.shift();
                }
            }
            setImportStats(stats);

            // Real-time update of existing files
            if (stats.fileName) {
                setExistingFiles(prev => {
                    const next = new Set(prev);
                    next.add(stats.fileName!);
                    return next;
                });
            }
        };

        const handleComplete = (_: any, result: { success: number, failed: number }) => {
            console.log('Import Complete', result);
            setImporting(false);
            setImportStats(null);

            // Auto-refresh both source and destination
            refreshDest();
            // Optional: scanSource(); // If user wants full re-scan, but scanSource is expensive.
            // Let's stick to refreshDest which updates the "existing" check.

            alert(`Import Finished! Success: ${result.success}, Failed: ${result.failed}`);
        };

        const handleCancelled = () => {
            console.log('Import Cancelled');
            setImporting(false);
            setImportStats(null);
            refreshDest();
            alert('Import Cancelled.');
        };

        // Note: ipcRenderer.on in preload should return a cleanup function or we call off
        // My updated preload definition says it returns void probably?
        // Let's check preload implementation. It does return ipcRenderer.on result.
        // But `ipcRenderer.on` in Electron returns `this`. It doesn't return cleanup.
        // My `vite-env.d.ts` says `() => void`. I need to ensure preload implementation wraps it or verify.
        // Preload: `return ipcRenderer.on(...)`. Main process `on` returns event emitter.
        // Note: ipcRenderer.on now returns a cleanup function (see preload.ts)
        const cleanupProgress = window.ipcRenderer.on('import-progress', handleProgress);
        const cleanupComplete = window.ipcRenderer.on('import-complete', handleComplete);
        const cleanupCancelled = window.ipcRenderer.on('import-cancelled', handleCancelled);

        return () => {
            if (cleanupProgress) cleanupProgress();
            if (cleanupComplete) cleanupComplete();
            if (cleanupCancelled) cleanupCancelled();
        };
    }, []);

    const selectSource = useCallback(async () => {
        const path = await window.ipcRenderer.invoke('select-directory');
        if (path) setSourcePath(path);
    }, []);

    const selectDest = useCallback(async () => {
        const path = await window.ipcRenderer.invoke('select-directory');
        if (path) setDestPath(path);
    }, []);

    const scanSource = useCallback(async () => {
        if (!sourcePath) return;
        setScanning(true);
        try {
            const files = await window.ipcRenderer.invoke('scan-directory', sourcePath);
            setMediaFiles(files);
            // Also refresh destination to ensure "existing" status is up to date
            await refreshDest();
        } finally {
            setScanning(false);
        }
    }, [sourcePath, refreshDest]);



    // Scan destination to find existing files
    useEffect(() => {
        refreshDest();
    }, [destPath, refreshDest]);

    const importFiles = useCallback(async (filesToImport: string[]) => {
        if (!destPath) return;
        setImporting(true);
        setImportStats({
            processed: 0,
            total: filesToImport.length,
            success: 0,
            failed: 0,
            bytesProcessed: 0,
            lastFileDuration: 0
        });
        recentDurations.current = []; // Reset ETR tracking

        await window.ipcRenderer.invoke('start-import', filesToImport, destPath);
    }, [destPath]);

    const cancelImport = useCallback(async () => {
        await window.ipcRenderer.invoke('cancel-import');
    }, []);

    return {
        sourcePath,
        destPath,
        mediaFiles,
        existingFiles,
        scanning,
        importing,
        importStats,
        recentDurations: recentDurations.current,
        selectSource,
        selectDest,
        scanSource,
        importFiles,
        cancelImport
    };
}
