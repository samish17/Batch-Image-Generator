import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ImageCard } from './ImageCard';
import { Lightbox } from './Lightbox';
import { DownloadCloud, RefreshCw, FileText } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { regenerateAllImages, extractPromptsFromFile } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { showDesktopNotification, requestNotificationPermission } from '../lib/utils';

export function Gallery() {
  const { generatedImages, isGenerating, referenceImages, updateGeneratedImage, batchIdentifier, setBatchIdentifier, addEmptyGeneratedImages, setGeneratedImages } = useStore();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const hasSuccessfulImages = generatedImages.some((img) => img.status === 'success');
  const hasStartedGeneration = generatedImages.some((img) => img.status !== 'idle');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    requestNotificationPermission();
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExtracting(true);
    toast.info('Extracting prompts from file...');
    
    try {
      const prompts = await extractPromptsFromFile(file);
      if (prompts.length === 0) {
        toast.warning('No prompts found in the file.');
        return;
      }
      
      // Fill in the prompts
      const { generatedImages: currentImages } = useStore.getState();
      let targetImages = currentImages;
      
      if (prompts.length > currentImages.length) {
        addEmptyGeneratedImages(prompts.length - currentImages.length);
        targetImages = useStore.getState().generatedImages;
      }
      
      const updatedImages = targetImages.map((img, index) => {
        if (index < prompts.length) {
          return { ...img, prompt: prompts[index] };
        }
        return img;
      });
      
      setGeneratedImages(updatedImages);
      
      toast.success(`Successfully extracted ${Math.min(prompts.length, 20)} prompts!`);
      showDesktopNotification('Extraction Complete', `Successfully extracted ${Math.min(prompts.length, 20)} prompts from your file.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to extract prompts from file.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadAll = async () => {
    const successfulImages = generatedImages.filter((img) => img.status === 'success');
    if (successfulImages.length === 0) {
      toast.error('No successful images to download.');
      return;
    }

    const zip = new JSZip();
    const prefix = batchIdentifier ? `${batchIdentifier}_` : '';
    generatedImages.forEach((img, index) => {
      if (img.status === 'success') {
        const base64Data = img.url.split(',')[1];
        zip.file(`${prefix}${index + 1}.png`, base64Data, { base64: true });
      }
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().split('T')[0];
      const zipName = batchIdentifier ? `${batchIdentifier}-${timestamp}.zip` : `nano-banana-gen-${timestamp}.zip`;
      saveAs(content, zipName);
      toast.success('Downloaded all images successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create ZIP file.');
    }
  };

  const handleRegenerateAll = async () => {
    if (isGenerating) return;
    requestNotificationPermission();
    toast.info('Regenerating all images...');
    await regenerateAllImages(generatedImages, referenceImages);
    toast.success('Regeneration complete!');
    showDesktopNotification('Regeneration Complete', 'All images have finished regenerating.');
  };

  return (
    <section className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {hasStartedGeneration ? 'Generated Gallery' : 'Individual Image Prompts'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {hasStartedGeneration 
              ? `Your ${generatedImages.length} unique variations based on reference images.`
              : `Optionally provide specific prompts for each of the ${generatedImages.length} images before generating.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Batch Identifier (e.g. MyBatch)"
            value={batchIdentifier}
            onChange={(e) => setBatchIdentifier(e.target.value)}
            disabled={isGenerating}
            className="px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
          />
          {!hasStartedGeneration && (
            <>
              <div className="flex items-center gap-2 mr-2 border-r border-zinc-200 dark:border-zinc-800 pr-4">
                <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Add slots:</span>
                {[1, 3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    onClick={() => addEmptyGeneratedImages(num)}
                    disabled={isGenerating}
                    className="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded transition-colors disabled:opacity-50"
                  >
                    +{num}
                  </button>
                ))}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || isExtracting}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <FileText className={`w-4 h-4 ${isExtracting ? 'animate-pulse' : ''}`} />
                {isExtracting ? 'Extracting...' : 'Import Prompts'}
              </button>
            </>
          )}
          <button
            onClick={handleRegenerateAll}
            disabled={isGenerating || !hasStartedGeneration}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate All
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={isGenerating || !hasSuccessfulImages}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            Download All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {generatedImages.map((img, index) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="w-full"
            >
              <ImageCard
                image={img}
                index={index}
                onClick={() => img.status === 'success' && setLightboxIndex(index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={generatedImages.filter((img) => img.status === 'success')}
          initialIndex={generatedImages
            .filter((img) => img.status === 'success')
            .findIndex((img) => img.id === generatedImages[lightboxIndex].id)}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
