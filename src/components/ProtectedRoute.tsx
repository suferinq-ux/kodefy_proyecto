'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/roles';
import { Loader2, Lock } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Solo redirigir si ya terminó de cargar y no está autenticado
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    // Mostrar loader mientras carga la sesión
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-theme-secondary mx-auto mb-4"></div>
                    <p className="text-stone-400 font-semibold">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    // Si no está autenticado, no mostrar nada (se redirigirá)
    if (!isAuthenticated) {
        return null;
    }

    // Si requiere permiso y no lo tiene
    if (requiredPermission && user) {
        const access = hasPermission(user.rol, requiredPermission);
        if (!access) {
            console.warn(`[ProtectedRoute] Denied: User role ${user.rol} needs ${requiredPermission}`);
            return (
                <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
                    <div className="text-center p-8 glass-panel max-w-sm w-full">
                        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2">Acceso Restringido</h2>
                        <p className="text-stone-400 text-sm font-medium mb-6">Tu cuenta ({user.rol}) no tiene permisos para ver esta sección.</p>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 bg-theme-secondary text-slate-900 font-black rounded-xl hover:brightness-105 active:scale-95 transition-all"
                        >
                            VOLVER AL INICIO
                        </button>
                    </div>
                </div>
            );
        }
    }

    // Todo bien, mostrar el contenido
    return <>{children}</>;
}
