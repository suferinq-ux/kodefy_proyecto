import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Download, X, Share2, Receipt, Search, User, RefreshCw, Trash2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import type { ItemCarrito, ItemVenta } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { dbUpdate } from '@/lib/supabaseApi';
import { consultarDNI, consultarRUC } from '@/services/apiPeruService';
import toast from 'react-hot-toast';

interface ReceiptModalProps {

    isOpen: boolean;
    onClose: () => void;
    items: (ItemCarrito | ItemVenta)[];
    total: number;
    orderId?: string;
    mesaNumero?: number;
    title?: string;
    isNewSale?: boolean; // Prop to control counter increment
    costoEnvio?: number;
    usuarioNombre?: string;
    metodoPago?: string;
    pagoDividido?: { efectivo?: number; yape?: number; plin?: number; tarjeta?: number };
    deliveryInfo?: { address: string; reference?: string; phone?: string; estimatedTime?: string };
    clienteNombre?: string;
    clienteDocumento?: string;
    clienteDocumentoTipo?: '1' | '6';
    clienteDireccion?: string;
    tipoComprobante?: 'TICKET' | 'BOLETA' | 'FACTURA';
}

interface ConfigNegocio {
    id?: number;
    ruc: string;
    razon_social: string;
    direccion: string;
    telefono: string;
    mensaje_boleta: string;
    serie_boleta: string;
    numero_correlativo: number;
    serie_ticket?: string;
    numero_ticket?: number;
    ciudad?: string;
}

export default function ReceiptModal({ isOpen, onClose, items, total, orderId, mesaNumero, title = 'BOLETA DE VENTA', isNewSale = false, costoEnvio = 0, usuarioNombre, metodoPago, pagoDividido, deliveryInfo, clienteNombre: initialNombre, clienteDocumento: initialDocumento, clienteDocumentoTipo: initialDocumentoTipo, clienteDireccion: initialDireccion, tipoComprobante: initialTipo = 'TICKET' }: ReceiptModalProps) {
    const { business } = useBusiness();
    const [config, setConfig] = useState<ConfigNegocio>({
        ruc: '',
        razon_social: business?.nombre || "KODEFY POS",
        direccion: '',
        telefono: '',
        mensaje_boleta: '¡Gracias por su preferencia!',
        serie_boleta: 'B001',
        serie_ticket: 'TK001',
        numero_correlativo: 1,
        numero_ticket: 1
    });

    const [numeroBoleta, setNumeroBoleta] = useState('');
    const [tipoDoc, setTipoDoc] = useState<'ticket' | 'boleta' | 'factura'>('ticket');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [numeroTicket, setNumeroTicket] = useState('');
    const [pendienteImprimir, setPendienteImprimir] = useState(false);
    const [documento, setDocumento] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDireccion, setClienteDireccion] = useState('');
    const [clienteDocumentoTipo, setClienteDocumentoTipo] = useState<'1' | '6' | undefined>(undefined);
    const [isSearching, setIsSearching] = useState(false);
    const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
    const [yaImpreso, setYaImpreso] = useState(false); // Evita sumar múltiple si le dan 2 veces a imprimir

    useEffect(() => {
        if (isOpen) {
            const tipoInicial: 'ticket' | 'boleta' | 'factura' = initialTipo === 'FACTURA' ? 'factura' : (initialTipo === 'BOLETA' ? 'boleta' : 'ticket');
            setClienteNombre(initialNombre || '');
            setDocumento(initialDocumento || '');
            setClienteDocumentoTipo(initialDocumentoTipo);
            setClienteDireccion(initialDireccion || '');
            setErrorDocumento(null);
            setYaImpreso(false);
            setTipoDoc(tipoInicial);
            cargarConfiguracion(tipoInicial);
        }
    }, [isOpen, title, initialNombre, initialDocumento, initialDocumentoTipo, initialDireccion, initialTipo]);

    const cargarConfiguracion = async (tipoOverride?: 'ticket' | 'boleta' | 'factura') => {
        try {
            if (!business?.id) return;
            
            const { data } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .eq('negocio_id', business.id)
                .maybeSingle();

            if (data) {
                if (data.nombre_negocio && data.nombre_negocio.startsWith('{')) {
                    try {
                        const extra = JSON.parse(data.nombre_negocio);
                        setConfig(prev => ({
                            ...prev,
                            ...data,
                            ...extra,
                            razon_social: extra.razon_social || data.razon_social || business.nombre
                        }));
                    } catch (e) {
                        setConfig(prev => ({
                            ...prev,
                            ...data,
                            razon_social: data.razon_social || business.nombre
                        }));
                    }
                } else {
                    setConfig(prev => ({
                        ...prev,
                        ...data,
                        razon_social: data.razon_social || business.nombre
                    }));
                }
                
                const tipoFinal = tipoOverride || tipoDoc;
                cargarNumeroVista(tipoFinal, data);
            } else {
                cargarNumeroVista(tipoOverride || tipoDoc, null);

                // Fallback de datos visuales para Pocholo's (según pedido del usuario)
                if (business.id === '880a239c-acb7-48a8-ad46-a537e2e4290f' || business.slug === 'pocholos') {
                    setConfig(prev => ({
                        ...prev,
                        ruc: '10700899948',
                        razon_social: 'POCHOLO\'S CHICKEN',
                        direccion: 'AV. INDEPENDENCIA MZA. A LOTE. 06 URB. LUIS CARRANZA AYARZA',
                        ciudad: 'AYACUCHO - HUAMANGA',
                        mensaje_boleta: '¡Gracias por su preferencia!'
                    }));
                } else {
                    setConfig(prev => ({
                        ...prev,
                        razon_social: business.nombre
                    }));
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    };

    const cargarNumeroVista = async (tipo: 'ticket' | 'boleta' | 'factura', configData: Partial<ConfigNegocio> | null) => {
        try {
            const { data: corr, error: corrError } = await supabase.rpc('consultar_correlativo', { p_negocio: business?.id, p_tipo: tipo });
            if (!corrError && corr) {
                asignarNumeroVista(tipo, corr.serie, corr.numero);
                return;
            }
        } catch (err) {
            console.error('Error consultando correlativo:', err);
        }
        const serie = tipo === 'ticket' ? (configData?.serie_ticket || 'TK001') : (tipo === 'factura' ? 'F001' : (configData?.serie_boleta || 'B001'));
        const base = tipo === 'ticket' ? (configData?.numero_ticket || 0) : (configData?.numero_correlativo || 0);
        asignarNumeroVista(tipo, serie, base);
    };

    const asignarNumeroVista = (tipo: 'ticket' | 'boleta' | 'factura', serie: string, numeroBase: number) => {
        const siguiente = numeroBase + 1;
        if (tipo === 'ticket') {
            setNumeroTicket(`${serie}-${String(siguiente).padStart(6, '0')}`);
        } else if (tipo === 'factura') {
            setNumeroFactura(`${serie}-${String(siguiente).padStart(8, '0')}`);
        } else {
            setNumeroBoleta(`${serie}-${String(siguiente).padStart(8, '0')}`);
        }
    };
    const handleDocumentSearch = async () => {
        if (documento.length !== 8 && documento.length !== 11) {
            setErrorDocumento('El documento debe tener 8 (DNI) u 11 (RUC) dígitos');
            return;
        }

        setIsSearching(true);
        setErrorDocumento(null);

        try {
            const isRUC = documento.length === 11;
            setClienteDocumentoTipo(isRUC ? '6' : '1');
            const response = isRUC ? await consultarRUC(documento) : await consultarDNI(documento);

            if (response.success && response.data) {
                setClienteNombre(response.data.nombre_completo || response.data.razon_social || '');
                const d = response.data as any;
                let dir = d.direccion_completa || d.direccion || '';
                if (d.distrito && d.provincia && d.departamento && dir) {
                    dir += ` - ${d.distrito} - ${d.provincia} - ${d.departamento}`;
                }
                setClienteDireccion(dir);
            } else {
                setErrorDocumento(response.message || `No se encontró el ${isRUC ? 'RUC' : 'DNI'}`);
                setClienteNombre('');
                setClienteDireccion('');
            }
        } catch (error) {
            setErrorDocumento('Error al consultar el documento');
            setClienteNombre('');
        } finally {
            setIsSearching(false);
        }
    };

    const clearClientData = () => {
        setDocumento('');
        setClienteNombre('');
        setClienteDireccion('');
        setClienteDocumentoTipo(undefined);
        setErrorDocumento(null);
    };



    const handlePrint = async () => {
        const esPreCuenta = title === 'ESTADO DE CUENTA';
        const debeReservar = isNewSale && !esPreCuenta && !yaImpreso;

        if (debeReservar) {
            setYaImpreso(true);
            try {
                const { data: corr, error: corrError } = await supabase.rpc('obtener_correlativo', { p_negocio: business?.id, p_tipo: tipoDoc });

                if (!corrError && corr) {
                    asignarNumeroVista(tipoDoc, corr.serie, corr.numero - 1);
                    if (orderId) {
                        await dbUpdate('ventas', {
                            comprobante_tipo: tipoDoc,
                            comprobante_serie: corr.serie,
                            comprobante_numero: corr.numero
                        }, { id: orderId });
                    }
                } else {
                    console.error('Error reservando correlativo:', corrError);
                }
            } catch (err) {
                console.error("Error inesperado al actualizar correlativo:", err);
            }
        }

        setPendienteImprimir(true);
    };

    useEffect(() => {
        if (pendienteImprimir) {
            setPendienteImprimir(false);
            window.print();
        }
    }, [pendienteImprimir]);

    useEffect(() => {
        // No hay auto-impresión USB, usamos el Worker remoto que se activa al guardar la venta
    }, [isOpen]);

    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const horaFormateada = fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const printTicketContent = (
        <div className="hidden print:block print-ticket" style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", color: '#000' }}>
            <div className="ticket-header" style={{ textAlign: 'center' }}>
                {business?.logo_url && (
                    <img src={business.logo_url} alt="Logo" style={{ width: '78px', height: '78px', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
                )}
                <p className="negocio-nombre" style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{config.razon_social}</p>
                {config.ruc && <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold' }}>RUC: {config.ruc}</p>}
                <div className="negocio-info" style={{ marginTop: 0, fontSize: '10px' }}>
                    <p>{config.direccion}</p>
                    <p>{config.ciudad || 'PERÚ'}</p>
                    {config.telefono && <p>TEL: {config.telefono}</p>}
                </div>
            </div>

            <div className="ticket-boleta-num" style={{ textAlign: 'center', marginTop: '8px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline' }}>{tipoDoc === 'boleta' ? 'BOLETA DE VENTA' : (tipoDoc === 'factura' ? 'FACTURA ELECTRÓNICA' : 'TICKET DE CONTROL INTERNO')}</p>
                <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{tipoDoc === 'ticket' ? numeroTicket : (tipoDoc === 'factura' ? numeroFactura : numeroBoleta)}</p>
            </div>

            <div className="ticket-meta" style={{ marginTop: '8px' }}>
                <div className="ticket-meta-row" style={{ fontSize: '10px' }}>
                    <span>FECHA: {fechaFormateada}</span>
                    <span>HORA: {horaFormateada}</span>
                </div>
            </div>
            {mesaNumero && (
                <div className="ticket-mesa" style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>
                    <strong>MESA: {mesaNumero}</strong>
                </div>
            )}
            {usuarioNombre && (
                <div className="ticket-usuario" style={{ fontSize: '9px', textAlign: 'center', marginTop: '2px' }}>
                    <span>ATENDIDO POR: {usuarioNombre.toUpperCase()}</span>
                </div>
            )}
            {deliveryInfo && (
                <div className="ticket-delivery" style={{ fontSize: '9px', marginTop: '8px', padding: '4px', border: '1px dashed black' }}>
                    <p><strong>DELIVERY:</strong> {deliveryInfo.address.toUpperCase()}</p>
                    {deliveryInfo.reference && <p><strong>REF:</strong> {deliveryInfo.reference.toUpperCase()}</p>}
                    {deliveryInfo.phone && <p><strong>TEL:</strong> {deliveryInfo.phone}</p>}
                </div>
            )}

            {(clienteNombre || documento) && (
                <div className="ticket-cliente" style={{ fontSize: '10px', marginTop: '8px', padding: '4px', border: '1px dashed black' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>CLIENTE:</strong> {clienteNombre?.toUpperCase() || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span><strong>{tipoDoc === 'factura' ? 'RUC' : (tipoDoc === 'boleta' ? (clienteDocumentoTipo === '6' || String(documento).length === 11 ? 'RUC' : 'DNI') : 'DOC')}:</strong> {documento}</span>
                    </div>
                    {clienteDireccion && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>DIR:</strong> {clienteDireccion.toUpperCase()}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="ticket-items-header" style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '8px', borderTop: '1px solid black', borderBottom: '1px solid black', padding: '4px 0' }}>
                <span>CANT  DESCRIPCIÓN</span>
                <span>TOTAL</span>
            </div>

            <div style={{ fontSize: '10px' }}>
                {items.map((item, idx) => {
                    const i = item as any;
                    const cantidad = Number(i.cantidad) || 0;
                    const precio = Number(i.precio) || 0;
                    const subtotal = Number(i.subtotal) || (cantidad * precio);
                        return (
                            <div key={idx} className="ticket-item" style={{ display: 'flex', flexDirection: 'column', padding: '2px 0', borderBottom: '1px dashed #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="item-cantidad" style={{ fontWeight: 'bold' }}>{cantidad} x </span>
                                    <span className="item-nombre" style={{ flex: 1, marginLeft: '4px', fontWeight: 'bold' }}>{i.nombre?.toUpperCase()}</span>
                                    <span className="item-precio" style={{ whiteSpace: 'nowrap', marginLeft: '8px', fontWeight: 'bold' }}>S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ marginLeft: '24px', fontSize: '9px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {i.detalles?.parte && (
                                        <span>PRESA: {i.detalles.parte.toUpperCase()}</span>
                                    )}
                                    {i.detalles?.trozado && i.detalles.trozado !== 'entero' && (
                                        <span> / {i.detalles.trozado.toUpperCase()}</span>
                                    )}
                                </div>
                            </div>
                        );
                })}
            </div>

            <div className="ticket-total-box" style={{ marginTop: '8px', borderTop: '2px solid black', paddingTop: '8px' }}>
                {costoEnvio > 0 && (
                    <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span>TOTAL PRODUCTOS:</span>
                        <span>S/ {(total - costoEnvio).toFixed(2)}</span>
                    </div>
                )}
                {costoEnvio > 0 && (
                    <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span>FLETE ENVIO:</span>
                        <span>S/ {costoEnvio.toFixed(2)}</span>
                    </div>
                )}
                <div className="ticket-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                    <span className="ticket-total-label">TOTAL A PAGAR:</span>
                    <span className="ticket-total-amount">S/ {total.toFixed(2)}</span>
                </div>
            </div>

            <div className="ticket-footer" style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px' }}>
                <p className="footer-mensaje">"{config.mensaje_boleta}"</p>
            </div>

            <div style={{ marginTop: '10px', borderTop: '1px dashed #333', paddingTop: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '2px' }}>KODEFY&nbsp;<span style={{ color: '#2563eb' }}>POS</span></p>
                <p style={{ margin: '2px 0 0', fontSize: '8px', letterSpacing: '1px' }}>SISTEMA DE GESTIÓN PARA TU NEGOCIO</p>
            </div>
        </div>
    );

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[96vh]"
                    >
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            {/* Selector de Comprobante */}
                            <div className="flex bg-slate-200 p-1 rounded-none mb-4">
                                <button
                                    onClick={() => {
                                        setTipoDoc('ticket');
                                        cargarConfiguracion('ticket');
                                    }}
                                    className={`flex-1 py-2 text-[10px] font-black rounded-none transition-all ${tipoDoc === 'ticket' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                >
                                    TICKET INTERNO
                                </button>
                                <button
                                    onClick={() => {
                                        setTipoDoc('boleta');
                                        cargarConfiguracion('boleta');
                                    }}
                                    className={`flex-1 py-2 text-[10px] font-black rounded-none transition-all ${tipoDoc === 'boleta' || tipoDoc === 'factura' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                >
                                    BOLETA ELECTRÓNICA
                                </button>
                            </div>

                            <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Identificación del Cliente</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={documento}
                                                onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                                placeholder="DNI (8) o RUC (11)"
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-none text-sm focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all"
                                            />
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        </div>
                                        <button
                                            onClick={handleDocumentSearch}
                                            disabled={isSearching || (documento.length !== 8 && documento.length !== 11)}
                                            className="bg-theme-secondary hover:bg-yellow-500 disabled:bg-gray-200 text-theme-primary font-bold px-3 py-2 rounded-none text-xs transition-colors flex items-center gap-1 min-w-[90px] justify-center"
                                        >
                                            {isSearching ? <RefreshCw className="animate-spin" size={14} /> : 'Consultar'}
                                        </button>
                                    </div>
                                </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-none text-[13px] text-gray-700" style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}>
                                <div className="text-center pb-3 mb-3 border-b-2 border-black">
                                    <div className="flex flex-col items-center mb-2">
                                        {business?.logo_url ? (
                                            <img src={business.logo_url} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-2" />
                                        ) : (
                                            <Receipt size={28} className="text-slate-300 mb-2" />
                                        )}
                                        <h1 className="text-base font-black uppercase leading-tight tracking-wide">{config.razon_social}</h1>
                                        {config.ruc && <p className="text-[9px] font-bold">RUC: {config.ruc}</p>}
                                        {config.direccion && <p className="text-[8px] uppercase">{config.direccion}</p>}
                                        {config.telefono && <p className="text-[8px]">TEL: {config.telefono}</p>}
                                    </div>

                                    <p className="font-black text-xs text-theme-primary tracking-widest mt-2 border-t border-slate-100 pt-2 uppercase">
                                        {tipoDoc === 'factura' ? 'Factura Electrónica' : (tipoDoc === 'boleta' ? 'Boleta de Venta' : 'Ticket de Control')}
                                    </p>
                                    <p className="font-black text-base text-slate-900 tracking-widest">
                                        {tipoDoc === 'ticket' ? numeroTicket : (tipoDoc === 'factura' ? numeroFactura : numeroBoleta)}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1">{fechaFormateada} - {horaFormateada}</p>
                                </div>

                                {(clienteNombre || documento) && (
                                    <div className="text-left mb-3 pb-2 border-b border-dashed border-slate-300 text-[10px]">
                                        {clienteNombre && <p className="font-bold leading-tight uppercase">CLIENTE: {clienteNombre}</p>}
                                        {documento && <p className="leading-tight uppercase">{clienteDocumentoTipo === '6' || documento.length === 11 ? 'RUC' : 'DNI'}: {documento}</p>}
                                        {clienteDireccion && <p className="leading-tight uppercase truncate">DIR: {clienteDireccion}</p>}
                                    </div>
                                )}

                                {deliveryInfo && (
                                    <div className="mb-4 p-2 bg-slate-50 border-l-2 border-slate-900 text-[10px] space-y-1">
                                        <p className="font-black uppercase truncate">📍 {deliveryInfo.address}</p>
                                        {deliveryInfo.reference && <p className="text-slate-500 italic">Ref: {deliveryInfo.reference}</p>}
                                        {deliveryInfo.phone && <p className="text-slate-500 font-bold">Tel: {deliveryInfo.phone}</p>}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="space-y-2">
                                        {items.map((item, idx) => {
                                            const i = item as any;
                                            const subtotal = Number(i.subtotal) || (Number(i.cantidad) * Number(i.precio)) || 0;
                                            return (
                                                <div key={idx} className="flex justify-between text-black leading-snug items-start border-b border-gray-100 py-2">
                                                    <span className="flex gap-2 font-bold">{i.cantidad} x {i.nombre?.toUpperCase()}</span>
                                                    <span className="font-black">S/ {subtotal.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t-4 border-black pt-3 mb-4">
                                    <div className="flex justify-between items-center pr-1">
                                        <span className="font-black text-base text-black uppercase tracking-tighter">TOTAL A PAGAR</span>
                                        <span className="text-xl font-black text-black">S/ {total.toFixed(2)}</span>
                                    </div>
                                    {metodoPago === 'mixto' && pagoDividido && (
                                        <div className="mt-2 space-y-1 pt-2 border-t border-dashed border-gray-200">
                                            {Object.entries(pagoDividido).filter(([,v]) => v && v > 0).map(([k,v]) => (
                                                <div key={k} className="flex justify-between text-[10px]">
                                                    <span className="capitalize font-bold text-gray-500">{k}</span>
                                                    <span className="font-black text-gray-700">S/ {(v as number).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="text-center mt-6 pt-4 border-t-2 border-black">
                                    <p className="text-[11px] leading-tight font-bold italic mb-2">"{config.mensaje_boleta}"</p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-dashed border-gray-300 text-center">
                                    <p className="text-sm font-black tracking-[2px] text-slate-800">KODEFY <span className="text-theme-primary">POS</span></p>
                                    <p className="text-[8px] font-semibold text-gray-400 tracking-widest uppercase">Sistema de gestión para tu negocio</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-white">
                            <button onClick={onClose} className="py-3 px-4 rounded-none font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                <X size={20} /> Cerrar
                            </button>
                            <button onClick={handlePrint} className="py-3 px-4 rounded-none font-bold text-white bg-theme-primary hover:bg-red-700 shadow-lg transition-all flex items-center justify-center gap-2">
                                <Printer size={20} /> Imprimir
                            </button>
                        </div>
                    </motion.div>

                    {/* El Ticket ahora se renderiza vía Portal */}
                    {mounted && printTicketContent && createPortal(printTicketContent, document.body)}

                </div>
            )}
        </AnimatePresence >
    );
}
