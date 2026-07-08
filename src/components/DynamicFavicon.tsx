'use client';

import { useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePathname } from 'next/navigation';

export default function DynamicFavicon() {
    let business: any = null;
    try {
        const context = useBusiness();
        business = context.business;
    } catch (e) {
        // Outside BusinessProvider
    }

    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        const isBusinessPath = pathname.split('/').length > 1 && 
                               !['login', 'super-admin', 'forgot-password', 'reset-password'].includes(pathname.split('/')[1]);

        if (isBusinessPath && !business) return;

        // Determine which icon to show
        let iconUrl = '/kodefy-icon.png'; 
        const timestamp = new Date().getTime();

        if (isLoginPage) {
            iconUrl = `/kodefy-icon.png?v=${timestamp}`; 
        } else if (business?.logo_url) {
            const separator = business.logo_url.includes('?') ? '&' : '?';
            iconUrl = `${business.logo_url}${separator}v=${timestamp}`;
        } else {
            iconUrl = `/kodefy-icon.png?v=${timestamp}`;
        }

        // Helper to update or create link tags
        const updateIcon = (rel: string) => {
            let link: HTMLLinkElement | null = document.querySelector(`link[rel*='${rel}']`);
            if (!link) {
                link = document.createElement('link');
                link.rel = rel;
                document.head.appendChild(link);
            }
            link.href = iconUrl;
            
            // Set type based on extension
            const lowerUrl = iconUrl.toLowerCase();
            if (lowerUrl.includes('.png')) link.type = 'image/png';
            else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) link.type = 'image/jpeg';
            else if (lowerUrl.includes('.svg')) link.type = 'image/svg+xml';
            else if (lowerUrl.includes('.ico')) link.type = 'image/x-icon';
        };

        // Update all possible favicon rels
        updateIcon('icon');
        updateIcon('shortcut icon');
        updateIcon('apple-touch-icon');

        // Update document title
        if (business?.nombre && !isLoginPage) {
            document.title = `${business.nombre} - Panel de Gestión`;
        } else if (isLoginPage) {
            document.title = 'KODEFY POS - Iniciar Sesión';
        } else {
            document.title = 'KODEFY POS - Multi-Tenant SaaS';
        }
    }, [business, isLoginPage, pathname]);

    return null;
}
