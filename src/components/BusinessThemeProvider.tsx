'use client';

import React, { useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';

export default function BusinessThemeProvider({ children }: { children: React.ReactNode }) {
    const { business } = useBusiness();

    useEffect(() => {
        if (business) {
            const root = document.documentElement;
            if (business.color_primario) {
                root.style.setProperty('--theme-primary', business.color_primario);
            }
            if (business.color_secundario) {
                root.style.setProperty('--theme-secondary', business.color_secundario);
            }
        }
    }, [business]);

    return <>{children}</>;
}
