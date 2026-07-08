'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Negocio } from '@/lib/database.types';
import {
  Plus,
  Edit2,
  Power,
  PowerOff,
  Building2,
  X,
  Save,
  Copy,
  Trash2,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Globe,
  Palette,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Badge, StatusDot } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { formatRelativeTime, generateSlug, ANIMATIONS } from '@/lib/admin-constants';

type SortField = 'nombre' | 'estado' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface FormData {
  nombre: string;
  slug: string;
  color_primario: string;
  color_secundario: string;
  logo_url: string;
}

const EMPTY_FORM: FormData = {
  nombre: '',
  slug: '',
  color_primario: '#3b82f6',
  color_secundario: '#1e40af',
  logo_url: '',
};

export default function NegociosPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'suspendido'>('todos');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNegocio, setEditingNegocio] = useState<Partial<Negocio> | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchNegocios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setNegocios(data || []);
    } catch (error: any) {
      toast.error('Error al cargar negocios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNegocios();
  }, [sortField, sortOrder]);

  const filteredNegocios = useMemo(() => {
    return negocios.filter((n) => {
      const matchesSearch =
        !search ||
        n.nombre.toLowerCase().includes(search.toLowerCase()) ||
        n.slug.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'todos' || n.estado === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [negocios, search, statusFilter]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'activo' ? 'suspendido' : 'activo';
    const { error } = await supabase
      .from('negocios')
      .update({ estado: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar estado: ' + error.message);
    } else {
      toast.success(`Negocio ${newStatus === 'activo' ? 'activado' : 'suspendido'}`);
      setNegocios((prev) =>
        prev.map((n) => (n.id === id ? { ...n, estado: newStatus } : n))
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('negocios')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      toast.success('Negocio eliminado permanentemente');
      setNegocios((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNegocio(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (negocio: Negocio) => {
    setEditingNegocio(negocio);
    setFormData({
      nombre: negocio.nombre,
      slug: negocio.slug,
      color_primario: negocio.color_primario,
      color_secundario: negocio.color_secundario,
      logo_url: negocio.logo_url || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.slug.trim()) {
      toast.error('Nombre y Slug son obligatorios');
      return;
    }

    setFormLoading(true);
    try {
      const cleanSlug = generateSlug(formData.slug);

      if (editingNegocio?.id) {
        const { error } = await supabase
          .from('negocios')
          .update({
            nombre: formData.nombre.trim(),
            slug: cleanSlug,
            color_primario: formData.color_primario,
            color_secundario: formData.color_secundario,
            logo_url: formData.logo_url || null,
          })
          .eq('id', editingNegocio.id);

        if (error) throw error;
        toast.success('Cambios guardados correctamente');
      } else {
        const slugExists = negocios.some((n) => n.slug === cleanSlug);
        if (slugExists) {
          toast.error('Ese slug ya está en uso. Elige otro.');
          setFormLoading(false);
          return;
        }

        const { error } = await supabase.from('negocios').insert({
          nombre: formData.nombre.trim(),
          slug: cleanSlug,
          color_primario: formData.color_primario,
          color_secundario: formData.color_secundario,
          logo_url: formData.logo_url || null,
          estado: 'activo',
        });

        if (error) throw error;
        toast.success('Negocio creado correctamente');
      }

      setIsModalOpen(false);
      fetchNegocios();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SlidersHorizontal size={12} className="opacity-30" />;
    return (
      <span className="text-blue-600 dark:text-blue-400">
        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header */}
      <motion.div
        {...ANIMATIONS.fadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestión de Negocios
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {filteredNegocios.length} de {negocios.length} negocios
            {statusFilter !== 'todos' && ` · filtrados: ${statusFilter}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNegocios}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title="Recargar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5"
          >
            <Plus size={18} />
            Nuevo Negocio
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        {...ANIMATIONS.stagger(1)}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'activo', 'suspendido'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                statusFilter === f
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Suspendidos'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        {...ANIMATIONS.stagger(2)}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th
                  className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  onClick={() => toggleSort('nombre')}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Negocio <SortIcon field="nombre" />
                  </span>
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Slug / URL
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                  Colores
                </th>
                <th
                  className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  onClick={() => toggleSort('estado')}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Estado <SortIcon field="estado" />
                  </span>
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <TableSkeleton rows={5} cols={5} />
                  </td>
                </tr>
              ) : filteredNegocios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    {search || statusFilter !== 'todos' ? (
                      <div className="text-center py-10">
                        <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          Sin resultados para los filtros actuales
                        </p>
                        <button
                          onClick={() => { setSearch(''); setStatusFilter('todos'); }}
                          className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    ) : (
                      <EmptyState
                        title="No hay negocios aún"
                        description="Crea el primer negocio para empezar a usar la plataforma."
                        action={{ label: 'Crear Negocio', onClick: handleOpenCreate }}
                        size="md"
                        className="border-none"
                      />
                    )}
                  </td>
                </tr>
              ) : (
                filteredNegocios.map((negocio, i) => (
                  <motion.tr
                    key={negocio.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 overflow-hidden flex-shrink-0">
                          {negocio.logo_url ? (
                            <img
                              src={negocio.logo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 size={18} className="text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {negocio.nombre}
                          </p>
                          <button
                            onClick={() => copyToClipboard(negocio.id)}
                            className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 font-mono transition-colors"
                          >
                            ID: {negocio.id.substring(0, 8)}...{' '}
                            <Copy size={9} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          /{negocio.slug}
                        </span>
                        <a
                          href={`/${negocio.slug}/dashboard`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={9} />
                          Visitar sitio
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600"
                          style={{ backgroundColor: negocio.color_primario }}
                          title="Color primario"
                        />
                        <div
                          className="w-7 h-7 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600"
                          style={{ backgroundColor: negocio.color_secundario }}
                          title="Color secundario"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {negocio.estado === 'activo' ? (
                        <Badge variant="success">
                          <CheckCircle2 size={10} className="mr-1" />
                          ACTIVO
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <AlertCircle size={10} className="mr-1" />
                          SUSPENDIDO
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(negocio)}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Editar negocio"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(negocio.id, negocio.estado)}
                          className={cn(
                            'p-2 rounded-lg transition-all',
                            negocio.estado === 'activo'
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          )}
                          title={negocio.estado === 'activo' ? 'Suspender' : 'Activar'}
                        >
                          {negocio.estado === 'activo' ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: negocio.id, nombre: negocio.nombre })}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNegocio?.id ? 'Editar Negocio' : 'Nuevo Negocio'}
        description={
          editingNegocio?.id
            ? 'Modifica la información del negocio'
            : 'Completa los datos para registrar un nuevo negocio en la plataforma'
        }
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Nombre del Negocio
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => {
                const nombre = e.target.value;
                setFormData({
                  ...formData,
                  nombre,
                  slug: editingNegocio?.id ? formData.slug : generateSlug(nombre),
                });
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder='Ej: "La Pollería de Juan"'
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
              <span className="inline-flex items-center gap-1.5">
                <Globe size={12} />
                Slug (URL)
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-semibold text-sm">
                /
              </span>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: generateSlug(e.target.value) })
                }
                className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="la-polleria-de-juan"
              />
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
              URL: {typeof window !== 'undefined' ? window.location.origin : ''}/{formData.slug || '...'}/dashboard
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
              <span className="inline-flex items-center gap-1.5">
                <Palette size={12} />
                Identidad Visual
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Color Primario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color_primario}
                    onChange={(e) =>
                      setFormData({ ...formData, color_primario: e.target.value })
                    }
                    className="w-11 h-11 rounded-xl cursor-pointer border-0 p-0 overflow-hidden shadow-sm"
                  />
                  <input
                    type="text"
                    value={formData.color_primario}
                    onChange={(e) =>
                      setFormData({ ...formData, color_primario: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div
                  className="mt-2 h-8 rounded-lg transition-all"
                  style={{ backgroundColor: formData.color_primario }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Color Secundario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color_secundario}
                    onChange={(e) =>
                      setFormData({ ...formData, color_secundario: e.target.value })
                    }
                    className="w-11 h-11 rounded-xl cursor-pointer border-0 p-0 overflow-hidden shadow-sm"
                  />
                  <input
                    type="text"
                    value={formData.color_secundario}
                    onChange={(e) =>
                      setFormData({ ...formData, color_secundario: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div
                  className="mt-2 h-8 rounded-lg transition-all"
                  style={{ backgroundColor: formData.color_secundario }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
              URL del Logo (opcional)
            </label>
            <input
              type="text"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="https://ejemplo.com/logo.png"
            />
            {formData.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden">
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Vista previa del logo
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-[2] px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg shadow-slate-900/10 dark:shadow-white/5 flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {editingNegocio?.id ? 'Guardar Cambios' : 'Crear Negocio'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar negocio"
        description={`¿Estás seguro de eliminar "${deleteTarget?.nombre}"? Esta acción eliminará permanentemente todos los datos asociados (productos, ventas, usuarios) y no se puede deshacer.`}
        confirmLabel="Eliminar permanentemente"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
