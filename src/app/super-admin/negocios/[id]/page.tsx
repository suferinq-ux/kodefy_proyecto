'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Negocio, Producto, Venta } from '@/lib/database.types';
import { ROLE_NAMES, type UserRole } from '@/lib/roles';
import {
  ArrowLeft, Building2, Package, Users, ShoppingBag,
  Save, Plus, Edit2, Trash2, Power, PowerOff, Search,
  RefreshCw, Globe, Palette, Upload, ImageIcon, XCircle, Loader2,
  Copy, Eye, EyeOff, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { generateSlug, ANIMATIONS } from '@/lib/admin-constants';
import Link from 'next/link';


// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'productos' | 'usuarios' | 'pedidos';

interface UserProfile {
  id: string;
  negocio_id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, string> = {
  pollo: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  bebida: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  complemento: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  promocion: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
};

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  cajero: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  mozo: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  cocinero: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  repartidor: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  invitado: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

const METODO_PAGO_LABELS: Record<string, string> = {
  efectivo: '💵 Efectivo',
  yape: '📱 Yape',
  plin: '📲 Plin',
  tarjeta: '💳 Tarjeta',
  mixto: '🔀 Mixto',
};

const ESTADO_PEDIDO_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  listo: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  entregado: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
};

function InputField({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
      />
    </div>
  );
}

// ─── Logo Uploader ─────────────────────────────────────────────────────────────
function LogoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máx 5 MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `negocios/logo_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(`${supabaseUrl}/storage/v1/object/public/logos/${filePath}`);
      toast.success('Logo subido ✅');
    } catch (err: any) {
      toast.error('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [onChange, supabaseUrl]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
        Logo (opcional)
      </label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-blue-400 cursor-pointer overflow-hidden bg-slate-50 dark:bg-slate-700/50 transition-all"
      >
        {value ? (
          <div className="relative">
            <img src={value} alt="Logo" className="w-full h-28 object-contain p-2" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Upload size={18} className="text-white" />
              <span className="text-white text-xs font-bold">Cambiar</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            {uploading ? <Loader2 size={24} className="text-blue-500 animate-spin" /> : <ImageIcon size={24} className="text-slate-400" />}
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{uploading ? 'Subiendo...' : 'Haz clic o arrastra'}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </div>
      {value && !uploading && (
        <button type="button" onClick={() => onChange('')} className="text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
          <XCircle size={12} /> Quitar logo
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NegocioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const negocioId = params.id as string;

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // ── General tab state
  const [generalForm, setGeneralForm] = useState({
    nombre: '', slug: '', codigo_acceso: '', color_primario: '#3b82f6', color_secundario: '#1e40af', logo_url: '',
  });
  const [generalLoading, setGeneralLoading] = useState(false);

  // ── Productos tab state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productTipoFilter, setProductTipoFilter] = useState<string>('todos');
  const [productModal, setProductModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Partial<Producto> | null>(null);
  const [productoForm, setProductoForm] = useState({ nombre: '', tipo: 'pollo' as Producto['tipo'], precio: '', fraccion_pollo: '0', activo: true, descripcion: '' });
  const [productoLoading, setProductoLoading] = useState(false);
  const [deleteProducto, setDeleteProducto] = useState<{ id: string; nombre: string } | null>(null);

  // ── Usuarios tab state
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', password: '', rol: 'cajero' as UserRole, activo: true });
  const [userLoading, setUserLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUser, setDeleteUser] = useState<{ id: string; nombre: string } | null>(null);

  // ── Pedidos tab state
  const [pedidos, setPedidos] = useState<Venta[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [pedidoEstadoFilter, setPedidoEstadoFilter] = useState<string>('todos');
  const [editingPedido, setEditingPedido] = useState<Venta | null>(null);
  const [pedidoModal, setPedidoModal] = useState(false);
  const [pedidoSaving, setPedidoSaving] = useState(false);
  const [deletePedido, setDeletePedido] = useState<{ id: string } | null>(null);

  // ─── Fetch Negocio ──────────────────────────────────────────────────────────
  const fetchNegocio = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('negocios').select('*').eq('id', negocioId).single();
    if (error || !data) { toast.error('Negocio no encontrado'); router.push('/super-admin/negocios'); return; }
    setNegocio(data);
    setGeneralForm({
      nombre: data.nombre, slug: data.slug,
      codigo_acceso: data.codigo_acceso || '',
      color_primario: data.color_primario, color_secundario: data.color_secundario,
      logo_url: data.logo_url || '',
    });
    setLoading(false);
  }, [negocioId, router]);

  // ─── Helper: obtiene el token de sesión para Authorization header ────────────
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  useEffect(() => { fetchNegocio(); }, [fetchNegocio]);

  // ─── Fetch Productos ────────────────────────────────────────────────────────
  const fetchProductos = useCallback(async () => {
    setProductosLoading(true);
    const { data, error } = await supabase.from('productos').select('*').eq('negocio_id', negocioId).order('nombre');
    if (error) toast.error('Error al cargar productos');
    setProductos(data || []);
    setProductosLoading(false);
  }, [negocioId]);

  // ─── Fetch Usuarios ─────────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    setUsuariosLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/super-admin/negocios/${negocioId}/users`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsuarios(data);
    } catch (err: any) {
      toast.error('Error al cargar usuarios: ' + err.message);
    } finally {
      setUsuariosLoading(false);
    }
  }, [negocioId, getAuthHeaders]);

  // ─── Fetch Pedidos ──────────────────────────────────────────────────────────
  const fetchPedidos = useCallback(async () => {
    setPedidosLoading(true);
    const { data, error } = await supabase.from('ventas').select('*').eq('negocio_id', negocioId).order('created_at', { ascending: false }).limit(200);
    if (error) toast.error('Error al cargar pedidos');
    setPedidos((data as Venta[]) || []);
    setPedidosLoading(false);
  }, [negocioId]);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'productos') fetchProductos();
    if (activeTab === 'usuarios') fetchUsuarios();
    if (activeTab === 'pedidos') fetchPedidos();
  }, [activeTab, fetchProductos, fetchUsuarios, fetchPedidos]);

  // ─── General Save ───────────────────────────────────────────────────────────
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalForm.nombre.trim() || !generalForm.slug.trim()) { toast.error('Nombre y Slug son obligatorios'); return; }
    setGeneralLoading(true);
    const { error } = await supabase.from('negocios').update({
      nombre: generalForm.nombre.trim(),
      slug: generateSlug(generalForm.slug),
      codigo_acceso: generalForm.codigo_acceso.trim() || null,
      color_primario: generalForm.color_primario,
      color_secundario: generalForm.color_secundario,
      logo_url: generalForm.logo_url || null,
    }).eq('id', negocioId);
    if (error) toast.error('Error al guardar: ' + error.message);
    else { toast.success('Negocio actualizado ✅'); fetchNegocio(); }
    setGeneralLoading(false);
  };

  // ─── Productos CRUD ─────────────────────────────────────────────────────────
  const openCreateProducto = () => {
    setEditingProducto(null);
    setProductoForm({ nombre: '', tipo: 'pollo', precio: '', fraccion_pollo: '0', activo: true, descripcion: '' });
    setProductModal(true);
  };

  const openEditProducto = (p: Producto) => {
    setEditingProducto(p);
    setProductoForm({ nombre: p.nombre, tipo: p.tipo, precio: String(p.precio), fraccion_pollo: String(p.fraccion_pollo), activo: p.activo, descripcion: p.descripcion || '' });
    setProductModal(true);
  };

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoForm.nombre.trim() || !productoForm.precio) { toast.error('Nombre y precio son obligatorios'); return; }
    setProductoLoading(true);
    const payload = {
      nombre: productoForm.nombre.trim(),
      tipo: productoForm.tipo,
      precio: parseFloat(productoForm.precio),
      fraccion_pollo: parseFloat(productoForm.fraccion_pollo) || 0,
      activo: productoForm.activo,
      descripcion: productoForm.descripcion.trim() || null,
      negocio_id: negocioId,
    };
    const { error } = editingProducto?.id
      ? await supabase.from('productos').update(payload).eq('id', editingProducto.id)
      : await supabase.from('productos').insert(payload);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success(editingProducto?.id ? 'Producto actualizado ✅' : 'Producto creado ✅'); setProductModal(false); fetchProductos(); }
    setProductoLoading(false);
  };

  const handleToggleProducto = async (p: Producto) => {
    const { error } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success(p.activo ? 'Producto desactivado' : 'Producto activado'); fetchProductos(); }
  };

  const handleDeleteProducto = async () => {
    if (!deleteProducto) return;
    const { error } = await supabase.from('productos').delete().eq('id', deleteProducto.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('Producto eliminado'); setDeleteProducto(null); fetchProductos(); }
  };

  // ─── Usuarios CRUD ──────────────────────────────────────────────────────────
  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ nombre: '', email: '', password: '', rol: 'cajero', activo: true });
    setShowPassword(false);
    setUserModal(true);
  };

  const openEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setUserForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo });
    setShowPassword(false);
    setUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (editingUser) {
        const res = await fetch(`/api/super-admin/negocios/${negocioId}/users`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ id: editingUser.id, nombre: userForm.nombre, email: userForm.email, password: userForm.password || undefined, rol: userForm.rol, activo: userForm.activo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success('Usuario actualizado ✅');
      } else {
        if (!userForm.password) { toast.error('La contraseña es obligatoria'); setUserLoading(false); return; }
        const res = await fetch(`/api/super-admin/negocios/${negocioId}/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nombre: userForm.nombre, email: userForm.email, password: userForm.password, rol: userForm.rol }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success('Usuario creado ✅');
      }
      setUserModal(false);
      fetchUsuarios();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setUserLoading(false);
    }
  };

  const handleToggleUser = async (u: UserProfile) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/super-admin/negocios/${negocioId}/users`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id: u.id, activo: !u.activo }),
    });
    if (res.ok) { toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado'); fetchUsuarios(); }
    else toast.error('Error al actualizar');
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/super-admin/negocios/${negocioId}/users?userId=${deleteUser.id}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) { toast.success('Usuario eliminado'); setDeleteUser(null); fetchUsuarios(); }
    else toast.error('Error al eliminar');
  };

  // ─── Pedidos CRUD ────────────────────────────────────────────────────────────
  const openEditPedido = (p: Venta) => { setEditingPedido(p); setPedidoModal(true); };

  const handleSavePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPedido) return;
    setPedidoSaving(true);
    const { error } = await supabase.from('ventas').update({
      estado_pedido: editingPedido.estado_pedido,
      estado_pago: editingPedido.estado_pago,
      metodo_pago: editingPedido.metodo_pago,
      notas: editingPedido.notas,
      total: editingPedido.total,
    }).eq('id', editingPedido.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('Pedido actualizado ✅'); setPedidoModal(false); fetchPedidos(); }
    setPedidoSaving(false);
  };

  const handleDeletePedido = async () => {
    if (!deletePedido) return;
    const { error } = await supabase.from('ventas').delete().eq('id', deletePedido.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('Pedido eliminado'); setDeletePedido(null); fetchPedidos(); }
  };

  // ─── Filtered data ──────────────────────────────────────────────────────────
  const filteredProductos = productos.filter(p =>
    (productTipoFilter === 'todos' || p.tipo === productTipoFilter) &&
    (!productSearch || p.nombre.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredUsuarios = usuarios.filter(u =>
    !userSearch ||
    u.nombre.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPedidos = pedidos.filter(p =>
    (pedidoEstadoFilter === 'todos' || p.estado_pedido === pedidoEstadoFilter) &&
    (!pedidoSearch || p.id.includes(pedidoSearch) || (p.notas || '').toLowerCase().includes(pedidoSearch.toLowerCase()) || (p.usuario_nombre || '').toLowerCase().includes(pedidoSearch.toLowerCase()))
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!negocio) return null;

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'productos', label: 'Productos', icon: Package, count: activeTab === 'productos' ? productos.length : undefined },
    { id: 'usuarios', label: 'Usuarios', icon: Users, count: activeTab === 'usuarios' ? usuarios.length : undefined },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, count: activeTab === 'pedidos' ? pedidos.length : undefined },
  ];

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header */}
      <motion.div {...ANIMATIONS.fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/negocios" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center flex-shrink-0">
            {negocio.logo_url ? <img src={negocio.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 size={18} className="text-slate-400" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{negocio.nombre}</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">/{negocio.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: negocio.color_primario + '20', color: negocio.color_primario }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: negocio.color_primario }} />
            {negocio.estado === 'activo' ? 'ACTIVO' : 'SUSPENDIDO'}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div {...ANIMATIONS.stagger(1)} className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-px',
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {/* ═══════════════ TAB: GENERAL ═══════════════ */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-base font-black text-slate-900 dark:text-white mb-5">Información del Negocio</h2>
                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <InputField label="Nombre del Negocio" required value={generalForm.nombre}
                    onChange={(e) => setGeneralForm({ ...generalForm, nombre: e.target.value, slug: generateSlug(e.target.value) })}
                    placeholder="Ej: La Pollería de Juan" />

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      <span className="inline-flex items-center gap-1.5"><Globe size={12} /> Slug (URL)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">/</span>
                      <input
                        value={generalForm.slug}
                        onChange={(e) => setGeneralForm({ ...generalForm, slug: generateSlug(e.target.value) })}
                        className="w-full pl-7 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        placeholder="la-polleria-de-juan" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">PIN de Acceso (6 dígitos)</label>
                      <button type="button" onClick={() => setGeneralForm({ ...generalForm, codigo_acceso: Math.floor(100000 + Math.random() * 900000).toString() })}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><RefreshCw size={10} /> Generar</button>
                    </div>
                    <input value={generalForm.codigo_acceso} maxLength={6}
                      onChange={(e) => setGeneralForm({ ...generalForm, codigo_acceso: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-bold text-slate-900 dark:text-white font-mono tracking-widest focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="123456" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
                      <span className="inline-flex items-center gap-1.5"><Palette size={12} /> Identidad Visual</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {(['color_primario', 'color_secundario'] as const).map((key) => (
                        <div key={key}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{key === 'color_primario' ? 'Color Primario' : 'Color Secundario'}</label>
                          <div className="flex gap-2">
                            <input type="color" value={generalForm[key]} onChange={(e) => setGeneralForm({ ...generalForm, [key]: e.target.value })} className="w-11 h-11 rounded-xl cursor-pointer border-0 p-0 overflow-hidden shadow-sm" />
                            <input type="text" value={generalForm[key]} onChange={(e) => setGeneralForm({ ...generalForm, [key]: e.target.value })} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-slate-900 dark:text-white" />
                          </div>
                          <div className="mt-2 h-6 rounded-lg" style={{ backgroundColor: generalForm[key] }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <LogoUploader value={generalForm.logo_url} onChange={(url) => setGeneralForm({ ...generalForm, logo_url: url })} />

                  <button type="submit" disabled={generalLoading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg">
                    {generalLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                    Guardar Cambios
                  </button>
                </form>
              </div>

              {/* Preview card */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-base font-black text-slate-900 dark:text-white mb-4">Vista Previa</h2>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="h-20 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${generalForm.color_primario}, ${generalForm.color_secundario})` }}>
                      {generalForm.logo_url
                        ? <img src={generalForm.logo_url} alt="" className="h-14 object-contain" />
                        : <Building2 size={36} className="text-white opacity-80" />}
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900">
                      <p className="font-black text-slate-900 dark:text-white">{generalForm.nombre || 'Nombre del negocio'}</p>
                      <p className="text-sm text-slate-400">/{generalForm.slug || 'slug'}</p>
                      {generalForm.codigo_acceso && (
                        <p className="text-xs font-mono font-bold mt-1 text-slate-500">PIN: {generalForm.codigo_acceso}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB: PRODUCTOS ═══════════════ */}
          {activeTab === 'productos' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['todos', 'pollo', 'bebida', 'complemento', 'promocion'] as const).map((f) => (
                    <button key={f} onClick={() => setProductTipoFilter(f)}
                      className={cn('px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize',
                        productTipoFilter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50')}>
                      {f === 'todos' ? 'Todos' : f}
                    </button>
                  ))}
                </div>
                <button onClick={openCreateProducto} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ml-auto">
                  <Plus size={16} /> Nuevo Producto
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        {['Producto', 'Tipo', 'Precio', 'Estado', 'Acciones'].map((h) => (
                          <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {productosLoading ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>
                      ) : filteredProductos.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center">
                          <Package size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm font-semibold text-slate-400">No hay productos</p>
                          <button onClick={openCreateProducto} className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400">+ Crear el primero</button>
                        </td></tr>
                      ) : filteredProductos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                          <td className="px-6 py-3.5">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{p.nombre}</p>
                            {p.descripcion && <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.descripcion}</p>}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize', TIPO_COLORS[p.tipo])}>{p.tipo}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">S/ {p.precio.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold', p.activo ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>
                              {p.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditProducto(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"><Edit2 size={15} /></button>
                              <button onClick={() => handleToggleProducto(p)} className={cn('p-2 rounded-lg transition-all', p.activo ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')}>
                                {p.activo ? <PowerOff size={15} /> : <Power size={15} />}
                              </button>
                              <button onClick={() => setDeleteProducto({ id: p.id, nombre: p.nombre })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB: USUARIOS ═══════════════ */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar por nombre o email..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <button onClick={fetchUsuarios} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Recargar">
                  <RefreshCw size={16} className={usuariosLoading ? 'animate-spin' : ''} />
                </button>
                <button onClick={openCreateUser} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ml-auto">
                  <Plus size={16} /> Nuevo Usuario
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                          <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {usuariosLoading ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>
                      ) : filteredUsuarios.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center">
                          <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm font-semibold text-slate-400">No hay usuarios</p>
                          <button onClick={openCreateUser} className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400">+ Crear el primero</button>
                        </td></tr>
                      ) : filteredUsuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{u.nombre}</p>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{u.email}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize', ROL_COLORS[u.rol])}>{ROLE_NAMES[u.rol] || u.rol}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold', u.activo ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>
                              {u.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditUser(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Editar"><Edit2 size={15} /></button>
                              <button onClick={() => handleToggleUser(u)} className={cn('p-2 rounded-lg transition-all', u.activo ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')} title={u.activo ? 'Desactivar' : 'Activar'}>
                                {u.activo ? <PowerOff size={15} /> : <Power size={15} />}
                              </button>
                              <button onClick={() => setDeleteUser({ id: u.id, nombre: u.nombre })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ TAB: PEDIDOS ═══════════════ */}
          {activeTab === 'pedidos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={pedidoSearch} onChange={(e) => setPedidoSearch(e.target.value)} placeholder="Buscar por ID, notas, mozo..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                </div>
                <div className="flex gap-2">
                  {(['todos', 'pendiente', 'listo', 'entregado'] as const).map((f) => (
                    <button key={f} onClick={() => setPedidoEstadoFilter(f)}
                      className={cn('px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize',
                        pedidoEstadoFilter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50')}>
                      {f === 'todos' ? 'Todos' : f}
                    </button>
                  ))}
                </div>
                <button onClick={fetchPedidos} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Recargar">
                  <RefreshCw size={16} className={pedidosLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        {['ID / Fecha', 'Tipo', 'Items', 'Total', 'Pago', 'Estado', 'Acciones'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {pedidosLoading ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>
                      ) : filteredPedidos.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center">
                          <ShoppingBag size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm font-semibold text-slate-400">No hay pedidos</p>
                        </td></tr>
                      ) : filteredPedidos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                          <td className="px-5 py-3.5">
                            <button onClick={() => navigator.clipboard.writeText(p.id).then(() => toast.success('ID copiado'))}
                              className="font-mono text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 transition-colors">
                              #{p.id.substring(0, 8)} <Copy size={9} />
                            </button>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(p.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                            {p.usuario_nombre && <p className="text-[10px] text-slate-400">👤 {p.usuario_nombre}</p>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">{p.tipo_pedido || 'mesa'}</span>
                            {p.notas && <p className="text-[10px] text-slate-400 max-w-[100px] truncate">{p.notas}</p>}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{Array.isArray(p.items) ? p.items.length : 0} item(s)</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-black text-sm text-slate-900 dark:text-white">S/ {Number(p.total).toFixed(2)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{METODO_PAGO_LABELS[p.metodo_pago] || p.metodo_pago}</p>
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', p.estado_pago === 'pagado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400')}>
                              {p.estado_pago === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize', ESTADO_PEDIDO_COLORS[p.estado_pedido])}>
                              {p.estado_pedido.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditPedido(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Editar"><Edit2 size={15} /></button>
                              <button onClick={() => setDeletePedido({ id: p.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredPedidos.length > 0 && (
                  <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{filteredPedidos.length} pedidos · Total S/ {filteredPedidos.reduce((s, p) => s + Number(p.total), 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODALES                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal: Crear/Editar Producto */}
      <Dialog open={productModal} onClose={() => setProductModal(false)} title={editingProducto?.id ? 'Editar Producto' : 'Nuevo Producto'} description={editingProducto?.id ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al negocio'}>
        <form onSubmit={handleSaveProducto} className="space-y-4">
          <InputField label="Nombre" required value={productoForm.nombre} onChange={(e) => setProductoForm({ ...productoForm, nombre: e.target.value })} placeholder="Ej: 1/4 Pollo a la brasa" />

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Tipo *</label>
            <select value={productoForm.tipo} onChange={(e) => setProductoForm({ ...productoForm, tipo: e.target.value as Producto['tipo'] })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
              {(['pollo', 'bebida', 'complemento', 'promocion'] as const).map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="Precio (S/)" required type="number" step="0.01" min="0" value={productoForm.precio} onChange={(e) => setProductoForm({ ...productoForm, precio: e.target.value })} placeholder="0.00" />
            <InputField label="Fracción Pollo" type="number" step="0.001" min="0" max="1" value={productoForm.fraccion_pollo} onChange={(e) => setProductoForm({ ...productoForm, fraccion_pollo: e.target.value })} placeholder="0.25" />
          </div>

          <InputField label="Descripción" value={productoForm.descripcion} onChange={(e) => setProductoForm({ ...productoForm, descripcion: e.target.value })} placeholder="Descripción opcional..." />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <input type="checkbox" id="activo-prod" checked={productoForm.activo} onChange={(e) => setProductoForm({ ...productoForm, activo: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <label htmlFor="activo-prod" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Producto activo (visible en el POS)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setProductModal(false)} className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-all">Cancelar</button>
            <button type="submit" disabled={productoLoading} className="flex-[2] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg">
              {productoLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" /> : <Save size={16} />}
              {editingProducto?.id ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Crear/Editar Usuario */}
      <Dialog open={userModal} onClose={() => setUserModal(false)} title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'} description={editingUser ? 'Modifica los datos del usuario' : `Crea un nuevo usuario para ${negocio.nombre}`}>
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {userForm.nombre ? userForm.nombre.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{userForm.nombre || 'Nuevo Usuario'}</p>
              <p className="text-xs text-slate-400">{userForm.email || 'sin email'}</p>
            </div>
          </div>

          <InputField label="Nombre completo" required value={userForm.nombre} onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })} placeholder="Juan Pérez" />
          <InputField label="Email" required type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="juan@ejemplo.com" />

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Contraseña {!editingUser && <span className="text-red-500">*</span>}
              {editingUser && <span className="text-slate-400 normal-case font-normal">(vacío = sin cambios)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Rol *</label>
            <select value={userForm.rol} onChange={(e) => setUserForm({ ...userForm, rol: e.target.value as UserRole })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
              {(['admin', 'cajero', 'mozo', 'cocinero', 'repartidor'] as const).map((r) => (
                <option key={r} value={r}>{ROLE_NAMES[r]}</option>
              ))}
            </select>
          </div>

          {editingUser && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <input type="checkbox" id="activo-user" checked={userForm.activo} onChange={(e) => setUserForm({ ...userForm, activo: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
              <label htmlFor="activo-user" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Usuario activo (puede iniciar sesión)</label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUserModal(false)} className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-all">Cancelar</button>
            <button type="submit" disabled={userLoading} className="flex-[2] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg">
              {userLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" /> : <Save size={16} />}
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Editar Pedido */}
      {editingPedido && (
        <Dialog open={pedidoModal} onClose={() => setPedidoModal(false)} title="Editar Pedido" description={`Pedido #${editingPedido.id.substring(0, 8)} · S/ ${Number(editingPedido.total).toFixed(2)}`}>
          <form onSubmit={handleSavePedido} className="space-y-4">
            {/* Items (solo lectura) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Items del Pedido</label>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto">
                {Array.isArray(editingPedido.items) && editingPedido.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.cantidad}x {item.nombre}</span>
                    <span className="font-bold text-slate-900 dark:text-white">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total editable */}
            <InputField label="Total (S/)" type="number" step="0.01" min="0"
              value={String(editingPedido.total)}
              onChange={(e) => setEditingPedido({ ...editingPedido, total: parseFloat(e.target.value) || 0 })} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Estado Pedido</label>
                <select value={editingPedido.estado_pedido} onChange={(e) => setEditingPedido({ ...editingPedido, estado_pedido: e.target.value as Venta['estado_pedido'] })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                  <option value="pendiente">Pendiente</option>
                  <option value="listo">Listo</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Estado Pago</label>
                <select value={editingPedido.estado_pago || 'pagado'} onChange={(e) => setEditingPedido({ ...editingPedido, estado_pago: e.target.value as 'pendiente' | 'pagado' })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Método de Pago</label>
              <select value={editingPedido.metodo_pago} onChange={(e) => setEditingPedido({ ...editingPedido, metodo_pago: e.target.value as Venta['metodo_pago'] })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all">
                {(['efectivo', 'yape', 'plin', 'tarjeta', 'mixto'] as const).map((m) => (
                  <option key={m} value={m}>{METODO_PAGO_LABELS[m]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Notas</label>
              <textarea value={editingPedido.notas || ''} onChange={(e) => setEditingPedido({ ...editingPedido, notas: e.target.value })} rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                placeholder="Notas adicionales..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPedidoModal(false)} className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-all">Cancelar</button>
              <button type="submit" disabled={pedidoSaving} className="flex-[2] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-lg">
                {pedidoSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" /> : <Save size={16} />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Confirm: Eliminar Producto */}
      <ConfirmDialog open={!!deleteProducto} onClose={() => setDeleteProducto(null)} onConfirm={handleDeleteProducto}
        title="Eliminar Producto" description={`¿Eliminar "${deleteProducto?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" cancelLabel="Cancelar" variant="danger" />

      {/* Confirm: Eliminar Usuario */}
      <ConfirmDialog open={!!deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDeleteUser}
        title="Eliminar Usuario" description={`¿Eliminar "${deleteUser?.nombre}"? Se eliminará también su acceso al sistema.`}
        confirmLabel="Eliminar" cancelLabel="Cancelar" variant="danger" />

      {/* Confirm: Eliminar Pedido */}
      <ConfirmDialog open={!!deletePedido} onClose={() => setDeletePedido(null)} onConfirm={handleDeletePedido}
        title="Eliminar Pedido" description="¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Eliminar" cancelLabel="Cancelar" variant="danger" />
    </div>
  );
}
