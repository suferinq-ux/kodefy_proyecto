'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AlertasPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlertas() {
      const { data } = await supabase
        .from('insumos')
        .select('id, nombre, sku, stock_actual, stock_minimo, unidades_medida(abreviatura)')
        .lte('stock_actual', 'stock_minimo') // stock <= min
        .order('stock_actual', { ascending: true });
      
      setAlertas(data || []);
      setLoading(false);
    }
    loadAlertas();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Alertas de Stock</h1>
        <p className="text-slate-500 text-sm mt-1">Insumos que requieren reposición urgente.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando alertas...</div>
        ) : alertas.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Todo en orden</h3>
            <p className="text-slate-500 mt-1">No tienes ningún insumo con stock crítico.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertas.map(a => (
              <div key={a.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{a.nombre}</h3>
                    <p className="text-sm text-slate-500">SKU: {a.sku || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Stock Actual</p>
                  <p className="text-xl font-black text-red-600 flex items-baseline justify-end gap-1">
                    {a.stock_actual} <span className="text-sm font-medium text-red-400">{a.unidades_medida?.abreviatura}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Mínimo: {a.stock_minimo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
