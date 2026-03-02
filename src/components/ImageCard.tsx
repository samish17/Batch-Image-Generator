import { useStore, GeneratedImage } from '../store/useStore';
import { Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import type { MouseEvent } from 'react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { regenerateSingleImage } from '../services/geminiService';
import { motion } from 'framer-motion';

interface ImageCardProps {
  image: GeneratedImage;
  index: number;
  onClick: () => void;
}

export function ImageCard({ image, index, onClick }: ImageCardProps) {
  const { isGenerating, referenceImages, updateGeneratedImage, batchIdentifier, removeGeneratedImage } = useStore();

  const handleDownload = async (e: MouseEvent) => {
    e.stopPropagation();
    if (image.status !== 'success') return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const prefix = batchIdentifier ? `${batchIdentifier}_` : '';
      const fileName = `${prefix}${index + 1}.png`;
      saveAs(blob, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download image');
    }
  };

  const handleRegenerate = async (e: MouseEvent) => {
    e.stopPropagation();
    if (isGenerating) return;
    toast.info(`Regenerating image ${index + 1}...`);
    await regenerateSingleImage(image, referenceImages);
    toast.success(`Regenerated image ${index + 1}!`);
  };

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {!isGenerating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeGeneratedImage(image.id);
            }}
            className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
            title="Remove this slot"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {image.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <span className="text-xl font-bold text-zinc-400 dark:text-zinc-600">{index + 1}</span>
            </div>
            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500 text-center">
              Waiting for generation
            </span>
          </div>
        )}

        {image.status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 animate-pulse">
              Generating...
            </span>
          </div>
        )}

        {image.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-50/95 dark:bg-red-950/95 backdrop-blur-sm z-10 p-4 text-center overflow-y-auto">
            <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              Failed to generate
            </span>
            {image.errorMessage && (
              <span className="text-xs font-medium text-red-500 dark:text-red-300 line-clamp-4 break-words" title={image.errorMessage}>
                {image.errorMessage}
              </span>
            )}
            <button
              onClick={handleRegenerate}
              className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {image.status === 'success' && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Hover Actions */}
        {image.status === 'success' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all disabled:opacity-50"
                title="Regenerate this image"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all disabled:opacity-50"
                title="Download this image"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col border-t border-zinc-200 dark:border-zinc-800">
        {image.status === 'idle' || image.status === 'loading' || image.status === 'error' ? (
          <textarea
            value={image.prompt}
            onChange={(e) => updateGeneratedImage(image.id, { prompt: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder={`Custom prompt for image ${index + 1} (optional)`}
            disabled={isGenerating}
            className="w-full text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all disabled:opacity-50 flex-1 min-h-[80px]"
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
            {image.prompt}
          </p>
        )}
      </div>
    </div>
  );
}
