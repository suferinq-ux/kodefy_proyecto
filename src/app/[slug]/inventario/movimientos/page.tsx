'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRightLeft, Search, Filter, Download, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function MovimientosPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovimientos();
  }, []);

  async function loadMovimientos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select(`
          *,
          insumos(nombre, sku),
          almacenes(nombre)
        `)
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovimientos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar movimientos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const getTipoColor = (tipo: string, cantidad: number) => {
    if (tipo === 'compra' || tipo === 'devolucion') return 'text-green-600 bg-green-50';
    if (tipo === 'venta' || tipo === 'merma') return 'text-red-600 bg-red-50';
    if (cantidad > 0) return 'text-green-600 bg-green-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kardex y Movimientos</h1>
          <p className="text-slate-500 text-sm mt-1">Historial de entradas y salidas de inventario.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo Ajuste
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Cantidad</th>
                <th className="px-6 py-4 text-right">Stock Anterior</th>
                <th className="px-6 py-4 text-right">Nuevo Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Cargando movimientos...</td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No hay movimientos registrados.</td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(mov.fecha), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {mov.insumos?.nombre}
                      <span className="block text-xs text-slate-400 font-normal">{mov.insumos?.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getTipoColor(mov.tipo_movimiento, mov.cantidad)}`}>
                        {mov.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      <span className={mov.cantidad > 0 ? 'text-green-500' : 'text-red-500'}>
                        {mov.cantidad > 0 ? '+' : ''}{Number(mov.cantidad).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {Number(mov.stock_anterior).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {Number(mov.stock_actual).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
