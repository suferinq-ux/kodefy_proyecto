'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Temas disponibles:
 * - 'light': Sidebar blanco con bordes suaves (actual)
 * - 'dark': Sidebar oscuro profesional (slate-900)  
 * - 'brand': Sidebar con el color de marca del negocio (como la imagen de referencia)
 */
type Theme = 'light' | 'dark' | 'brand';

interface ThemeContextProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
    theme: 'brand',
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('brand');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('kodefy_theme') as Theme;
        if (savedTheme && ['light', 'dark', 'brand'].includes(savedTheme)) {
            setThemeState(savedTheme);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        // Solo guardamos en localStorage — no tocamos clases de html
        // Cada componente decide cómo renderizar según el tema
        localStorage.setItem('kodefy_theme', theme);
    }, [theme, mounted]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
            {children}
        </ThemeContext.Provider>
    );
}
