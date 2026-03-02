import { useState, useEffect, useCallback } from 'react';
import { GeneratedImage, useStore } from '../store/useStore';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

interface LightboxProps {
  images: GeneratedImage[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { batchIdentifier, generatedImages } = useStore();

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  const handleDownload = async () => {
    const image = images[currentIndex];
    const absoluteIndex = generatedImages.findIndex((img) => img.id === image.id);
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const prefix = batchIdentifier ? `${batchIdentifier}_` : '';
      saveAs(blob, `${prefix}${absoluteIndex + 1}.png`);
    } catch (error) {
      console.error('Failed to download image', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
        >
          <X className="w-6 h-6" />
        </button>

        <button
          onClick={handlePrev}
          className="absolute left-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col items-center justify-center p-4">
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={images[currentIndex].url}
            alt={images[currentIndex].prompt}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          />
          <div className="mt-6 w-full max-w-3xl flex items-start justify-between gap-4">
            <p className="text-white/80 text-lg font-medium leading-relaxed">
              {images[currentIndex].prompt}
            </p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="absolute right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
