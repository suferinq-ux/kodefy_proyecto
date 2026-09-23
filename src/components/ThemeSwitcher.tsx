'use client';

import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';

export default function ThemeSwitcher({ variant = 'default' }: { variant?: 'default' | 'branded' }) {
    const { theme, setTheme } = useTheme();
    const { business } = useBusiness();
    const primaryColor = business?.color_primario || '#3b82f6';

    // Determinar si el fondo del sidebar es oscuro (dark o brand)
    const isDarkBg = variant === 'branded';

    const themes: { key: 'light' | 'dark' | 'brand'; icon: typeof Sun; label: string }[] = [
        { key: 'light', icon: Sun, label: 'Claro' },
        { key: 'dark', icon: Moon, label: 'Oscuro' },
        { key: 'brand', icon: Palette, label: 'Marca' },
    ];

    return (
        <div className={`flex flex-col gap-2 px-4 py-3 mt-auto border-t ${
            isDarkBg ? 'border-white/10' : 'border-slate-100'
        }`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${
                isDarkBg ? 'text-white/40' : 'text-slate-400'
            }`}>
                Tema
            </p>
            <div className={`flex items-center gap-1 p-1 rounded-lg ${
                isDarkBg ? 'bg-black/20' : 'bg-slate-100'
            }`}>
                {themes.map(({ key, icon: Icon, label }) => {
                    const isActive = theme === key;
                    let activeClasses = '';
                    let activeStyle: React.CSSProperties = {};

                    if (isActive) {
                        if (key === 'light') {
                            activeClasses = 'bg-white text-slate-800 shadow-sm';
                        } else if (key === 'dark') {
                            activeClasses = 'bg-slate-800 text-white shadow-sm';
                        } else {
                            activeClasses = 'text-white shadow-sm';
                            activeStyle = { backgroundColor: primaryColor };
                        }
                    }

                    return (
                        <button
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-[11px] font-bold transition-all ${
                                isActive
                                    ? activeClasses
                                    : isDarkBg
                                        ? 'text-white/50 hover:text-white/80'
                                        : 'text-slate-400 hover:text-slate-600'
                            }`}
                            style={isActive ? activeStyle : {}}
                            title={label}
                        >
                            <Icon size={14} />
                            <span className="hidden xl:inline">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
