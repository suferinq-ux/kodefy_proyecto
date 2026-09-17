'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, ChefHat, TrendingUp, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBusiness } from '@/contexts/BusinessContext';

export default function RecetasPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { business } = useBusiness();
  const negocio_id = business?.id;

  const [recetas, setRecetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [productos, setProductos] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    producto_id: '',
    porcion_rendimiento: 1,
    costo_total: 0
  });

  useEffect(() => {
    loadRecetas();
    loadProductos();
  }, [negocio_id]);

  async function loadProductos() {
    if (!negocio_id) return;
    const { data } = await supabase.from('productos').select('id, nombre').eq('negocio_id', negocio_id).eq('activo', true);
    setProductos(data || []);
  }

  async function loadRecetas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recetas')
        .select(`
          *,
          productos(nombre, precio)
        `)
        .order('nombre');

      if (error) throw error;
      setRecetas(data || []);
    } catch (error: any) {
      toast.error('Error al cargar recetas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocio_id) return;
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('recetas')
        .insert({
          negocio_id,
          nombre: formData.nombre,
          producto_id: formData.producto_id || null,
          porcion_rendimiento: Number(formData.porcion_rendimiento),
          costo_total: Number(formData.costo_total),
          estado: 'activa'
        });

      if (error) throw error;
      
      toast.success('Receta creada correctamente. Ahora puedes agregarle insumos.');
      setIsModalOpen(false);
      setFormData({ nombre: '', producto_id: '', porcion_rendimiento: 1, costo_total: 0 });
      loadRecetas();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recetas (Fichas Técnicas)</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona las proporciones y costos de tus platos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Receta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500">Cargando recetas...</div>
        ) : recetas.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            No hay recetas configuradas. Empieza creando una.
          </div>
        ) : (
          recetas.map((receta) => {
            const precioVenta = receta.productos?.precio || 0;
            const margen = precioVenta > 0 ? ((precioVenta - receta.costo_total) / precioVenta) * 100 : 0;

            return (
              <div key={receta.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                      <ChefHat className="w-6 h-6" />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                      receta.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {receta.estado}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{receta.nombre}</h3>
                  <p className="text-sm text-slate-500 mt-1">Vinculado a: {receta.productos?.nombre || 'Sub-receta'}</p>
                </div>
                
                <div className="p-5 bg-slate-50/50">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Costo Total</span>
                    <span className="text-lg font-bold text-slate-900">S/ {Number(receta.costo_total).toFixed(2)}</span>
                  </div>
                  
                  {precioVenta > 0 && (
                    <>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Precio Venta</span>
                        <span className="text-sm font-medium text-slate-600">S/ {Number(precioVenta).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Margen</span>
                        <span className={`text-sm font-bold flex items-center gap-1 ${
                          margen >= 50 ? 'text-green-500' : margen >= 30 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {margen.toFixed(1)}%
                          <TrendingUp className="w-3 h-3" />
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1">
                      Ver ingredientes
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nueva Receta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Nueva Receta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <form id="receta-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de la Receta *</label>
                  <input 
                    type="text" required
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Receta Pollo a la Brasa" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vincular a Producto de Carta</label>
                  <select 
                    value={formData.producto_id}
                    onChange={e => setFormData({...formData, producto_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Ninguno (Sub-receta) --</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Si lo vinculas, se descontará stock automáticamente al venderse.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Porciones rinde</label>
                    <input 
                      type="number" step="0.1" required min="0.1"
                      value={formData.porcion_rendimiento}
                      onChange={e => setFormData({...formData, porcion_rendimiento: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Base (S/)</label>
                    <input 
                      type="number" step="0.01" min="0" required
                      value={formData.costo_total}
                      onChange={e => setFormData({...formData, costo_total: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button 
                form="receta-form"
                disabled={saving}
                type="submit"
                className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Crear Receta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
