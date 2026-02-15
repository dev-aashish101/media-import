import { useEffect, useState, useRef } from 'react';
import { FileImage, Film } from 'lucide-react';

interface ThumbnailProps {
    file: MediaFile;
    isExisting: boolean;
    isSelected: boolean;
    onSelect: (path: string) => void;
}

export function Thumbnail({ file, isExisting, isSelected, onSelect }: ThumbnailProps) {
    const [thumbSrc, setThumbSrc] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (ref.current) {
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.current?.disconnect();
                }
            });
            observer.current.observe(ref.current);
        }
        return () => observer.current?.disconnect();
    }, []);

    useEffect(() => {
        if (isVisible && !thumbSrc) {
            window.ipcRenderer.invoke('get-thumbnail', file.path).then(setThumbSrc);
        }
    }, [isVisible, file.path]);

    const isVideo = file.name.match(/\.(mp4|mov|avi)$/i);

    return (
        <div
            ref={ref}
            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-transparent hover:border-zinc-600'
                } ${isExisting ? 'opacity-50 grayscale' : ''}`}
            onClick={() => !isExisting && onSelect(file.path)}
        >
            {thumbSrc ? (
                <img src={thumbSrc} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                    {isVideo ? <Film size={24} /> : <FileImage size={24} />}
                </div>
            )}

            {/* Overlay info */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-xs">
                <p className="truncate font-medium">{file.name}</p>
                <p className="opacity-75">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>

            {/* Existing Badge */}
            {isExisting && (
                <div className="absolute top-2 right-2 bg-yellow-500/80 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                    EXISTING
                </div>
            )}

            {/* Selection Checkmark */}
            {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-sm">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
    );
}
