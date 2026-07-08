'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/lib/roles';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: Usuario | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Load user session on mount
    useEffect(() => {
        loadUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loadUser = async () => {
        try {
            console.log('[AuthContext] Loading user session...');
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('[AuthContext] Error getting session:', error);
                throw error;
            }

            console.log('[AuthContext] Session:', session ? 'Found' : 'Not found');

            if (session?.user) {
                console.log('[AuthContext] User ID:', session.user.id);
                await loadUserProfile(session.user.id);
            } else {
                console.log('[AuthContext] No session, setting user to null');
                setUser(null);
            }
        } catch (error: any) {
            console.error('[AuthContext] Error loading user:', error);

            // Si el error es de token invalido, cerramos sesión para limpiar el estado
            if (error?.message?.includes('Refresh Token Not Found') ||
                error?.message?.includes('Invalid Refresh Token')) {
                console.log('[AuthContext] Invalid token detected, clearing session...');
                await supabase.auth.signOut();
            }

            setUser(null);
        } finally {
            setLoading(false);
            console.log('[AuthContext] Loading complete');
        }
    };

    const loadUserProfile = async (userId: string) => {
        try {
            console.log('[AuthContext] Loading profile for user:', userId);
            let { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') {
                console.log('[AuthContext] Perfil faltante en carga inicial, auto-generando...');

                // We try to get the email from the session to determine the initial name
                const { data: { session } } = await supabase.auth.getSession();
                const email = session?.user?.email || '';
                const esAdmin = email.toLowerCase().includes('admin');

                const nuevoPerfil = {
                    id: userId,
                    email: email,
                    nombre: esAdmin ? 'Administrador' : (email ? email.split('@')[0] : 'Usuario Generado'),
                    rol: esAdmin ? 'admin' : 'mozo',
                    activo: true
                };

                const { error: insertError } = await supabase.from('user_profiles').insert(nuevoPerfil);

                if (!insertError) {
                    profile = nuevoPerfil as any;
                    error = null;
                }
            }

            if (error) {
                console.error('[AuthContext] Profile error:', error);
                throw error;
            }

            if (profile) {
                console.log('[AuthContext] Profile loaded:', profile.nombre, profile.rol);
                setUser({
                    id: profile.id,
                    negocio_id: profile.negocio_id || null,
                    nombre: profile.nombre,
                    email: profile.email,
                    rol: profile.rol,
                    activo: true,
                    es_super_admin: profile.es_super_admin || false,
                    created_at: profile.created_at
                });
            }
        } catch (error) {
            console.error('[AuthContext] Error loading profile:', error);
            setUser(null);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data.user) {
                // Cargar el perfil directamente y establecer el usuario
                let { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                // Auto-recuperación si el perfil falta en la tabla user_profiles (PGRST116: no retornó filas)
                if (profileError && profileError.code === 'PGRST116') {
                    console.log('[AuthContext] Perfil faltante, auto-generando...');

                    const esAdmin = email.toLowerCase().includes('admin');

                    const nuevoPerfil = {
                        id: data.user.id,
                        email: email,
                        nombre: esAdmin ? 'Administrador' : email.split('@')[0],
                        rol: esAdmin ? 'admin' : 'mozo',
                        activo: true
                    };

                    const { error: insertError } = await supabase.from('user_profiles').insert(nuevoPerfil);

                    if (!insertError) {
                        profile = nuevoPerfil as any;
                        profileError = null;
                    } else {
                        console.error('[AuthContext] Error creando perfil automático:', insertError);
                    }
                }

                if (profileError) {
                    console.error('[AuthContext] Profile error during login:', profileError);
                    throw profileError;
                }

                if (profile) {
                    // Establecer el usuario directamente para evitar race conditions
                    setUser({
                        id: profile.id,
                        negocio_id: profile.negocio_id || null,
                        nombre: profile.nombre,
                        email: profile.email,
                        rol: profile.rol,
                        activo: true,
                        es_super_admin: profile.es_super_admin || false,
                        created_at: profile.created_at
                    });
                    console.log('[AuthContext] User set after login:', profile.nombre);
                    toast.success(`¡Bienvenido, ${profile.nombre}!`);
                    return true;
                }
            }

            return false;
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Error al iniciar sesión');
            return false;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            toast.success('Sesión cerrada');
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error al cerrar sesión');
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: user !== null
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
