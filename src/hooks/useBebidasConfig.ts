'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Core brands that are always present (hardcoded base)
const CORE_BRANDS = [
    {
        key: 'inca_kola',
        name: 'Inca Kola',
        dot: 'bg-yellow-500',
        isCore: true,
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'gordita', label: 'Gordita', desc: '625ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'coca_cola',
        name: 'Coca Cola',
        dot: 'bg-red-600',
        isCore: true,
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'fanta',
        name: 'Fanta',
        dot: 'bg-orange-500',
        isCore: true,
        sizes: [
            { key: 'descartable', label: 'Personal', desc: '500ml' },
        ],
    },
    {
        key: 'agua_mineral',
        name: 'Agua Mineral',
        dot: 'bg-sky-400',
        isCore: true,
        sizes: [
            { key: 'personal', label: 'Personal', desc: '600ml' },
        ],
    },
];

export interface BrandSize {
    key: string;
    label: string;
    desc: string;
}

export interface BrandConfig {
    key: string;
    name: string;
    dot: string;
    isCore: boolean;
    catalogId?: string; // UUID from catalogo_bebidas for custom ones
    sizes: BrandSize[];
}

export interface NuevaBebida {
    nombre: string;
    dot_color: string;
    formatos: { key: string; label: string; desc: string; precio: number }[];
}

/**
 * Hook centralizado que combina marcas base (hardcoded) con marcas extras del catálogo.
 * Se usa en Apertura, Cierre y Configuración para garantizar consistencia.
 */
export function useBebidasConfig() {
    const { user } = useAuth();
    const [customBrands, setCustomBrands] = useState<BrandConfig[]>([]);
    const [masterStock, setMasterStock] = useState<Record<string, Record<string, number>>>({});
    const [loading, setLoading] = useState(true);
    const [loadingMasterStock, setLoadingMasterStock] = useState(true);

    const fetchMasterStock = async () => {
        if (!user?.negocio_id) return;
        setLoadingMasterStock(true);
        try {
            const { data, error } = await supabase
                .from('stock_maestro_bebidas')
                .select('stock')
                .eq('negocio_id', user.negocio_id)
                .maybeSingle();

            if (data?.stock) {
                setMasterStock(data.stock as any);
            }
        } catch (err) {
            console.error('[useBebidasConfig] Error fetching master stock:', err);
        } finally {
            setLoadingMasterStock(false);
        }
    };

    const fetchCustomBrands = async () => {
        try {
            const { data, error } = await supabase
                .from('catalogo_bebidas')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (error) {
                console.warn('[useBebidasConfig] Error fetching catalog:', error.message);
                setCustomBrands([]);
                return;
            }

            const mapped: BrandConfig[] = (data || []).map((item: any) => ({
                key: item.slug,
                name: item.nombre,
                dot: item.dot_color,
                isCore: false,
                catalogId: item.id,
                sizes: (item.formatos || []).map((f: any) => ({
                    key: f.key,
                    label: f.label,
                    desc: f.desc,
                })),
            }));

            setCustomBrands(mapped);
        } catch (err) {
            console.error('[useBebidasConfig] Unexpected error:', err);
            setCustomBrands([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomBrands();
        fetchMasterStock();
    }, [user?.negocio_id]);

    // Merged list: core brands + custom brands
    const allBrands: BrandConfig[] = [...CORE_BRANDS, ...customBrands];

    // Generate empty stock object for all brands
    const generateEmptyStock = (): Record<string, Record<string, number>> => {
        const stock: Record<string, Record<string, number>> = {};
        for (const brand of allBrands) {
            stock[brand.key] = {};
            for (const size of brand.sizes) {
                stock[brand.key][size.key] = 0;
            }
        }
        return stock;
    };

    // Merge existing stock with potentially new brands (keeps existing values, adds new ones as 0)
    const mergeWithStock = (existing: Record<string, any>): Record<string, Record<string, number>> => {
        const merged = generateEmptyStock();
        if (!existing) return merged;

        for (const brandKey of Object.keys(existing)) {
            if (merged[brandKey]) {
                for (const sizeKey of Object.keys(existing[brandKey])) {
                    merged[brandKey][sizeKey] = existing[brandKey][sizeKey] || 0;
                }
            } else {
                // Brand exists in DB but not in catalog (possibly deleted) - still keep it
                merged[brandKey] = existing[brandKey];
            }
        }
        return merged;
    };

    // CRUD: Add a new custom beverage
    const addBeverage = async (nueva: NuevaBebida): Promise<{ success: boolean; message: string }> => {
        try {
            const slug = nueva.nombre
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_|_$/g, '');

            const { data, error } = await supabase
                .from('catalogo_bebidas')
                .insert({
                    nombre: nueva.nombre,
                    slug,
                    dot_color: nueva.dot_color,
                    formatos: nueva.formatos,
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return { success: false, message: 'Ya existe una bebida con ese nombre.' };
                }
                throw error;
            }

            // Also create productos entries for each formato so they're sellable in POS
            const CATEGORIA_BEBIDAS_ID = 'fe4fd5ae-c14e-4ef4-95c1-73cb72ac80bf';
            for (const formato of nueva.formatos) {
                const nombreProducto = `${nueva.nombre} ${formato.label}`;
                await supabase.from('productos').insert({
                    nombre: nombreProducto,
                    tipo: 'bebida',
                    precio: formato.precio,
                    fraccion_pollo: 0,
                    activo: true,
                    marca_gaseosa: slug,
                    tipo_gaseosa: formato.key,
                    categoria_id: CATEGORIA_BEBIDAS_ID,
                    negocio_id: user?.negocio_id
                });
            }

            await fetchCustomBrands();
            return { success: true, message: `"${nueva.nombre}" registrada exitosamente.` };
        } catch (err: any) {
            console.error('[addBeverage] Error:', err);
            return { success: false, message: err.message || 'Error al registrar bebida.' };
        }
    };

    // CRUD: Delete a custom beverage
    const deleteBeverage = async (catalogId: string): Promise<{ success: boolean; message: string }> => {
        try {
            const { error } = await supabase
                .from('catalogo_bebidas')
                .update({ activo: false })
                .eq('id', catalogId);

            if (error) throw error;
            await fetchCustomBrands();
            return { success: true, message: 'Bebida desactivada.' };
        } catch (err: any) {
            return { success: false, message: err.message || 'Error al desactivar.' };
        }
    };

    // Master Stock Management
    const updateMasterStock = async (newStock: Record<string, Record<string, number>>) => {
        if (!user?.negocio_id) return { success: false, message: 'No hay sesión activa' };
        
        try {
            const { error } = await supabase
                .from('stock_maestro_bebidas')
                .upsert(
                    {
                        negocio_id: user.negocio_id,
                        stock: newStock,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'negocio_id' }
                );

            if (error) throw error;
            setMasterStock(newStock);
            return { success: true, message: 'Inventario maestro actualizado' };
        } catch (err: any) {
            console.error('[updateMasterStock] Error:', err);
            return { success: false, message: err.message };
        }
    };

    return {
        allBrands,
        customBrands,
        loading,
        loadingMasterStock,
        generateEmptyStock,
        mergeWithStock,
        addBeverage,
        deleteBeverage,
        masterStock,
        updateMasterStock,
        refetch: fetchCustomBrands,
    };
}
