'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BusinessProvider } from '@/contexts/BusinessContext';
import BusinessThemeProvider from '@/components/BusinessThemeProvider';
import type { Negocio } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import DynamicFavicon from '@/components/DynamicFavicon';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    
    const [business, setBusiness] = useState<Negocio | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        
        async function fetchBusiness() {
            const { data, error } = await supabase
                .from('negocios')
                .select('*')
                .eq('slug', slug)
                .single();
                
            if (error || !data) {
                console.error("Business not found", error);
                router.push('/login');
            } else {
                setBusiness(data);
            }
            setLoading(false);
        }
        
        fetchBusiness();

        // Suscripción en tiempo real a los cambios del negocio actual
        const channel = supabase
            .channel(`negocios-changes-${slug}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'negocios', filter: `slug=eq.${slug}` },
                (payload) => {
                    if (payload.new) {
                        setBusiness(payload.new as Negocio);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [slug, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!business) return null;

    return (
        <BusinessProvider business={business}>
            <DynamicFavicon />
            <BusinessThemeProvider>
                <div id="app-root" className="flex min-h-screen w-full overflow-x-hidden bg-[#f8fafc]">
                    <div className="print:hidden">
                        <Navbar />
                    </div>
                    <div className="flex-1 flex flex-col min-h-screen w-full lg:pl-60 relative">
                        <main className="flex-1 w-full max-w-[100vw] p-4 sm:p-6 lg:p-8 pt-20 lg:pt-6 pb-24 lg:pb-8">
                            {children}
                        </main>
                    </div>
                </div>
            </BusinessThemeProvider>
        </BusinessProvider>
    );
}
