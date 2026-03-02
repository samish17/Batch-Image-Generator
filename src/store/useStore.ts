import { create } from 'zustand';

export interface ReferenceImage {
  id: string;
  file: File;
  preview: string;
  prompt: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  refImageId: string;
}

interface AppState {
  referenceImages: ReferenceImage[];
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  theme: 'light' | 'dark';
  addReferenceImages: (files: File[]) => void;
  removeReferenceImage: (id: string) => void;
  updateReferencePrompt: (id: string, prompt: string) => void;
  setGeneratedImages: (images: GeneratedImage[]) => void;
  updateGeneratedImage: (id: string, updates: Partial<GeneratedImage>) => void;
  removeGeneratedImage: (id: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  batchIdentifier: string;
  setBatchIdentifier: (id: string) => void;
  toggleTheme: () => void;
  clearAll: () => void;
  addEmptyGeneratedImages: (count: number) => void;
}

const getInitialGeneratedImages = (length: number = 3): GeneratedImage[] => Array.from({ length }).map(() => ({
  id: crypto.randomUUID(),
  url: '',
  prompt: '',
  status: 'idle',
  errorMessage: undefined,
  refImageId: '',
}));

export const useStore = create<AppState>((set) => ({
  referenceImages: [],
  generatedImages: getInitialGeneratedImages(3),
  isGenerating: false,
  theme: 'dark',
  batchIdentifier: '',
  setBatchIdentifier: (id) => set({ batchIdentifier: id }),
  addReferenceImages: (files) =>
    set((state) => {
      const newImages = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        prompt: '',
      }));
      return {
        referenceImages: [...state.referenceImages, ...newImages].slice(0, 5),
      };
    }),
  removeReferenceImage: (id) =>
    set((state) => ({
      referenceImages: state.referenceImages.filter((img) => img.id !== id),
    })),
  updateReferencePrompt: (id, prompt) =>
    set((state) => ({
      referenceImages: state.referenceImages.map((img) =>
        img.id === id ? { ...img, prompt } : img
      ),
    })),
  setGeneratedImages: (images) => set({ generatedImages: images }),
  updateGeneratedImage: (id, updates) =>
    set((state) => ({
      generatedImages: state.generatedImages.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    })),
  removeGeneratedImage: (id) =>
    set((state) => ({
      generatedImages: state.generatedImages.filter((img) => img.id !== id),
    })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    }),
  clearAll: () =>
    set({
      referenceImages: [],
      generatedImages: getInitialGeneratedImages(3),
      batchIdentifier: '',
    }),
  addEmptyGeneratedImages: (count) =>
    set((state) => ({
      generatedImages: [
        ...state.generatedImages,
        ...getInitialGeneratedImages(count)
      ]
    })),
}));
