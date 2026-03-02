import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { Gallery } from './components/Gallery';
import { Toaster } from 'sonner';

export default function App() {
  const { theme, isGenerating } = useStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <UploadSection />
        <Gallery />
      </main>
      <Toaster position="bottom-right" theme={theme} />
    </div>
  );
}
