'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, Edit, Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBusiness } from '@/contexts/BusinessContext';

export default function InsumosPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const { business } = useBusiness();
  const negocio_id = business?.id;

  const [insumos, setInsumos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Modal Eliminar State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
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

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      sku: '',
      stock_actual: 0,
      stock_minimo: 0,
      costo_promedio: 0,
      unidad_base_id: unidades.length > 0 ? unidades[0].id : '',
      categoria_id: categorias.length > 0 ? categorias[0].id : ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (insumo: any) => {
    setEditingId(insumo.id);
    setFormData({
      nombre: insumo.nombre || '',
      sku: insumo.sku || '',
      stock_actual: Number(insumo.stock_actual) || 0,
      stock_minimo: Number(insumo.stock_minimo) || 0,
      costo_promedio: Number(insumo.costo_promedio) || 0,
      unidad_base_id: insumo.unidad_base_id || '',
      categoria_id: insumo.categoria_id || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      // Intentamos hacer un borrado lógico o físico dependiendo de la BD
      // Por seguridad y referencias, la mejor práctica en un SAAS es estado='inactivo'
      // pero si el diseño pide borrar (o soft delete)
      const { error } = await supabase
        .from('insumos')
        .delete()
        .eq('id', deletingId);
        
      if (error) {
        // Si hay error de llave foránea, usamos soft delete
        if (error.code === '23503') {
           await supabase.from('insumos').update({ estado: 'inactivo' }).eq('id', deletingId);
           toast.success('Insumo desactivado porque tiene historial asociado');
        } else {
           throw error;
        }
      } else {
        toast.success('Insumo eliminado correctamente');
      }
      
      setIsDeleteModalOpen(false);
      loadInsumos();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocio_id) return;
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        negocio_id,
        nombre: formData.nombre,
        sku: formData.sku || null,
        stock_actual: Number(formData.stock_actual),
        stock_minimo: Number(formData.stock_minimo),
        costo_promedio: Number(formData.costo_promedio),
        unidad_base_id: formData.unidad_base_id || null,
        categoria_id: formData.categoria_id || null
      };

      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('insumos')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Insumo actualizado correctamente');
      } else {
        // Insertar
        const { error } = await supabase
          .from('insumos')
          .insert({ ...payload, costo_ultimo: payload.costo_promedio });

        if (error) throw error;
        toast.success('Insumo creado correctamente');
      }
      
      setIsModalOpen(false);
      loadInsumos();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredInsumos = insumos.filter(i => {
    const matchBusqueda = i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategoria = selectedCategory === 'all' || i.categoria_id === selectedCategory;
    return matchBusqueda && matchCategoria;
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Insumos</h1>
        <button 
          onClick={handleOpenModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Insumo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-bold transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filtros {selectedCategory !== 'all' && <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>}
          </button>
        </div>

        {/* Panel de Filtros Expandible */}
        {showFilters && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-xs">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Filtrar por Categoría</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        )}

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
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">Cargando insumos...</p>
                  </td>
                </tr>
              ) : filteredInsumos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No se encontraron insumos {searchTerm && 'para tu búsqueda'}.
                  </td>
                </tr>
              ) : (
                filteredInsumos.map((insumo) => (
                  <tr key={insumo.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{insumo.sku || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{insumo.nombre}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {insumo.categorias_insumo?.nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-black ${insumo.stock_actual <= insumo.stock_minimo ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-emerald-600'}`}>
                          {insumo.stock_actual}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">{insumo.unidades_medida?.abreviatura}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">S/ {Number(insumo.costo_promedio).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-black ${
                        insumo.estado === 'activo' || !insumo.estado ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {insumo.estado || 'activo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(insumo)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(insumo.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
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

      {/* Modal Nuevo/Editar Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {editingId ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 p-2 rounded-lg transition-all shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="insumo-form" onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Insumo <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm font-bold transition-all" 
                      placeholder="Ej: Pollo entero" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SKU / Código</label>
                    <input 
                      type="text"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm font-bold transition-all" 
                      placeholder="INS-001" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Costo Prom. (S/)</label>
                    <input 
                      type="number" step="0.01" min="0" required
                      value={formData.costo_promedio}
                      onChange={e => setFormData({...formData, costo_promedio: Number(e.target.value)})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm font-bold transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
                    <select 
                      value={formData.categoria_id}
                      onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold transition-all"
                    >
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      {categorias.length === 0 && <option value="">Sin categorías</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unidad Base</label>
                    <select 
                      value={formData.unidad_base_id}
                      onChange={e => setFormData({...formData, unidad_base_id: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-bold transition-all"
                    >
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
                      {unidades.length === 0 && <option value="">Sin unidades</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stock Actual</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.stock_actual}
                      onChange={e => setFormData({...formData, stock_actual: Number(e.target.value)})}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm font-bold transition-all" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-red-500">Stock Mínimo</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.stock_minimo}
                      onChange={e => setFormData({...formData, stock_minimo: Number(e.target.value)})}
                      className="w-full px-3.5 py-2.5 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50 focus:bg-white text-sm font-bold transition-all" 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg uppercase tracking-widest transition-all shadow-sm"
                type="button"
              >
                Cancelar
              </button>
              <button 
                form="insumo-form"
                disabled={saving}
                type="submit"
                className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg uppercase tracking-widest transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Guardando...' : (editingId ? 'Actualizar Insumo' : 'Guardar Insumo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">¿Eliminar insumo?</h2>
            <p className="text-sm font-medium text-slate-500 mb-6">
              Esta acción no se puede deshacer. Si el insumo tiene movimientos registrados, solo se desactivará por seguridad.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg uppercase tracking-widest transition-all"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-lg uppercase tracking-widest transition-all flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
