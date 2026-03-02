import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../store/useStore';
import { UploadCloud, X, Image as ImageIcon, Wand2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateImages } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

export function UploadSection() {
  const {
    referenceImages,
    addReferenceImages,
    removeReferenceImage,
    updateReferencePrompt,
    isGenerating,
    setIsGenerating,
    setGeneratedImages,
    clearAll,
    generatedImages,
  } = useStore();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remainingSlots = 5 - referenceImages.length;
      if (remainingSlots <= 0) {
        toast.error('Maximum 5 images allowed');
        return;
      }
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      addReferenceImages(filesToAdd);
    },
    [referenceImages.length, addReferenceImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDrop as any,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isGenerating || referenceImages.length >= 5,
  });

  const handleGenerate = async () => {
    if (referenceImages.length === 0) {
      toast.error('Please upload at least one reference image.');
      return;
    }

    setIsGenerating(true);
    toast.info('Starting generation process...');

    try {
      const { generatedImages } = useStore.getState();
      
      const updatedImages = generatedImages.map((img, i) => {
        const refImage = referenceImages[i % referenceImages.length];
        return {
          ...img,
          status: 'loading' as const,
          errorMessage: undefined,
          refImageId: refImage.id,
          // Keep user's custom prompt if they typed one, otherwise it will be generated
        };
      });

      setGeneratedImages(updatedImages);

      // Call the service to handle the generation
      await generateImages(updatedImages, referenceImages);
      toast.success('Generation complete!');
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reference Images
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Upload up to 5 images to use as references.
          </p>
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-300">
          {referenceImages.length}/5 uploaded
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragActive
            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-yellow-400 dark:hover:border-yellow-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        } ${
          isGenerating || referenceImages.length >= 5
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : ''
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              JPEG, PNG, WebP (max 10MB)
            </p>
          </div>
        </div>
      </div>

      {referenceImages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {referenceImages.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col"
              >
                <div className="relative aspect-square group">
                  <img
                    src={img.preview}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeReferenceImage(img.id)}
                    disabled={isGenerating}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Prompt for this image
                  </label>
                  <textarea
                    value={img.prompt}
                    onChange={(e) => updateReferencePrompt(img.id, e.target.value)}
                    disabled={isGenerating}
                    placeholder="e.g., A cyberpunk version of this..."
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all disabled:opacity-50 flex-1 min-h-[80px]"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => {
            clearAll();
            toast.success('Cleared all prompts and generated images.');
          }}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <Trash2 className="w-5 h-5" />
          Clear All
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || referenceImages.length === 0 || generatedImages.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate {generatedImages.length} Images
            </>
          )}
        </button>
      </div>
    </section>
  );
}
