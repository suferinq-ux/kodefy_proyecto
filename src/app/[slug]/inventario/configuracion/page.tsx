'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Tag, Scale, Warehouse, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBusiness } from '@/contexts/BusinessContext';

export default function ConfiguracionInventarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { business } = useBusiness();
  const negocio_id = business?.id;

  const [categorias, setCategorias] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCategoria, setNewCategoria] = useState('');
  const [newUnidadNombre, setNewUnidadNombre] = useState('');
  const [newUnidadAbrv, setNewUnidadAbrv] = useState('');

  useEffect(() => {
    loadAll();
  }, [negocio_id]);

  async function loadAll() {
    if (!negocio_id) return;
    setLoading(true);
    try {
      const [cats, unids, alms] = await Promise.all([
        supabase.from('categorias_insumo').select('*').eq('negocio_id', negocio_id).order('nombre'),
        supabase.from('unidades_medida').select('*').eq('negocio_id', negocio_id).order('nombre'),
        supabase.from('almacenes').select('*').eq('negocio_id', negocio_id).order('nombre'),
      ]);
      setCategorias(cats.data || []);
      setUnidades(unids.data || []);
      setAlmacenes(alms.data || []);
    } catch (e: any) {
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  }

  const addCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoria.trim() || !negocio_id) return;
    try {
      const { error } = await supabase.from('categorias_insumo').insert({ negocio_id, nombre: newCategoria });
      if (error) throw error;
      toast.success('Categoría agregada');
      setNewCategoria('');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const addUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnidadNombre.trim() || !newUnidadAbrv.trim() || !negocio_id) return;
    try {
      const { error } = await supabase.from('unidades_medida').insert({ negocio_id, nombre: newUnidadNombre, abreviatura: newUnidadAbrv });
      if (error) throw error;
      toast.success('Unidad agregada');
      setNewUnidadNombre(''); setNewUnidadAbrv('');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteItem = async (table: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Eliminado correctamente');
      loadAll();
    } catch (e: any) {
      toast.error('No se puede eliminar, es probable que esté en uso.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración de Inventario</h1>
        <p className="text-slate-500 text-sm mt-1">Administra tus categorías, unidades de medida y almacenes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categorías */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-slate-800">Categorías de Insumo</h2>
          </div>
          <div className="p-4 flex-1">
            <form onSubmit={addCategoria} className="flex gap-2 mb-4">
              <input 
                type="text" placeholder="Nueva categoría..." required
                value={newCategoria} onChange={e => setNewCategoria(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </form>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {categorias.map(c => (
                <li key={c.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-100">
                  <span className="text-sm font-medium text-slate-700">{c.nombre}</span>
                  <button onClick={() => deleteItem('categorias_insumo', c.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {categorias.length === 0 && <li className="text-sm text-slate-500 text-center py-4">No hay categorías</li>}
            </ul>
          </div>
        </div>

        {/* Unidades de Medida */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-slate-800">Unidades de Medida</h2>
          </div>
          <div className="p-4 flex-1">
            <form onSubmit={addUnidad} className="flex gap-2 mb-4">
              <input 
                type="text" placeholder="Nombre (ej. Kilogramo)" required
                value={newUnidadNombre} onChange={e => setNewUnidadNombre(e.target.value)}
                className="flex-[2] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" placeholder="Abrv. (kg)" required
                value={newUnidadAbrv} onChange={e => setNewUnidadAbrv(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {unidades.map(u => (
                <li key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-800">{u.abreviatura}</span>
                    <span className="text-sm text-slate-500 ml-2">- {u.nombre}</span>
                  </div>
                  <button onClick={() => deleteItem('unidades_medida', u.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {unidades.length === 0 && <li className="text-sm text-slate-500 text-center py-4">No hay unidades</li>}
            </ul>
          </div>
        </div>

        {/* Almacenes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:col-span-2 lg:col-span-1">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-slate-800">Almacenes (Sucursales)</h2>
          </div>
          <div className="p-4 flex-1">
            <ul className="space-y-2">
              {almacenes.map(a => (
                <li key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">{a.nombre}</span>
                    {a.ubicacion && <span className="text-xs text-slate-500">{a.ubicacion}</span>}
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded-full">Activo</span>
                </li>
              ))}
              {almacenes.length === 0 && <li className="text-sm text-slate-500 text-center py-4">Configuración en base de datos.</li>}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
