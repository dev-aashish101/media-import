import { useState, useMemo } from 'react';
import { useMediaScan } from './hooks/useMediaScan';
import { Thumbnail } from './components/Thumbnail';
import { FolderOpen, UploadCloud, RefreshCw, CheckSquare, Square, XCircle } from 'lucide-react';
import clsx from 'clsx';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return 'less than a second';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minutes`;
}

export default function App() {
  const {
    sourcePath, destPath, mediaFiles, existingFiles,
    scanning, importing, importStats, recentDurations,
    selectSource, selectDest, scanSource, importFiles, cancelImport
  } = useMediaScan();

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  const handleSelect = (path: string) => {
    const newSet = new Set(selectedPaths);
    if (newSet.has(path)) newSet.delete(path);
    else newSet.add(path);
    setSelectedPaths(newSet);
  };

  const selectAllNew = () => {
    const newSet = new Set<string>();
    mediaFiles.forEach(f => {
      const key = `${f.name}_${f.size}`; // Match existing logic
      const isExisting = existingFiles.has(f.name) || existingFiles.has(key);
      if (!isExisting) newSet.add(f.path);
    });
    setSelectedPaths(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size > 0) {
      setSelectedPaths(new Set());
    } else {
      selectAllNew();
    }
  };

  const handleImport = async () => {
    if (selectedPaths.size === 0) return;
    await importFiles(Array.from(selectedPaths));
    setSelectedPaths(new Set());
  };

  const newFilesCount = useMemo(() => {
    return mediaFiles.filter(f => !existingFiles.has(f.name) && !existingFiles.has(`${f.name}_${f.size}`)).length;
  }, [mediaFiles, existingFiles]);

  const selectedSize = useMemo(() => {
    let size = 0;
    mediaFiles.forEach(f => {
      if (selectedPaths.has(f.path)) {
        size += f.size;
      }
    });
    return size;
  }, [mediaFiles, selectedPaths]);

  const etr = useMemo(() => {
    if (!importStats || recentDurations.length === 0) return null;
    const avgDuration = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
    const remaining = importStats.total - importStats.processed;
    return avgDuration * remaining;
  }, [importStats, recentDurations]);

  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      {/* Header */}
      <header
        className="px-6 py-4 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 flex justify-between items-center z-10 sticky top-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <UploadCloud size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Media Import</h1>
            <div className="flex gap-4 text-xs text-zinc-400" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button onClick={selectSource} className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                <FolderOpen size={12} /> {sourcePath ? sourcePath.split('/').pop() : 'Select Source'}
              </button>
              <span className="text-zinc-700">→</span>
              <button onClick={selectDest} className="hover:text-amber-400 transition-colors flex items-center gap-1">
                <FolderOpen size={12} /> {destPath ? destPath.split('/').pop() : 'Select Destination'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {importing && importStats ? (
            <div className="flex items-center gap-4 bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700 select-none">
              <div className="flex flex-col w-40">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>{importStats.processed} / {importStats.total}</span>
                  <span>{Math.round((importStats.processed / importStats.total) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${(importStats.processed / importStats.total) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 truncate">
                  ETR: {etr ? formatDuration(etr) : 'Calculating...'}
                </div>
              </div>
              <button
                onClick={cancelImport}
                className="text-red-400 hover:text-red-300 transition-colors p-1"
                title="Stop Import"
              >
                <XCircle size={20} />
              </button>
            </div>
          ) : (
            <>
              {selectedPaths.size > 0 && (
                <span className="text-xs text-zinc-500 font-mono self-center mr-2">
                  {formatBytes(selectedSize)} to import
                </span>
              )}
              <button
                onClick={scanSource}
                disabled={!sourcePath || scanning || importing}
                className="btn-secondary"
              >
                <RefreshCw size={16} className={clsx(scanning && "animate-spin")} />
                {scanning ? 'Scanning...' : 'Scan'}
              </button>

              <button
                onClick={handleImport}
                disabled={selectedPaths.size === 0 || importing}
                className="btn-primary"
              >
                {importing ? 'Importing...' : `Import ${selectedPaths.size} Files`}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {mediaFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50">
            <UploadCloud size={64} className="mb-4 stroke-1" />
            <p>Select source and destination to begin</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-semibold text-zinc-400">
                Found {mediaFiles.length} files ({newFilesCount} New)
              </h2>
              <button onClick={toggleSelectAll} disabled={importing} className="text-xs hover:text-white text-zinc-500 flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {selectedPaths.size > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
                Select All New
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {mediaFiles.map((file) => {
                const isExisting = existingFiles.has(file.name) || existingFiles.has(`${file.name}_${file.size}`);
                const isSelected = selectedPaths.has(file.path);
                return (
                  <Thumbnail
                    key={file.path}
                    file={file}
                    isExisting={isExisting}
                    isSelected={isSelected}
                    onSelect={importing ? () => { } : handleSelect}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="px-6 py-2 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-500 flex justify-between uppercase tracking-wider font-medium">
        <span>{importing ? 'IMPORTING...' : 'READY'}</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
