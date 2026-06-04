import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Header() {
  const { theme, toggle } = useTheme();
  return (
    <header className="w-full border-b border-black/10 dark:border-white/10">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 md:px-10 py-4 sm:py-5 flex items-center justify-center">
        <Link
          to="/"
          className="font-display text-base sm:text-lg md:text-xl tracking-wide hover:opacity-70 transition-opacity"
        >
          Dirty_Sheep 纪
        </Link>
        <button
          aria-label="toggle theme"
          onClick={toggle}
          className="absolute right-5 sm:right-6 md:right-10 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity p-1"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
