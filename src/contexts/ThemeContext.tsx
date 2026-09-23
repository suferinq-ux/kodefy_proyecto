'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'brand';

interface ThemeContextProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
    theme: 'light',
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Cargar el tema desde localStorage al montar
        const savedTheme = localStorage.getItem('kodefy_theme') as Theme;
        if (savedTheme && ['light', 'dark', 'brand'].includes(savedTheme)) {
            setThemeState(savedTheme);
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setThemeState('dark');
            }
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        const root = document.documentElement;
        
        // Quitar clases anteriores
        root.classList.remove('dark', 'theme-brand');
        
        // Aplicar nuevas clases
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'brand') {
            root.classList.add('dark', 'theme-brand');
        }

        // Guardar en localStorage
        localStorage.setItem('kodefy_theme', theme);
    }, [theme, mounted]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
            {children}
        </ThemeContext.Provider>
    );
}
