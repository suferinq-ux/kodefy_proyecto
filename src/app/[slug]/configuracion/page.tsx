'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Producto } from '@/lib/database.types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X, Package, Pencil, Users, Settings, Trash2, Plus, RefreshCw, Loader2, Info, Printer, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBebidasConfig } from '@/hooks/useBebidasConfig';
import { isReadOnly } from '@/lib/roles';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false });

type TipoProducto = 'pollo' | 'bebida' | 'complemento';

const TIPO_LABELS: Record<string, string> = {
    pollo: 'Pollos y Platos',
    bebida: 'Bebidas',
    complemento: 'Complementos',
    todos: 'Todos'
};

function ConfiguracionContent() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrecio, setEditPrecio] = useState('');
    const [editFraccion, setEditFraccion] = useState(0);
    const [saving, setSaving] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<TipoProducto | 'todos'>('todos');

    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'precios' | 'usuarios' | 'mesas' | 'negocio' | 'impresoras' | 'bebidas' | 'stock'>('precios');
    const { allBrands, customBrands, deleteBeverage, loading: loadingBebidas, masterStock, updateMasterStock } = useBebidasConfig();
    const [config, setConfig] = useState<any>(null);
    
    // Mesas stuff
    const [mesas, setMesas] = useState<any[]>([]);
    const [nuevaMesa, setNuevaMesa] = useState('');
    const [cantidadMasiva, setCantidadMasiva] = useState('1');
    const [editConfig, setEditConfig] = useState({
        nombre: '',
        logo_url: '',
        color_primario: '#2563eb',
        color_secundario: '#1e40af',
    });
    const [fiscalConfig, setFiscalConfig] = useState({
        ruc: '',
        razon_social: '',
        direccion: '',
        mensaje_boleta: '',
        ciudad: '',
        telefono: '',
        latitud: null as number | null,
        longitud: null as number | null,
        costo_base_delivery: 0,
        costo_por_km: 0
    });

    // Users stuff
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserRole, setEditUserRole] = useState('');
    const [editUserPassword, setEditUserPassword] = useState('');
    
    // New user form states
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('mozo');

    // Create Product stuff
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [nuevoProducto, setNuevoProducto] = useState({
        nombre: '',
        precio: '',
        tipo: 'complemento' as TipoProducto,
        categoria_id: '',
        imagen_url: '',
        fraccion_pollo: 0
    });
    const [categorias, setCategorias] = useState<any[]>([]);
    
    // Printers stuff
    const [impresoras, setImpresoras] = useState<any[]>([]);
    const [showNewPrinterForm, setShowNewPrinterForm] = useState(false);
    const [newPrinter, setNewPrinter] = useState({
        nombre: '',
        tipo: 'cocina',
        ip_address: '',
        puerto: 9100,
        activo: true
    });

    // Confirm Modal stuff
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'info'
    });

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .order('tipo', { ascending: true })
                .order('nombre', { ascending: true });

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarProductos();
        if (user && user.rol === 'admin') {
            cargarEmpleados();
            cargarConfiguracion();
            cargarMesas();
            cargarCategorias();
            cargarImpresoras();
        }
    }, [user]);

    const cargarImpresoras = async () => {
        try {
            const { data, error } = await supabase
                .from('configuracion_impresoras')
                .select('*')
                .eq('negocio_id', user?.negocio_id)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setImpresoras(data || []);
        } catch (error: any) {
            console.error('Error cargando impresoras:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        }
    };

    const cargarCategorias = async () => {
        const { data } = await supabase.from('categorias').select('*').order('nombre', { ascending: true });
        setCategorias(data || []);
    };

    const cargarMesas = async () => {
        const { data } = await supabase.from('mesas').select('*').order('numero', { ascending: true });
        setMesas(data || []);
    };

    const cargarConfiguracion = async () => {
        try {
            const { data, error } = await supabase
                .from('negocios')
                .select('*')
                .eq('id', user?.negocio_id)
                .single();

            if (data && !error) {
                setConfig(data);
                setEditConfig({
                    nombre: data.nombre || '',
                    logo_url: data.logo_url || '',
                    color_primario: data.color_primario || '#2563eb',
                    color_secundario: data.color_secundario || '#1e40af',
                });
            }

            // Cargar configuración de tickets
            const { data: ticketData } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .eq('negocio_id', user?.negocio_id)
                .maybeSingle();

            if (ticketData) {
                if (ticketData.nombre_negocio && ticketData.nombre_negocio.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(ticketData.nombre_negocio);
                        setFiscalConfig({
                            ruc: parsed.ruc || '',
                            razon_social: parsed.razon_social || '',
                            direccion: parsed.direccion || '',
                            mensaje_boleta: parsed.mensaje_boleta || '',
                            ciudad: parsed.ciudad || '',
                            telefono: ticketData.telefono || parsed.telefono || '',
                            latitud: parsed.latitud || null,
                            longitud: parsed.longitud || null,
                            costo_base_delivery: parsed.costo_base_delivery || 0,
                            costo_por_km: parsed.costo_por_km || 0
                        });
                    } catch (e) {
                        setFiscalConfig(prev => ({ ...prev, telefono: ticketData.telefono || '' }));
                    }
                } else {
                    setFiscalConfig(prev => ({ 
                        ...prev, 
                        razon_social: ticketData.nombre_negocio || '', 
                        telefono: ticketData.telefono || '' 
                    }));
                }
            }
        } catch (err) {
            console.error('Error cargando config:', err);
        }
    };

    const guardarConfiguracion = async () => {
        setSaving(true);
        try {
            // 1. Guardar en tabla negocios (branding)
            const { error: errorNegocio } = await supabase
                .from('negocios')
                .update(editConfig)
                .eq('id', user?.negocio_id);

            if (errorNegocio) throw errorNegocio;

            // 2. Guardar en tabla configuracion_negocio (fiscal)
            const jsonFiscal = JSON.stringify(fiscalConfig);
            
            const { data: ticketExists } = await supabase
                .from('configuracion_negocio')
                .select('id')
                .eq('negocio_id', user?.negocio_id)
                .maybeSingle();

            if (ticketExists) {
                await supabase
                    .from('configuracion_negocio')
                    .update({ 
                        nombre_negocio: jsonFiscal,
                        telefono: fiscalConfig.telefono
                    })
                    .eq('negocio_id', user?.negocio_id);
            } else {
                await supabase
                    .from('configuracion_negocio')
                    .insert({
                        negocio_id: user?.negocio_id,
                        nombre_negocio: jsonFiscal,
                        telefono: fiscalConfig.telefono,
                        modo_impresion: 'pos'
                    });
            }

            setConfig(editConfig);
            toast.success('Configuración guardada correctamente');
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || error.details || 'Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const seedBaseProducts = async () => {
        if (!confirm('¿Deseas cargar los productos y categorías base para este negocio? Esto creará pollos, complementos y configurará las gaseosas iniciales.')) return;
        setSaving(true);
        try {
            const negocioId = user?.negocio_id;
            if (!negocioId) throw new Error('No se detectó el ID del negocio');

            // 1. Crear Categorías Base
            const { data: catData, error: catError } = await supabase.from('categorias').insert([
                { nombre: 'Pollos a la Brasa', negocio_id: negocioId },
                { nombre: 'Complementos', negocio_id: negocioId },
                { nombre: 'Bebidas', negocio_id: negocioId }
            ]).select();

            if (catError) throw catError;

            const catPollos = catData.find(c => c.nombre === 'Pollos a la Brasa')?.id;
            const catComp = catData.find(c => c.nombre === 'Complementos')?.id;

            // 2. Crear Productos Base
            const { error: prodError } = await supabase.from('productos').insert([
                { nombre: '1 Pollo a la Brasa', tipo: 'pollo', precio: 65, fraccion_pollo: 1, categoria_id: catPollos, negocio_id: negocioId },
                { nombre: '1/2 Pollo a la Brasa', tipo: 'pollo', precio: 35, fraccion_pollo: 0.5, categoria_id: catPollos, negocio_id: negocioId },
                { nombre: '1/4 Pollo a la Brasa', tipo: 'pollo', precio: 19, fraccion_pollo: 0.25, categoria_id: catPollos, negocio_id: negocioId },
                { nombre: 'Porción de Papas', tipo: 'complemento', precio: 10, fraccion_pollo: 0, categoria_id: catComp, negocio_id: negocioId },
                { nombre: 'Ensalada Grande', tipo: 'complemento', precio: 12, fraccion_pollo: 0, categoria_id: catComp, negocio_id: negocioId }
            ]);

            if (prodError) throw prodError;

            toast.success('Productos base cargados exitosamente');
            cargarProductos();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al cargar base: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const crearProductoNuevo = async () => {
        if (!nuevoProducto.nombre || !nuevoProducto.precio) {
            toast.error('Nombre y precio son obligatorios');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('productos').insert([{
                ...nuevoProducto,
                precio: parseFloat(nuevoProducto.precio as string),
                negocio_id: user?.negocio_id,
                activo: true
            }]);

            if (error) throw error;

            toast.success('Producto creado exitosamente');
            setIsCreatingProduct(false);
            setNuevoProducto({
                nombre: '',
                precio: '',
                tipo: 'complemento',
                categoria_id: '',
                imagen_url: '',
                fraccion_pollo: 0
            });
            cargarProductos();
        } catch (error: any) {
            toast.error('Error al crear: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar producto?',
            message: 'El producto se borrará permanentemente de la lista de precios.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('productos').delete().eq('id', id);
                    if (error) throw error;
                    toast.success('Producto eliminado');
                    cargarProductos();
                } catch (error) {
                    toast.error('Error al eliminar');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const crearMesa = async () => {
        if (!nuevaMesa) return;
        const numMesa = parseInt(nuevaMesa);
        if (isNaN(numMesa)) {
            toast.error('El número de mesa debe ser un número válido');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('mesas').insert({
                numero: numMesa,
                estado: 'libre',
                negocio_id: user?.negocio_id
            });
            if (error) throw error;
            toast.success('Mesa creada');
            setNuevaMesa('');
            cargarMesas();
        } catch (error) {
            toast.error('Error al crear mesa');
        } finally {
            setSaving(false);
        }
    };

    const crearMesasMasivas = async () => {
        const cantidad = parseInt(cantidadMasiva);
        if (isNaN(cantidad) || cantidad <= 0 || cantidad > 50) {
            toast.error('Ingresa una cantidad válida (máx 50)');
            return;
        }

        setSaving(true);
        try {
            // 1. Obtener el número más alto actual
            const maxNumero = mesas.length > 0 
                ? Math.max(...mesas.map(m => m.numero)) 
                : 0;

            // 2. Preparar el array de nuevas mesas
            const nuevasMesas = Array.from({ length: cantidad }, (_, i) => ({
                numero: maxNumero + i + 1,
                estado: 'libre',
                negocio_id: user?.negocio_id
            }));

            // 3. Insertar todas de golpe
            const { error } = await supabase.from('mesas').insert(nuevasMesas);
            
            if (error) throw error;
            
            toast.success(`${cantidad} mesas añadidas`);
            setCantidadMasiva('1');
            cargarMesas();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear mesas masivas');
        } finally {
            setSaving(false);
        }
    };

    const eliminarMesa = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar mesa?',
            message: 'Esta acción no se puede deshacer y la mesa desaparecerá del mapa de pedidos.',
            type: 'danger',
            onConfirm: async () => {
                const { error } = await supabase.from('mesas').delete().eq('id', id);
                if (error) toast.error('Error al eliminar');
                else {
                    toast.success('Mesa eliminada');
                    cargarMesas();
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const cargarEmpleados = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error cargando usuarios');
            }
            const data = await res.json();
            setEmpleados(data || []);
        } catch (error) {
            console.error('Error cargando empleados:', error);
        }
    };

    const iniciarEdicion = (producto: Producto) => {
        setEditingId(producto.id);
        setEditPrecio(producto.precio.toString());
        setEditFraccion(producto.fraccion_pollo || 0);
    };

    const cancelarEdicion = () => {
        setEditingId(null);
        setEditPrecio('');
    };

    const guardarPrecio = async (producto: Producto) => {
        const nuevoPrecio = parseFloat(editPrecio);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        if (nuevoPrecio === producto.precio) {
            cancelarEdicion();
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('productos')
                .update({ 
                    precio: nuevoPrecio,
                    fraccion_pollo: editFraccion
                })
                .eq('id', producto.id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error('No se pudo actualizar. Verifica permisos.', { duration: 5000 });
                return;
            }

            setProductos(prev => prev.map(p =>
                p.id === producto.id ? { ...p, precio: nuevoPrecio, fraccion_pollo: editFraccion } : p
            ));

            toast.success(
                `${producto.nombre}: S/ ${nuevoPrecio.toFixed(2)}`,
                { duration: 3000 }
            );
            cancelarEdicion();
        } catch (error) {
            console.error('Error al actualizar precio:', error);
            toast.error('Error al guardar el precio');
        } finally {
            setSaving(false);
        }
    };

    const iniciarEdicionUsuario = (emp: any) => {
        setEditingUserId(emp.id);
        setEditUserName(emp.nombre);
        setEditUserRole(emp.rol);
        setEditUserPassword('');
    };

    const cancelarEdicionUsuario = () => {
        setEditingUserId(null);
        setEditUserName('');
        setEditUserRole('');
        setEditUserPassword('');
    };

    const guardarUsuario = async (emp: any) => {
        if (!editUserName.trim()) {
            toast.error('El nombre no puede estar vacío');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    id: emp.id,
                    nombre: editUserName.trim(),
                    rol: editUserRole,
                    password: editUserPassword || undefined
                })
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            setEmpleados(prev => prev.map(p =>
                p.id === emp.id ? { ...p, nombre: editUserName.trim(), rol: editUserRole } : p
            ));

            toast.success('Usuario actualizado correctamente');
            cancelarEdicionUsuario();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al actualizar usuario');
        } finally {
            setSaving(false);
        }
    };

    const crearUsuario = async () => {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            toast.error('Completa todos los campos');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    nombre: newUserName.trim(),
                    email: newUserEmail.trim(),
                    password: newUserPassword,
                    rol: newUserRole
                })
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            toast.success('Usuario creado correctamente');
            setShowNewUserForm(false);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            cargarEmpleados();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al crear usuario');
        } finally {
            setSaving(false);
        }
    };

    const eliminarUsuario = async (id: string, nombre: string) => {
        if (id === user?.id) {
            toast.error('No puedes eliminarte a ti mismo');
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
            if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);

            setEmpleados(prev => prev.filter(p => p.id !== id));
            toast.success('Usuario eliminado');
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message || 'Error al eliminar usuario');
        } finally {
            setSaving(false);
        }
    };

    const crearImpresora = async () => {
        if (!newPrinter.nombre || !newPrinter.ip_address) {
            toast.error('Nombre e IP son obligatorios');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('configuracion_impresoras')
                .insert([{
                    ...newPrinter,
                    negocio_id: user?.negocio_id
                }]);

            if (error) throw error;

            toast.success('Impresora registrada');
            setShowNewPrinterForm(false);
            setNewPrinter({
                nombre: '',
                tipo: 'cocina',
                ip_address: '',
                puerto: 9100,
                activo: true
            });
            cargarImpresoras();
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const eliminarImpresora = async (id: string) => {
        if (!confirm('¿Eliminar esta configuración de impresora?')) return;
        
        setSaving(true);
        try {
            const { error } = await supabase
                .from('configuracion_impresoras')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Impresora eliminada');
            cargarImpresoras();
        } catch (error: any) {
            toast.error('Error al eliminar');
        } finally {
            setSaving(false);
        }
    };

    const probarImpresora = async (printer: any) => {
        toast.loading('Enviando ticket de prueba...', { id: 'test-print' });
        try {
            // Insertamos un pedido de prueba que el worker debe detectar
            const { error } = await supabase
                .from('pedidos')
                .insert([{
                    negocio_id: user?.negocio_id,
                    total: 0,
                    items: [{ nombre: 'TICKET DE PRUEBA KODEFY', cantidad: 1, precio: 0 }],
                    estado: 'completado',
                    tipo_pago: 'efectivo',
                    estado_impresion: 'pendiente'
                }]);

            if (error) throw error;
            toast.success('Prueba enviada. El Worker local debería imprimirlo en breve.', { id: 'test-print' });
        } catch (error) {
            toast.error('Error al enviar prueba', { id: 'test-print' });
        }
    };

    const productosFiltrados = productos.filter(p => {
        const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
        return matchBusqueda && matchTipo;
    });

    const productosPorTipo = productosFiltrados.reduce((acc, p) => {
        const tipo = p.tipo as TipoProducto;
        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(p);
        return acc;
    }, {} as Record<TipoProducto, Producto[]>);

    const tiposOrdenados: TipoProducto[] = ['pollo', 'bebida', 'complemento'];
    const conteos: Record<string, number> = {
        todos: productos.length,
        pollo: productos.filter(p => p.tipo === 'pollo').length,
        bebida: productos.filter(p => p.tipo === 'bebida').length,
        complemento: productos.filter(p => p.tipo === 'complemento').length,
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4 mb-3"
                        >
                            <div className="w-1.5 h-10 bg-rodrigo-terracotta rounded-none shadow-sm" />
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                                Ajustes
                            </h1>
                        </motion.div>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] ml-6 italic">
                            Configuración del Sistema • Panel Maestro
                        </p>
                    </div>

                    {(user?.rol === 'admin' || user?.rol === 'cajero' || user?.rol === 'invitado') && (
                        <nav className="flex bg-slate-100 p-1.5 rounded-none border border-slate-200 self-start shadow-sm flex-wrap">
                            {[
                                { id: 'precios', icon: Settings, label: 'Precios', roles: ['admin', 'cajero', 'invitado'] },
                                { id: 'stock', icon: RefreshCw, label: 'Stock', roles: ['admin', 'cajero', 'invitado'] },
                                { id: 'usuarios', icon: Users, label: 'Usuarios', roles: ['admin', 'invitado'] },
                                { id: 'bebidas', icon: Package, label: 'Bebidas', roles: ['admin', 'invitado'] },
                                { id: 'impresoras', icon: Printer, label: 'Impresoras', roles: ['admin', 'invitado'] },
                                { id: 'mesas', icon: Users, label: 'Mesas', roles: ['admin', 'invitado'] },
                                { id: 'negocio', icon: Info, label: 'Negocio', roles: ['admin', 'invitado'] }
                            ].filter(tab => tab.roles.includes(user?.rol as string)).map((tab, idx) => (
                                <button
                                    key={tab.id || `tab-${idx}`}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-none transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <tab.icon size={14} strokeWidth={3} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    )}
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'precios' && (
                        <motion.div
                            key="precios"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Search & Filters */}
                             <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="relative flex-1 w-full group">
                                    <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rodrigo-terracotta transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="FILTRAR PRODUCTOS..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="w-full bg-white border-2 border-slate-100 rounded-none pl-16 pr-8 py-5 text-sm font-black text-slate-900 italic tracking-widest placeholder:text-slate-200 shadow-sm focus:border-rodrigo-terracotta/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                    <div className="flex bg-slate-100 p-1.5 rounded-none border border-slate-200 shadow-inner shrink-0">
                                        {(['todos', ...tiposOrdenados] as const).map((tipo, idx) => (
                                            <button
                                                key={`${tipo}-${idx}`}
                                                onClick={() => setFiltroTipo(tipo)}
                                                className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] rounded-none transition-all whitespace-nowrap ${filtroTipo === tipo
                                                    ? 'bg-white text-slate-900 shadow-md'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {tipo === 'todos' ? 'TOTAL' : TIPO_LABELS[tipo]}
                                                <span className="ml-2 opacity-50 font-mono italic">[{conteos[tipo]}]</span>
                                            </button>
                                        ))}
                                    </div>
                                    {!isReadOnly(user?.rol) && (
                                        <button 
                                            onClick={() => setIsCreatingProduct(true)}
                                            className="px-8 py-5 bg-slate-900 text-white rounded-none flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 group shrink-0"
                                        >
                                            <div className="w-8 h-8 bg-white/10 rounded-none flex items-center justify-center group-hover:rotate-90 transition-transform">
                                                <Plus size={18} strokeWidth={3} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic pr-2">Nuevo Producto</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-6">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-rodrigo-terracotta rounded-none animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse italic">Indexando catálogo...</p>
                                </div>
                            ) : productosFiltrados.length === 0 ? (
                                <div className="bg-white border border-slate-100 rounded-none py-32 text-center shadow-sm">
                                    <Package size={64} className="mx-auto mb-6 opacity-5" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">No se encontraron coincidencias</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {tiposOrdenados.map((tipo, idx) => {
                                        const prods = productosPorTipo[tipo];
                                        if (!prods || prods.length === 0) return null;

                                        return (
                                            <div key={`${tipo}-${idx}`} className="space-y-6">
                                                <div className="flex items-center gap-6 px-4">
                                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic whitespace-nowrap">
                                                        {TIPO_LABELS[tipo]}
                                                    </h2>
                                                    <div className="flex-1 h-px bg-slate-100" />
                                                    <span className="text-[10px] font-black text-slate-200 font-mono italic">[{prods.length}]</span>
                                                </div>

                                                <div className="bg-white border border-slate-100 rounded-none shadow-sm overflow-hidden">
                                                    {/* Desktop Table */}
                                                    <div className="hidden sm:block overflow-x-auto">
                                                        <table className="w-full border-collapse text-left">
                                                            <thead>
                                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Descripción</th>
                                                                    <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] w-48 italic">Ajuste de Precio</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {prods.map((producto, pIdx) => (
                                                                    <tr key={producto.id || `prod-${tipo}-${pIdx}`} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center gap-6">
                                                                                <div className="w-14 h-14 bg-slate-50 rounded-none overflow-hidden border border-slate-100 shrink-0">
                                                                                    {producto.imagen_url ? (
                                                                                        <img src={producto.imagen_url} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                                            <Package size={24} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className={`text-lg font-bold tracking-tight italic transition-colors ${editingId === producto.id ? 'text-rodrigo-terracotta' : 'text-slate-900'}`}>
                                                                                        {producto.nombre}
                                                                                    </span>
                                                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{TIPO_LABELS[tipo]}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6 text-right">
                                                                            <AnimatePresence mode="wait">
                                                                                {editingId === producto.id ? (
                                                                                     <motion.div key="edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-end gap-3">
                                                                                         {producto.tipo === 'pollo' && (
                                                                                             <div className="flex flex-col items-end mr-4">
                                                                                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Descuento Pollo</label>
                                                                                                 <select
                                                                                                     value={editFraccion}
                                                                                                     onChange={(e) => setEditFraccion(parseFloat(e.target.value))}
                                                                                                     className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-900 italic outline-none focus:border-rodrigo-terracotta/30"
                                                                                                 >
                                                                                                     <option value="0">Ninguno</option>
                                                                                                     <option value="0.125">1/8</option>
                                                                                                     <option value="0.25">1/4</option>
                                                                                                     <option value="0.5">1/2</option>
                                                                                                     <option value="1">1 Ent.</option>
                                                                                                 </select>
                                                                                             </div>
                                                                                         )}
                                                                                         <div className="flex flex-col items-end">
                                                                                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Precio</label>
                                                                                             <div className="flex items-center gap-2">
                                                                                                 <span className="text-xl font-black text-rodrigo-terracotta italic">S/</span>
                                                                                                 <input
                                                                                                     type="number"
                                                                                                     step="0.10"
                                                                                                     value={editPrecio}
                                                                                                     onChange={(e) => setEditPrecio(e.target.value)}
                                                                                                     className="w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-right text-lg font-black text-slate-900 italic outline-none focus:border-rodrigo-terracotta/30 transition-all placeholder:text-slate-200"
                                                                                                     autoFocus
                                                                                                 />
                                                                                             </div>
                                                                                         </div>
                                                                                         <div className="flex gap-2 self-end pb-1">
                                                                                             <button onClick={() => guardarPrecio(producto)} disabled={saving} className="p-2 bg-slate-900 text-white rounded-lg shadow-lg"><Check size={16} strokeWidth={3} /></button>
                                                                                             <button onClick={cancelarEdicion} className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600"><X size={16} strokeWidth={3} /></button>
                                                                                         </div>
                                                                                     </motion.div>
                                                                                ) : (
                                                                                    <motion.button
                                                                                        key="display"
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                        onClick={() => iniciarEdicion(producto)}
                                                                                        className="flex items-center justify-end gap-4 w-full group/btn text-right"
                                                                                    >
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter group-hover/btn:text-rodrigo-terracotta transition-colors">
                                                                                                S/ {producto.precio.toFixed(2)}
                                                                                            </span>
                                                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-all -translate-y-1 group-hover/btn:translate-y-0">Editar Tarifa</span>
                                                                                        </div>
                                                                                        {!isReadOnly(user?.rol) && <Pencil size={16} className="text-slate-100 transition-all group-hover/btn:text-rodrigo-terracotta/40" />}
                                                                                    </motion.button>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile Card Stack */}
                                                    <div className="sm:hidden divide-y divide-slate-100">
                                                        {prods.map((producto, pIdx) => (
                                                            <div key={producto.id || `prod-mob-${tipo}-${pIdx}`} className="p-5 flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{producto.nombre}</span>
                                                                        {!producto.activo && (
                                                                            <span className="text-[8px] font-black text-rodrigo-terracotta uppercase mt-1 tracking-widest">Inactivo</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Precio Actual</p>
                                                                        <p className="text-xl font-black text-slate-900 italic tracking-tighter">S/ {producto.precio.toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <AnimatePresence mode="wait">
                                                                    {editingId === producto.id ? (
                                                                        <motion.div key="edit-mobile" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                                                                            <input
                                                                                type="number"
                                                                                step="0.10"
                                                                                value={editPrecio}
                                                                                onChange={(e) => setEditPrecio(e.target.value)}
                                                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 italic outline-none"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={() => guardarPrecio(producto)} disabled={saving} className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Check size={20} strokeWidth={3} /></button>
                                                                            <button onClick={cancelarEdicion} className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center"><X size={20} strokeWidth={3} /></button>
                                                                        </motion.div>
                                                                    ) : (
                                                                        <button
                                                                            key="display-mobile"
                                                                            onClick={() => iniciarEdicion(producto)}
                                                                            className="w-full py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                                                        >
                                                                            <Pencil size={14} /> Ajustar Tarifa
                                                                        </button>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'usuarios' && user?.rol === 'admin' && (
                        <motion.div
                            key="usuarios"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowNewUserForm(!showNewUserForm)}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    {!isReadOnly(user?.rol) && (showNewUserForm ? <X size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />)}
                                    {isReadOnly(user?.rol) ? 'Vista de Usuarios' : (showNewUserForm ? 'Cancelar' : 'Nuevo Usuario')}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showNewUserForm && (
                                    <motion.div
                                        key="new-user-form"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white border-2 border-dashed border-slate-200 rounded-none p-8 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={newUserName}
                                                    onChange={e => setNewUserName(e.target.value)}
                                                    placeholder="Nombre completo"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={newUserEmail}
                                                    onChange={e => setNewUserEmail(e.target.value)}
                                                    placeholder="correo@rodrigos.com"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
                                                <input
                                                    type="password"
                                                    value={newUserPassword}
                                                    onChange={e => setNewUserPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol</label>
                                                    <select
                                                        value={newUserRole}
                                                        onChange={e => setNewUserRole(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-rodrigo-terracotta/30"
                                                    >
                                                        <option value="mozo">Mozo</option>
                                                        <option value="admin">Administrador</option>
                                                        <option value="cajero">Cajero (Caja)</option>
                                                        <option value="cocinero">Cocina</option>
                                                        <option value="repartidor">Repartidor (Delivery)</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={crearUsuario}
                                                    disabled={saving}
                                                    className="bg-emerald-500 text-white p-3.5 rounded-none self-end shadow-md hover:brightness-110 disabled:opacity-50"
                                                >
                                                    <Check size={20} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="bg-white border border-slate-100 rounded-none shadow-sm overflow-hidden">
                                {/* Desktop View */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic">Personal</th>
                                                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic">Gestión de Cuenta</th>
                                                <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-8 py-6 italic w-20">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {empleados.map((emp, idx) => (
                                            <tr key={emp.id || `emp-${idx}`} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${emp.rol === 'admin' ? 'text-rodrigo-mustard' : 'text-rodrigo-terracotta'}`}>
                                                            {emp.rol}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter italic">{emp.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <AnimatePresence mode="wait">
                                                        {editingUserId === emp.id ? (
                                                            <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-3">
                                                                <div className="flex-1 space-y-1 min-w-[150px]">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editUserName}
                                                                        onChange={e => setEditUserName(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-none px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                        placeholder="Nombre"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 space-y-1 min-w-[150px]">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nueva Contraseña (Opcional)</label>
                                                                    <input
                                                                        type="password"
                                                                        value={editUserPassword}
                                                                        onChange={e => setEditUserPassword(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-none px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                        placeholder="••••••••"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1 w-full md:w-auto">
                                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol</label>
                                                                    <select 
                                                                        value={editUserRole}
                                                                        onChange={e => setEditUserRole(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-none px-4 py-2 text-sm text-slate-900 font-black italic focus:border-rodrigo-mustard/30 outline-none"
                                                                    >
                                                                        <option value="mozo">Mozo</option>
                                                                        <option value="admin">Administrador</option>
                                                                        <option value="cajero">Cajero (Caja)</option>
                                                                        <option value="cocinero">Cocina</option>
                                                                        <option value="repartidor">Repartidor (Delivery)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => guardarUsuario(emp)} disabled={saving} className="p-2 bg-emerald-500 text-white rounded-none hover:brightness-110 shadow-sm"><Check size={16} strokeWidth={3} /></button>
                                                                    <button onClick={cancelarEdicionUsuario} className="p-2 bg-slate-100 text-slate-400 rounded-none hover:text-slate-600"><X size={16} strokeWidth={3} /></button>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.button
                                                                key="display"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                onClick={() => iniciarEdicionUsuario(emp)}
                                                                className="flex flex-col items-start gap-1 group/btn w-full"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg font-black text-slate-900 italic group-hover/btn:text-rodrigo-terracotta transition-colors tracking-tighter">
                                                                        {emp.nombre}
                                                                    </span>
                                                                    <Pencil size={12} className="text-slate-200 opacity-0 group-hover/btn:opacity-100 transition-all" />
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Click para editar cuenta y contraseña</span>
                                                            </motion.button>
                                                        )}
                                                    </AnimatePresence>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button 
                                                        onClick={() => eliminarUsuario(emp.id, emp.nombre)}
                                                        disabled={saving || emp.id === user?.id}
                                                        className="p-3 bg-slate-50 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-none transition-all disabled:opacity-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View (Card Stack) */}
                                <div className="sm:hidden divide-y divide-slate-100">
                                    {empleados.map((emp, idx) => (
                                        <div key={emp.id || `emp-mob-${idx}`} className="p-5 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${emp.rol === 'admin' ? 'text-rodrigo-mustard' : 'text-rodrigo-terracotta'}`}>
                                                        {emp.rol}
                                                    </span>
                                                    <span className="text-sm font-black text-slate-900 italic tracking-tight uppercase">{emp.nombre}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1">{emp.email}</span>
                                                </div>
                                                <button 
                                                    onClick={() => eliminarUsuario(emp.id, emp.nombre)}
                                                    disabled={saving || emp.id === user?.id}
                                                    className="p-3 bg-red-50 text-red-500 rounded-none active:bg-red-100 disabled:opacity-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {editingUserId === emp.id ? (
                                                    <motion.div key="edit-mobile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-4 rounded-none space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                                            <input
                                                                type="text"
                                                                value={editUserName}
                                                                onChange={e => setEditUserName(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-none px-4 py-3 text-sm font-bold italic"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña (Opcional)</label>
                                                            <input
                                                                type="password"
                                                                value={editUserPassword}
                                                                onChange={e => setEditUserPassword(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-none px-4 py-3 text-sm font-bold italic"
                                                                placeholder="Dejar en blanco para no cambiar"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Usuario</label>
                                                            <select 
                                                                value={editUserRole}
                                                                onChange={e => setEditUserRole(e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-none px-4 py-3 text-sm font-bold italic"
                                                            >
                                                                <option value="mozo">Mozo</option>
                                                                <option value="admin">Administrador</option>
                                                                <option value="cajero">Cajero (Caja)</option>
                                                                <option value="cocinero">Cocina</option>
                                                                <option value="repartidor">Repartidor (Delivery)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => guardarUsuario(emp)} disabled={saving} className="flex-1 py-3 bg-emerald-500 text-white rounded-none font-black uppercase text-[10px] tracking-widest">Guardar Cambios</button>
                                                            <button onClick={cancelarEdicionUsuario} className="px-6 py-3 bg-slate-200 text-slate-500 rounded-none font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <button 
                                                        key="btn-edit"
                                                        onClick={() => iniciarEdicionUsuario(emp)}
                                                        className="w-full py-4 bg-slate-50 border border-slate-100 rounded-none flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 active:bg-slate-100"
                                                    >
                                                        <Pencil size={14} /> Editar Cuenta
                                                    </button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>
                    </motion.div>
                )}

                    {(activeTab === 'stock' && (user?.rol === 'admin' || user?.rol === 'cajero')) && (
                        <motion.div
                            key="stock"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <StockAjustePanel 
                                allBrands={allBrands} 
                                masterStock={masterStock}
                                updateMasterStock={updateMasterStock}
                                saving={saving} 
                                setSaving={setSaving} 
                            />
                        </motion.div>
                    )}

                    {activeTab === 'bebidas' && user?.rol === 'admin' && (
                    <motion.div
                        key="bebidas"
                        initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white p-10 relative overflow-hidden border border-slate-100 rounded-none shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] mb-2 flex items-center gap-3 italic">
                                        <div className="w-8 h-px bg-slate-900" />
                                        Catálogo de Bebidas
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-11">Gestiona marcas extras para el inventario</p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-none flex items-center justify-center text-indigo-600">
                                    <Package size={24} />
                                </div>
                            </div>

                            {loadingBebidas ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando catálogo...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customBrands.length === 0 ? (
                                        <div className="col-span-full py-16 text-center bg-slate-50 rounded-none border-2 border-dashed border-slate-200">
                                            <p className="text-sm font-bold text-slate-400 italic">No hay bebidas extras registradas.</p>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Agrégalas desde el panel de Apertura</p>
                                        </div>
                                    ) : (
                                        customBrands.map((brand, idx) => (
                                            <div key={brand.key || `brand-${idx}`} className="bg-slate-50 p-8 rounded-none border border-slate-100 group relative hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                                <div className="flex items-center gap-5 mb-6">
                                                    <div className={`w-5 h-5 rounded-none shadow-inner ${brand.dot}`}></div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight">{brand.name}</h3>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{brand.key}</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`¿Estás seguro de desactivar "${brand.name}"? Se mantendrá en el historial pero ya no aparecerá en ventas nuevas.`)) {
                                                                const res = await deleteBeverage(brand.catalogId!);
                                                                if (res.success) toast.success(res.message);
                                                                else toast.error(res.message);
                                                            }
                                                        }}
                                                        className="w-12 h-12 bg-white border border-slate-100 rounded-none flex items-center justify-center text-slate-200 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3 italic flex items-center gap-2">
                                                        Formatos Registrados
                                                        <div className="flex-1 h-px bg-slate-100" />
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {brand.sizes.map((s, sIdx) => (
                                                            <div key={s.key || `size-${sIdx}`} className="bg-white px-4 py-2 rounded-none border border-slate-100 shadow-sm">
                                                                <span className="text-[10px] font-black text-slate-700 italic">{s.label}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-tighter">{s.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            <div className="mt-12 p-6 bg-indigo-50/50 rounded-none border border-indigo-100 flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-none bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                    <Info size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest italic">Nota del Sistema</p>
                                    <p className="text-[10px] font-bold text-indigo-400 leading-relaxed uppercase tracking-wider">
                                        Las bebidas extras registradas aquí aparecerán automáticamente en el panel de Apertura y Cierre para su control de inventario diario.
                                        Para registrar una nueva marca, utiliza el botón "Añadir Bebida Extra" en el panel de apertura.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'mesas' && user?.rol === 'admin' && (
                        <motion.div
                            key="mesas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-12"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Individual */}
                                <div className="bg-white border border-slate-100 rounded-none p-8 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-none flex items-center justify-center"><Plus size={16} /></div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase italic">Añadir una mesa</h3>
                                    </div>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Número exacto</label>
                                            <input
                                                type="number"
                                                value={nuevaMesa}
                                                onChange={e => setNuevaMesa(e.target.value)}
                                                placeholder="Ej: 1"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                        <button
                                            onClick={crearMesa}
                                            disabled={saving}
                                            className="bg-slate-900 text-white px-6 py-3.5 rounded-none font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-black disabled:opacity-50"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>

                                {/* Masiva */}
                                <div className="bg-white border border-slate-100 rounded-none p-8 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-none flex items-center justify-center"><Users size={16} /></div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase italic">Carga Masiva</h3>
                                    </div>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Cuántas mesas añadir?</label>
                                            <input
                                                type="number"
                                                value={cantidadMasiva}
                                                onChange={e => setCantidadMasiva(e.target.value)}
                                                min="1"
                                                max="50"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-4 py-3 text-sm font-bold italic outline-none focus:border-emerald-500/30"
                                            />
                                        </div>
                                        <button
                                            onClick={crearMesasMasivas}
                                            disabled={saving}
                                            className="bg-emerald-600 text-white px-6 py-3.5 rounded-none font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            Crear Grupo
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-2">
                                        Se añadirán correlativamente después de la mesa {mesas.length > 0 ? Math.max(...mesas.map(m => m.numero)) : 0}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic ml-4">Distribución Actual ({mesas.length} mesas)</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {mesas.map((mesa, idx) => (
                                        <div key={mesa.id || `mesa-${idx}`} className="bg-white border border-slate-100 p-6 rounded-none flex flex-col items-center gap-4 relative group shadow-sm hover:shadow-md transition-all">
                                            <div className="w-12 h-12 bg-slate-50 rounded-none flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                                                <Users size={24} />
                                            </div>
                                            <span className="font-black text-slate-900 uppercase italic text-sm">Mesa {mesa.numero}</span>
                                            <button 
                                                onClick={() => eliminarMesa(mesa.id)}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-50 text-red-500 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'negocio' && user?.rol === 'admin' && config && (
                        <motion.div
                            key="negocio"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-none p-8 sm:p-12 shadow-sm space-y-12"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Información General</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Negocio</label>
                                            <input
                                                type="text"
                                                value={editConfig.nombre}
                                                onChange={e => setEditConfig({...editConfig, nombre: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URL del Logo (PNG/JPG)</label>
                                            <input
                                                type="text"
                                                value={editConfig.logo_url}
                                                onChange={e => setEditConfig({...editConfig, logo_url: e.target.value})}
                                                placeholder="https://..."
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight pt-4">Datos de Facturación</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">RUC</label>
                                                <input
                                                    type="text"
                                                    value={fiscalConfig.ruc}
                                                    onChange={e => setFiscalConfig({...fiscalConfig, ruc: e.target.value})}
                                                    placeholder="2060..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ciudad</label>
                                                <input
                                                    type="text"
                                                    value={fiscalConfig.ciudad}
                                                    onChange={e => setFiscalConfig({...fiscalConfig, ciudad: e.target.value})}
                                                    placeholder="AYACUCHO - HUAMANGA"
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Razón Social</label>
                                            <input
                                                type="text"
                                                value={fiscalConfig.razon_social}
                                                onChange={e => setFiscalConfig({...fiscalConfig, razon_social: e.target.value})}
                                                placeholder="NOMBRE LEGAL DE LA EMPRESA"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección Fiscal</label>
                                            <input
                                                type="text"
                                                value={fiscalConfig.direccion}
                                                onChange={e => setFiscalConfig({...fiscalConfig, direccion: e.target.value})}
                                                placeholder="JR. HUASCAR 422..."
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono para Boletas</label>
                                            <input
                                                type="text"
                                                value={fiscalConfig.telefono}
                                                onChange={e => setFiscalConfig({...fiscalConfig, telefono: e.target.value})}
                                                placeholder="999 888 777"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mensaje en Ticket</label>
                                            <input
                                                type="text"
                                                value={fiscalConfig.mensaje_boleta}
                                                onChange={e => setFiscalConfig({...fiscalConfig, mensaje_boleta: e.target.value})}
                                                placeholder="¡Gracias por su preferencia!"
                                                className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Personalización</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Primario</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="color"
                                                    value={editConfig.color_primario}
                                                    onChange={e => setEditConfig({...editConfig, color_primario: e.target.value})}
                                                    className="h-14 w-14 rounded-none border-0 cursor-pointer p-0 overflow-hidden"
                                                />
                                                <input
                                                    type="text"
                                                    value={editConfig.color_primario}
                                                    onChange={e => setEditConfig({...editConfig, color_primario: e.target.value})}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-none px-4 py-4 text-xs font-mono uppercase text-center outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Secundario</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="color"
                                                    value={editConfig.color_secundario}
                                                    onChange={e => setEditConfig({...editConfig, color_secundario: e.target.value})}
                                                    className="h-14 w-14 rounded-none border-0 cursor-pointer p-0 overflow-hidden"
                                                />
                                                <input
                                                    type="text"
                                                    value={editConfig.color_secundario}
                                                    onChange={e => setEditConfig({...editConfig, color_secundario: e.target.value})}
                                                    className="flex-1 bg-slate-50 border border-slate-100 rounded-none px-4 py-4 text-xs font-mono uppercase text-center outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {editConfig.logo_url && (
                                        <div className="p-4 bg-slate-50 rounded-none border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Vista previa del logo</p>
                                            <img src={editConfig.logo_url} alt="Logo" className="h-16 object-contain" />
                                        </div>
                                    )}

                                    <div className="space-y-6 pt-6 border-t border-slate-100">
                                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Configuración de Delivery</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Costo Base Delivery (S/)</label>
                                                <input
                                                    type="number"
                                                    step="0.10"
                                                    value={fiscalConfig.costo_base_delivery}
                                                    onChange={e => setFiscalConfig({...fiscalConfig, costo_base_delivery: parseFloat(e.target.value) || 0})}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Costo por KM Adicional (S/)</label>
                                                <input
                                                    type="number"
                                                    step="0.10"
                                                    value={fiscalConfig.costo_por_km}
                                                    onChange={e => setFiscalConfig({...fiscalConfig, costo_por_km: parseFloat(e.target.value) || 0})}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-blue-500/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ubicación del Local (Punto A)</label>
                                            <LocationPickerMap 
                                                initialPosition={fiscalConfig.latitud && fiscalConfig.longitud ? [fiscalConfig.latitud, fiscalConfig.longitud] : null}
                                                onLocationSelect={(lat, lng) => setFiscalConfig({...fiscalConfig, latitud: lat, longitud: lng})}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-amber-50 rounded-none border border-amber-100">
                                        <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Package size={14} /> Setup Inicial
                                        </h4>
                                        <p className="text-[10px] text-amber-700 font-bold leading-relaxed mb-4">
                                            Si este es un negocio nuevo, puedes cargar los productos y categorías estándar (Pollos, Papas, etc.) con un clic.
                                        </p>
                                        <button 
                                            onClick={seedBaseProducts}
                                            disabled={saving}
                                            className="w-full py-3 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-none hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                                        >
                                            Cargar Productos Base
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-8 border-t border-slate-50">
                                <button
                                    onClick={guardarConfiguracion}
                                    disabled={saving}
                                    className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white text-[12px] font-black uppercase tracking-[0.2em] rounded-none hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} strokeWidth={3} />}
                                    Guardar Cambios del Negocio
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'impresoras' && user?.rol === 'admin' && (
                        <motion.div
                            key="impresoras"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-center bg-white p-8 border border-slate-100 rounded-none shadow-sm">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-4">
                                        <div className="w-2 h-8 bg-indigo-500 rounded-none" />
                                        Impresoras Locales (IP)
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 ml-6">Gestiona tus ticketeras de Cocina y Caja</p>
                                </div>
                                <button 
                                    onClick={() => setShowNewPrinterForm(!showNewPrinterForm)}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-none flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 group"
                                >
                                    <Plus size={18} strokeWidth={3} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] italic pr-2">Añadir Impresora</span>
                                </button>
                            </div>

                            <AnimatePresence>
                                {showNewPrinterForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-indigo-50/30 border-2 border-dashed border-indigo-100 p-10 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={newPrinter.nombre}
                                                    onChange={e => setNewPrinter({...newPrinter, nombre: e.target.value})}
                                                    placeholder="Ej: Cocina"
                                                    className="w-full bg-white border border-slate-200 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo</label>
                                                <select
                                                    value={newPrinter.tipo}
                                                    onChange={e => setNewPrinter({...newPrinter, tipo: e.target.value})}
                                                    className="w-full bg-white border border-slate-200 rounded-none px-6 py-4 text-sm font-bold italic outline-none"
                                                >
                                                    <option value="cocina">Cocina</option>
                                                    <option value="caja">Caja / Ticketera</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">IP Local</label>
                                                <input
                                                    type="text"
                                                    value={newPrinter.ip_address}
                                                    onChange={e => setNewPrinter({...newPrinter, ip_address: e.target.value})}
                                                    placeholder="192.168.1.50"
                                                    className="w-full bg-white border border-slate-200 rounded-none px-6 py-4 text-sm font-bold italic outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <button
                                                onClick={crearImpresora}
                                                disabled={saving}
                                                className="h-14 bg-indigo-600 text-white rounded-none font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                Registrar Impresora
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {impresoras.length === 0 ? (
                                    <div className="col-span-full py-20 text-center bg-white border border-slate-100 rounded-none shadow-sm">
                                        <Printer size={48} className="mx-auto mb-4 opacity-5" />
                                        <p className="text-sm font-bold text-slate-400 italic">No hay impresoras registradas en este local.</p>
                                    </div>
                                ) : (
                                    impresoras.map((printer, idx) => (
                                        <div key={printer.id || `printer-${idx}`} className="bg-white p-8 border border-slate-100 rounded-none shadow-sm group hover:shadow-xl transition-all">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className={`w-12 h-12 ${printer.tipo === 'cocina' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'} flex items-center justify-center rounded-none shadow-sm`}>
                                                    <Printer size={24} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => probarImpresora(printer)}
                                                        className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-none flex items-center justify-center transition-all shadow-sm"
                                                        title="Probar Conexión"
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => eliminarImpresora(printer.id)}
                                                        className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-none flex items-center justify-center transition-all shadow-sm"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-900 italic tracking-tight">{printer.nombre}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{printer.tipo === 'cocina' ? 'Área de Preparación' : 'Caja Principal'}</p>
                                                </div>

                                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-none bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                        <span className="text-xs font-bold text-slate-700 font-mono italic tracking-tighter">{printer.ip_address}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PORT: {printer.puerto}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-8 bg-slate-900 text-white rounded-none border border-slate-800 flex gap-6 items-start shadow-2xl">
                                <div className="w-12 h-12 bg-white/10 rounded-none flex items-center justify-center text-indigo-400 shrink-0">
                                    <Wifi size={24} />
                                </div>
                                <div>
                                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] mb-2 text-indigo-400">Guía del KODEFY PRINT WORKER</h4>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                        Para que la impresión funcione, debe haber un <span className="text-white font-bold italic">Worker</span> activo en la red local del negocio. 
                                        El Worker escucha pedidos en tiempo real y los envía a las IPs configuradas arriba.
                                    </p>
                                    <div className="flex gap-6 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-none bg-emerald-500"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Worker: ONLINE</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-none bg-indigo-500"></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Protocolo: ESC/POS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal Crear Producto */}
                <AnimatePresence>
                    {isCreatingProduct && (
                        <div key="modal-crear" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCreatingProduct(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                className="relative w-full max-w-lg bg-white rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                <div className="p-10 pb-0 shrink-0">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-4">
                                        <div className="w-2 h-8 bg-rodrigo-terracotta rounded-none" />
                                        Nuevo Producto
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 ml-6">Crea una nueva delicia para tu menú</p>
                                </div>

                                <div className="p-10 pt-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Producto</label>
                                            <input
                                                type="text"
                                                value={nuevoProducto.nombre}
                                                onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                                                placeholder="Ej: Pollo Especial KODEFY"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-slate-900 font-bold focus:border-rodrigo-terracotta/20 outline-none transition-all italic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Precio (S/)</label>
                                            <input
                                                type="number"
                                                value={nuevoProducto.precio}
                                                onChange={e => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                                                placeholder="0.00"
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-slate-900 font-bold focus:border-rodrigo-terracotta/20 outline-none transition-all italic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo</label>
                                            <select
                                                value={nuevoProducto.tipo}
                                                onChange={e => setNuevoProducto({...nuevoProducto, tipo: e.target.value as TipoProducto})}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-slate-900 font-bold outline-none italic"
                                            >
                                                <option value="pollo">Pollo</option>
                                                <option value="bebida">Bebida</option>
                                                <option value="complemento">Complemento</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Categoría</label>
                                            <select
                                                value={nuevoProducto.categoria_id}
                                                onChange={e => setNuevoProducto({...nuevoProducto, categoria_id: e.target.value})}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-slate-900 font-bold outline-none italic"
                                            >
                                                <option value="">Seleccionar categoría...</option>
                                                {categorias.map((cat, idx) => (
                                                    <option key={cat.id || `cat-${idx}`} value={cat.id}>{cat.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">URL de Imagen</label>
                                            <input
                                                type="text"
                                                value={nuevoProducto.imagen_url}
                                                onChange={e => setNuevoProducto({...nuevoProducto, imagen_url: e.target.value})}
                                                placeholder="https://images.unsplash.com/..."
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-none px-6 py-4 text-slate-900 font-bold focus:border-rodrigo-terracotta/20 outline-none transition-all italic text-xs"
                                            />
                                        </div>

                                        {nuevoProducto.tipo === 'pollo' && (
                                            <div className="col-span-2 p-6 bg-rodrigo-terracotta/5 border-2 border-rodrigo-terracotta/10 rounded-none space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-rodrigo-terracotta/10 rounded-none flex items-center justify-center">
                                                        <Package size={16} className="text-rodrigo-terracotta" />
                                                    </div>
                                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest italic">Consumo de Inventario</h4>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Descuenta Pollo?</label>
                                                        <select
                                                            value={nuevoProducto.fraccion_pollo}
                                                            onChange={e => setNuevoProducto({...nuevoProducto, fraccion_pollo: parseFloat(e.target.value)})}
                                                            className="w-full bg-white border border-rodrigo-terracotta/20 rounded-none px-4 py-3 text-sm font-bold italic outline-none"
                                                        >
                                                            <option value="0">No descuenta</option>
                                                            <option value="0.125">1/8 de Pollo</option>
                                                            <option value="0.25">1/4 de Pollo</option>
                                                            <option value="0.5">1/2 de Pollo</option>
                                                            <option value="1">1 Pollo Entero</option>
                                                        </select>
                                                    </div>
                                                    <div className="bg-white/50 rounded-none p-4 flex flex-col justify-center">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Factor de Stock</p>
                                                        <p className="text-xs font-bold text-rodrigo-terracotta italic">
                                                            {nuevoProducto.fraccion_pollo === 0 ? 'Sin impacto en inventario' : `Resta ${nuevoProducto.fraccion_pollo} unidades por cada venta`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                            {nuevoProducto.imagen_url && (
                                                <div className="mt-4 w-full h-32 rounded-none overflow-hidden border border-slate-100 shadow-inner">
                                                    <img src={nuevoProducto.imagen_url} alt="Vista previa" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                <div className="p-10 shrink-0 border-t border-slate-50 flex gap-4">
                                    <button
                                        onClick={() => setIsCreatingProduct(false)}
                                        className="flex-1 py-5 px-6 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={crearProductoNuevo}
                                        disabled={saving}
                                        className="flex-[2] py-5 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-none transition-all shadow-xl shadow-slate-900/20 hover:bg-black disabled:opacity-50 italic"
                                    >
                                        {saving ? 'Creando...' : 'Crear Producto'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Custom Confirm Modal */}
                <AnimatePresence>
                    {confirmModal.isOpen && (
                        <div key="modal-confirm" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative w-full max-w-sm bg-white rounded-none p-8 shadow-2xl border border-slate-100 overflow-hidden"
                            >
                                <div className={`w-16 h-16 rounded-none flex items-center justify-center mb-6 ${confirmModal.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                    <Info size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
                                    {confirmModal.title}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                                    {confirmModal.message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmModal.onConfirm}
                                        className={`flex-1 py-4 px-6 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg ${confirmModal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-slate-900 hover:bg-black shadow-slate-900/20'}`}
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function StockAjustePanel({ allBrands, masterStock, updateMasterStock, saving, setSaving }: { 
    allBrands: any[], 
    masterStock: Record<string, any>,
    updateMasterStock: (s: any) => Promise<any>,
    saving: boolean, 
    setSaving: (s: boolean) => void 
}) {
    const [stockHoy, setStockHoy] = useState<any>(null);
    const [editDetalle, setEditDetalle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const cargarStock = async () => {
        setLoading(true);
        try {
            const hoy = new Date().toLocaleDateString('en-CA');
            const { data, error } = await supabase
                .from('inventario_diario')
                .select('*')
                .eq('fecha', hoy)
                .single();

            if (data && !error) {
                setStockHoy(data);
                // Si hay inventario abierto, cargamos su detalle actual
                setEditDetalle(data.bebidas_detalle || {});
            } else {
                // Si no hay apertura, editamos directamente el Master Stock
                setEditDetalle(masterStock || {});
            }
        } catch (err) {
            console.error('Error cargando stock:', err);
            setEditDetalle(masterStock || {});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarStock();
    }, [masterStock]);

    const handleChange = (brandKey: string, sizeKey: string, val: string) => {
        const num = parseInt(val) || 0;
        setEditDetalle((prev: any) => ({
            ...prev,
            [brandKey]: {
                ...(prev[brandKey] || {}),
                [sizeKey]: num
            }
        }));
    };

    const guardarStock = async () => {
        setSaving(true);
        try {
            // 1. Siempre actualizamos el Master Stock (Fuente de verdad absoluta)
            const resMaster = await updateMasterStock(editDetalle);
            if (!resMaster.success) throw new Error(resMaster.message);

            // 2. Si el día está abierto, también actualizamos el inventario diario
            if (stockHoy) {
                const { error } = await supabase
                    .from('inventario_diario')
                    .update({ bebidas_detalle: editDetalle })
                    .eq('id', stockHoy.id);

                if (error) throw error;
                toast.success('Stock maestro e inventario diario actualizados');
            } else {
                toast.success('Inventario maestro actualizado (listo para apertura)');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Error al guardar stock: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando inventario...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="bg-white p-10 border border-slate-100 rounded-none shadow-sm relative overflow-hidden">
                {!stockHoy && (
                    <div className="absolute top-0 right-0 px-6 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest italic shadow-lg z-10">
                        Modo Preventivo: Editando Master Stock
                    </div>
                )}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] mb-2 italic flex items-center gap-3">
                            <div className="w-8 h-px bg-slate-900" />
                            Gestión Maestro de Bebidas
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-11">
                            {stockHoy ? 'Sincronizando con el inventario del día' : 'Actualiza el stock que se cargará en la siguiente apertura'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allBrands.map((marca, mIdx) => (
                        <div key={marca.key || `marca-${mIdx}`} className="bg-slate-50 p-6 rounded-none border border-slate-100 group hover:bg-white hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200">
                                <div className={`w-3 h-3 rounded-none ${marca.dot} shadow-sm`} />
                                <span className="text-[11px] font-black uppercase text-slate-900 tracking-tight italic">{marca.name}</span>
                            </div>
                            <div className="space-y-4">
                                {marca.sizes.map((size: any, sIdx: number) => (
                                    <div key={size.key || `size-${mIdx}-${sIdx}`} className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{size.label}</span>
                                            <span className="text-[8px] font-medium text-slate-300 uppercase">{size.desc}</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={editDetalle?.[marca.key]?.[size.key] ?? 0}
                                            onChange={(e) => handleChange(marca.key, size.key, e.target.value)}
                                            className="w-20 bg-white border-2 border-slate-100 rounded-none px-3 py-2 text-right text-xs font-black text-slate-900 outline-none focus:border-rodrigo-terracotta/40 transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-none flex items-center justify-center shadow-sm">
                            <Info size={20} />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed max-w-sm tracking-wider">
                            Los cambios realizados aquí se guardan como el inventario actual del negocio. Si el día está abierto, se sincronizarán inmediatamente.
                        </p>
                    </div>
                    <button
                        onClick={guardarStock}
                        disabled={saving}
                        className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] rounded-none shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 italic"
                    >
                        {saving && <Loader2 className="animate-spin" size={16} />}
                        Confirmar y Actualizar Todo
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default function ConfiguracionPage() {
    return (
        <ProtectedRoute requiredPermission="configuracion">
            <ConfiguracionContent />
        </ProtectedRoute>
    );
}
