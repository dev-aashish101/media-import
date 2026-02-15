/// <reference types="vite/client" />

interface MediaFile {
    path: string;
    name: string;
    size: number;
    dateStr: string;
    thumbnail?: string;
    originalDate?: string;
}

interface ImportResult {
    success: number;
    failed: number;
    skipped: number;
}

interface ImportStats {
    processed: number;
    total: number;
    success: number;
    failed: number;
    bytesProcessed: number;
    lastFileDuration: number;
    fileName?: string;
}

interface Window {
    ipcRenderer: {
        invoke(channel: 'select-directory'): Promise<string | null>;
        invoke(channel: 'scan-directory', path: string): Promise<MediaFile[]>;
        invoke(channel: 'get-thumbnail', path: string): Promise<string | null>;
        invoke(channel: 'get-metadata', path: string): Promise<{ dateStr: string, originalDate: string }>;

        // Old invoke (can remove if unused, but keeping compatible)
        invoke(channel: 'import-files', files: string[], dest: string): Promise<ImportResult>;

        invoke(channel: 'start-import', files: string[], dest: string): Promise<{ status: string }>;
        invoke(channel: 'cancel-import'): Promise<{ status: string }>;

        // Generic invoke
        invoke<T>(channel: string, ...args: any[]): Promise<T>;

        on(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
        off(channel: string, listener: (event: any, ...args: any[]) => void): void;
        send(channel: string, ...args: any[]): void;
    };
}

