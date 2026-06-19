import React, { useState, useRef, useEffect } from 'react';
import { Palette, Moon, Sun, Leaf, Flame } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const themes: { id: Theme; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'light', name: 'Classic Blue', icon: <Sun size={16} />, color: '#0d60d8' },
    { id: 'dark', name: 'Midnight Navy', icon: <Moon size={16} />, color: '#1e293b' },
    { id: 'emerald', name: 'Emerald Growth', icon: <Leaf size={16} />, color: '#059669' },
    { id: 'sunset', name: 'Sunset Gold', icon: <Flame size={16} />, color: '#d97706' },
  ];

  const currentThemeObj = themes.find(t => t.id === theme) || themes[0];

  return (
    <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-surface text-text-main border border-border rounded-full shadow-sm hover:bg-surface-hover transition-colors font-medium text-sm"
      >
        <Palette size={16} className="text-primary" />
        <span className="hidden sm:inline">{currentThemeObj.name}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="py-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                    theme === t.id 
                      ? 'bg-primary/10 text-primary font-bold' 
                      : 'text-text-main hover:bg-surface-hover'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: t.color }}
                  ></div>
                  <span className="flex-1">{t.name}</span>
                  {theme === t.id && t.icon}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
