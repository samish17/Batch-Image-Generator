import { useStore } from '../store/useStore';
import { Moon, Sun, Sparkles } from 'lucide-react';

export function Header() {
  const { theme, toggleTheme } = useStore();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 dark:bg-zinc-950/75 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm shadow-yellow-400/20">
            <span className="text-2xl">🍌</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              Nano Banana <Sparkles className="w-4 h-4 text-yellow-500" />
            </h1>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              AI Image Generation
            </p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-zinc-400 hover:text-yellow-400 transition-colors" />
          ) : (
            <Moon className="w-5 h-5 text-zinc-500 hover:text-indigo-500 transition-colors" />
          )}
        </button>
      </div>
    </header>
  );
}
