'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBusiness } from '@/contexts/BusinessContext';

export default function InsumosPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { business } = useBusiness();
  const negocio_id = business?.id;

  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    sku: '',
    stock_actual: 0,
    stock_minimo: 0,
    costo_promedio: 0,
    unidad_base_id: '',
    categoria_id: ''
  });

  // Select Options State
  const [unidades, setUnidades] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  useEffect(() => {
    loadInsumos();
    loadFormOptions();
  }, [negocio_id]);

  async function loadFormOptions() {
    if (!negocio_id) return;
    const { data: udData } = await supabase.from('unidades_medida').select('*').eq('negocio_id', negocio_id);
    const { data: catData } = await supabase.from('categorias_insumo').select('*').eq('negocio_id', negocio_id);
    
    setUnidades(udData || []);
    setCategorias(catData || []);
    
    // Set defaults if available
    if (udData && udData.length > 0) setFormData(prev => ({ ...prev, unidad_base_id: udData[0].id }));
    if (catData && catData.length > 0) setFormData(prev => ({ ...prev, categoria_id: catData[0].id }));
  }

  async function loadInsumos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select(`
          *,
          categorias_insumo(nombre),
          unidades_medida(abreviatura)
        `)
        .order('nombre');

      if (error) throw error;
      setInsumos(data || []);
    } catch (error: any) {
      toast.error('Error al cargar insumos: ' + error.message);
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
      const { data, error } = await supabase
        .from('insumos')
        .insert({
          negocio_id,
          nombre: formData.nombre,
          sku: formData.sku || null,
          stock_actual: Number(formData.stock_actual),
          stock_minimo: Number(formData.stock_minimo),
          costo_promedio: Number(formData.costo_promedio),
          costo_ultimo: Number(formData.costo_promedio),
          unidad_base_id: formData.unidad_base_id || null,
          categoria_id: formData.categoria_id || null
        })
        .select();

      if (error) throw error;
      
      toast.success('Insumo creado correctamente');
      setIsModalOpen(false);
      setFormData({ ...formData, nombre: '', sku: '', stock_actual: 0, stock_minimo: 0, costo_promedio: 0 });
      loadInsumos();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredInsumos = insumos.filter(i => 
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Insumos</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Insumo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-right">Stock Actual</th>
                <th className="px-6 py-4 text-right">Costo Prom.</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Cargando insumos...</td>
                </tr>
              ) : filteredInsumos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No se encontraron insumos.</td>
                </tr>
              ) : (
                filteredInsumos.map((insumo) => (
                  <tr key={insumo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{insumo.sku || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{insumo.nombre}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 px-2 py-1 rounded text-xs">
                        {insumo.categorias_insumo?.nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold ${insumo.stock_actual <= insumo.stock_minimo ? 'text-red-500' : 'text-emerald-500'}`}>
                          {insumo.stock_actual}
                        </span>
                        <span className="text-slate-400 text-xs">{insumo.unidades_medida?.abreviatura}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">S/ {Number(insumo.costo_promedio).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                        insumo.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {insumo.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Nuevo Insumo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <form id="insumo-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Insumo *</label>
                    <input 
                      type="text" required
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Ej: Pollo entero" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">SKU / Código</label>
                    <input 
                      type="text"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="INS-001" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Promedio (S/)</label>
                    <input 
                      type="number" step="0.01" min="0" required
                      value={formData.costo_promedio}
                      onChange={e => setFormData({...formData, costo_promedio: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                    <select 
                      value={formData.categoria_id}
                      onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      {categorias.length === 0 && <option value="">Sin categorías</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Unidad Base</label>
                    <select 
                      value={formData.unidad_base_id}
                      onChange={e => setFormData({...formData, unidad_base_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                      {unidades.length === 0 && <option value="">Sin unidades</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Actual</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.stock_actual}
                      onChange={e => setFormData({...formData, stock_actual: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Mínimo (Alerta)</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.stock_minimo}
                      onChange={e => setFormData({...formData, stock_minimo: Number(e.target.value)})}
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
                form="insumo-form"
                disabled={saving}
                type="submit"
                className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Insumo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
