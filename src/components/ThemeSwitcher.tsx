'use client';

import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const { business } = useBusiness();
    const primaryColor = business?.color_primario || 'var(--theme-primary)';

    return (
        <div className="flex flex-col gap-2 p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic mb-1">
                Tema de Interfaz
            </p>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                        theme === 'light' 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Claro"
                >
                    <Sun size={16} />
                    <span className="hidden xl:inline">Claro</span>
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                        theme === 'dark' 
                            ? 'bg-slate-900 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Oscuro"
                >
                    <Moon size={16} />
                    <span className="hidden xl:inline">Oscuro</span>
                </button>
                <button
                    onClick={() => setTheme('brand')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                        theme === 'brand' 
                            ? 'text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    style={theme === 'brand' ? { backgroundColor: primaryColor } : {}}
                    title="Marca"
                >
                    <Palette size={16} />
                    <span className="hidden xl:inline">Marca</span>
                </button>
            </div>
        </div>
    );
}
