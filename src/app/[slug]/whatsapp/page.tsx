'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { 
    Bot, 
    MessageSquare, 
    Settings2, 
    Send, 
    User, 
    ShieldCheck, 
    Smartphone, 
    ToggleLeft, 
    ToggleRight, 
    Save, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle,
    UserCheck,
    PauseCircle,
    PlayCircle,
    TestTube,
    HelpCircle,
    Info,
    KeyRound,
    CreditCard,
    QrCode,
    Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppConfigData {
    id?: string;
    negocio_id?: string;
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    verify_token: string;
    bot_activo: boolean;
    modo_delivery: boolean;
    modo_recojo: boolean;
    modo_mesa: boolean;
    modo_reserva: boolean;
    modo_antifraude_comprobante: boolean;
    nombre_asistente: string;
    mensaje_bienvenida: string;
    prompt_personalizado: string;
    costo_delivery_fijo: number;
    numero_yape_plin: string;
    nombre_titular_yape_plin: string;
    qr_yape_plin_url: string;
    datos_cuenta_bancaria: string;
}

interface ConversacionItem {
    id: string;
    telefono_cliente: string;
    nombre_cliente: string;
    estado: 'activo' | 'pausado_humano' | 'cerrado' | 'bloqueado_fraude';
    ultima_interaccion: string;
}

interface MensajeItem {
    id: string;
    emisor: 'cliente' | 'bot' | 'agente_humano';
    contenido: string;
    media_url?: string;
    created_at: string;
}

export default function WhatsAppPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { business } = useBusiness();

    const [activeTab, setActiveTab] = useState<'config' | 'chats' | 'simulator'>('simulator');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado del Formulario de Configuración
    const [config, setConfig] = useState<WhatsAppConfigData>({
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        verify_token: 'kodefy_wa_verify_secret',
        bot_activo: true,
        modo_delivery: true,
        modo_recojo: true,
        modo_mesa: true,
        modo_reserva: true,
        modo_antifraude_comprobante: true,
        nombre_asistente: 'Asistente Virtual',
        mensaje_bienvenida: '¡Hola! Bienvenid@ a nuestro negocio. 🤖¿En qué te puedo ayudar hoy?',
        prompt_personalizado: 'Eres un amable asistente de atención al cliente y toma de pedidos.',
        costo_delivery_fijo: 0.00,
        numero_yape_plin: '',
        nombre_titular_yape_plin: '',
        qr_yape_plin_url: '',
        datos_cuenta_bancaria: '',
    });

    // Estado de Chats en Vivo
    const [conversaciones, setConversaciones] = useState<ConversacionItem[]>([]);
    const [selectedConv, setSelectedConv] = useState<ConversacionItem | null>(null);
    const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    // Estado del Simulador Local
    const [simMensajeText, setSimMensajeText] = useState('Hola, quiero pedir 1 pollo con papas para llevar');
    const [simHistorial, setSimHistorial] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
        { sender: 'bot', text: '¡Hola! Soy tu asistente de prueba local. Escribe cualquier pedido para probar la IA de Kodefy sin necesidad de conectar Meta WhatsApp aún. 🚀' }
    ]);
    const [simLoading, setSimLoading] = useState(false);

    // Cargar Configuración del Negocio
    useEffect(() => {
        if (!business?.id) return;
        const businessId = business.id;

        async function loadConfig() {
            setLoading(true);
            const { data } = await supabase
                .from('whatsapp_config')
                .select('*')
                .eq('negocio_id', businessId)
                .maybeSingle();

            if (data) {
                setConfig({
                    id: data.id,
                    negocio_id: data.negocio_id,
                    phone_number_id: data.phone_number_id || '',
                    waba_id: data.waba_id || '',
                    access_token: data.access_token || '',
                    verify_token: data.verify_token || 'kodefy_wa_verify_secret',
                    bot_activo: data.bot_activo ?? true,
                    modo_delivery: data.modo_delivery ?? true,
                    modo_recojo: data.modo_recojo ?? true,
                    modo_mesa: data.modo_mesa ?? true,
                    modo_reserva: data.modo_reserva ?? true,
                    modo_antifraude_comprobante: data.modo_antifraude_comprobante ?? true,
                    nombre_asistente: data.nombre_asistente || 'Asistente Virtual',
                    mensaje_bienvenida: data.mensaje_bienvenida || '¡Hola! Bienvenid@. ¿En qué te puedo ayudar hoy?',
                    prompt_personalizado: data.prompt_personalizado || '',
                    costo_delivery_fijo: Number(data.costo_delivery_fijo || 0),
                    numero_yape_plin: data.numero_yape_plin || '',
                    nombre_titular_yape_plin: data.nombre_titular_yape_plin || '',
                    qr_yape_plin_url: data.qr_yape_plin_url || '',
                    datos_cuenta_bancaria: data.datos_cuenta_bancaria || '',
                });
            }
            setLoading(false);
        }

        loadConfig();
    }, [business?.id]);

    // Cargar Conversaciones
    useEffect(() => {
        if (!business?.id || activeTab !== 'chats') return;
        const businessId = business.id;

        async function fetchConversaciones() {
            const { data } = await supabase
                .from('whatsapp_conversaciones')
                .select('*')
                .eq('negocio_id', businessId)
                .order('ultima_interaccion', { ascending: false });

            if (data) {
                setConversaciones(data);
                if (data.length > 0 && !selectedConv) {
                    setSelectedConv(data[0]);
                }
            }
        }

        fetchConversaciones();

        // Suscripción Realtime a nuevas conversaciones
        const convChannel = supabase
            .channel(`wa_conv_${businessId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_conversaciones', filter: `negocio_id=eq.${businessId}` },
                () => {
                    fetchConversaciones();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(convChannel);
        };
    }, [business?.id, activeTab]);

    // Cargar Mensajes del Chat Seleccionado
    useEffect(() => {
        if (!selectedConv?.id) return;
        const convId = selectedConv.id;

        async function fetchMensajes() {
            const { data } = await supabase
                .from('whatsapp_mensajes')
                .select('*')
                .eq('conversacion_id', convId)
                .order('created_at', { ascending: true });

            if (data) {
                setMensajes(data);
            }
        }

        fetchMensajes();

        // Realtime para mensajes del chat actual
        const msgChannel = supabase
            .channel(`wa_msg_${convId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'whatsapp_mensajes', filter: `conversacion_id=eq.${convId}` },
                (payload) => {
                    if (payload.new) {
                        setMensajes((prev) => [...prev, payload.new as MensajeItem]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(msgChannel);
        };
    }, [selectedConv?.id]);

    // Guardar Configuración
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business?.id) return;
        const businessId = business.id;

        setSaving(true);
        try {
            const payloadCompleto = {
                negocio_id: businessId,
                phone_number_id: config.phone_number_id,
                waba_id: config.waba_id,
                access_token: config.access_token,
                verify_token: config.verify_token,
                bot_activo: config.bot_activo,
                modo_delivery: config.modo_delivery,
                modo_recojo: config.modo_recojo,
                modo_mesa: config.modo_mesa,
                modo_reserva: config.modo_reserva,
                modo_antifraude_comprobante: config.modo_antifraude_comprobante,
                nombre_asistente: config.nombre_asistente,
                mensaje_bienvenida: config.mensaje_bienvenida,
                prompt_personalizado: config.prompt_personalizado,
                costo_delivery_fijo: config.costo_delivery_fijo,
                numero_yape_plin: config.numero_yape_plin,
                nombre_titular_yape_plin: config.nombre_titular_yape_plin,
                qr_yape_plin_url: config.qr_yape_plin_url,
                datos_cuenta_bancaria: config.datos_cuenta_bancaria,
                updated_at: new Date().toISOString(),
            };

            let { error } = await supabase
                .from('whatsapp_config')
                .upsert(payloadCompleto, { onConflict: 'negocio_id' });

            if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
                // Fallback si la base de datos no tiene las nuevas columnas de pago aún
                const { numero_yape_plin, nombre_titular_yape_plin, qr_yape_plin_url, datos_cuenta_bancaria, ...payloadBasico } = payloadCompleto;
                const resFallback = await supabase
                    .from('whatsapp_config')
                    .upsert(payloadBasico, { onConflict: 'negocio_id' });

                if (!resFallback.error) {
                    toast.success('Configuración básica guardada 🚀 (Ejecuta el script SQL en Supabase para habilitar Yape/Plin)');
                    return;
                }
            }

            if (error) throw error;

            toast.success('Configuración de WhatsApp guardada con éxito 🚀');
        } catch (err: any) {
            console.error(err);
            toast.error('Error al guardar configuración: ' + (err.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    };

    // Ejecutar Simulador Local de IA
    const handleRunSimulator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!simMensajeText.trim() || !business?.id) return;

        const userText = simMensajeText;
        setSimMensajeText('');
        setSimHistorial((prev) => [...prev, { sender: 'user', text: userText }]);
        setSimLoading(true);

        try {
            const res = await fetch('/api/whatsapp/test-simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    negocioId: business.id,
                    mensajeTexto: userText,
                    telefonoCliente: '+51999888777',
                    nombreCliente: 'Cliente Demo Local',
                }),
            });

            const data = await res.json();
            if (data.respuestaBot) {
                setSimHistorial((prev) => [...prev, { sender: 'bot', text: data.respuestaBot }]);
            } else {
                setSimHistorial((prev) => [...prev, { sender: 'bot', text: 'Error al simular la respuesta de IA.' }]);
            }
        } catch (err: any) {
            toast.error('Error en el simulador: ' + err.message);
        } finally {
            setSimLoading(false);
        }
    };

    // Manejar pegado de imagen desde el portapapeles (Ctrl + V)
    const handlePasteImage = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        setSimMensajeText(base64);
                        toast.success('📷 Imagen pegada desde el portapapeles (Ctrl + V)');
                    };
                    reader.readAsDataURL(blob);
                    e.preventDefault();
                    break;
                }
            }
        }
    };

    // Bloquear número telefónico por fraude
    const handleBlockFraud = async () => {
        if (!selectedConv || !business?.id) return;
        if (!confirm(`¿Estás seguro de bloquear el número ${selectedConv.telefono_cliente} por intento de fraude?`)) return;

        try {
            const { error } = await supabase
                .from('whatsapp_blacklist')
                .upsert({
                    negocio_id: business.id,
                    telefono_cliente: selectedConv.telefono_cliente,
                    motivo: 'Intento de comprobante falso o fraude',
                    bloqueado_por: 'cajero_dashboard',
                }, { onConflict: 'negocio_id,telefono_cliente' });

            if (error) throw error;

            toast.success(`Número ${selectedConv.telefono_cliente} bloqueado exitosamente en Lista Negra 🚫`);
            setSelectedConv({ ...selectedConv, estado: 'bloqueado_fraude' });
        } catch (err: any) {
            toast.error('Error al bloquear número: ' + err.message);
        }
    };

    // Alternar control humano/IA
    const toggleEstadoConversacion = async () => {
        if (!selectedConv) return;
        const nuevoEstado = selectedConv.estado === 'pausado_humano' ? 'activo' : 'pausado_humano';

        const { error } = await supabase
            .from('whatsapp_conversaciones')
            .update({ estado: nuevoEstado })
            .eq('id', selectedConv.id);

        if (!error) {
            setSelectedConv({ ...selectedConv, estado: nuevoEstado });
            setConversaciones((prev) =>
                prev.map((c) => (c.id === selectedConv.id ? { ...c, estado: nuevoEstado } : c))
            );
            toast.success(nuevoEstado === 'pausado_humano' ? 'Control Humano activado (IA pausada)' : 'IA reactivada para este chat');
        }
    };

    // Enviar mensaje humano manual
    const handleSendManualMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoMensaje.trim() || !selectedConv || !config.phone_number_id || !config.access_token) {
            if (!config.phone_number_id || !config.access_token) {
                toast.error('Configura las credenciales de WhatsApp en la pestaña de Configuración primero.');
            }
            return;
        }

        setSendingMsg(true);
        try {
            const { error } = await supabase
                .from('whatsapp_mensajes')
                .insert({
                    conversacion_id: selectedConv.id,
                    negocio_id: business?.id,
                    emisor: 'agente_humano',
                    contenido: nuevoMensaje,
                });

            if (error) throw error;

            await fetch(`https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: selectedConv.telefono_cliente,
                    type: 'text',
                    text: { body: nuevoMensaje },
                }),
            });

            setNuevoMensaje('');
        } catch (err: any) {
            toast.error('Error al enviar mensaje: ' + err.message);
        } finally {
            setSendingMsg(false);
        }
    };

    // Control de vista: Activar para mostrar únicamente la pantalla limpia "En Desarrollo" al cliente final
    const MODO_EN_DESARROLLO_OCULTO = true;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                <p className="mt-4 text-sm text-slate-500 font-medium">Cargando Agente IA WhatsApp...</p>
            </div>
        );
    }

    if (MODO_EN_DESARROLLO_OCULTO) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
                <div className="bg-white max-w-xl w-full p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-100">
                        <Bot size={44} />
                    </div>
                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-3.5 py-1 rounded-full uppercase tracking-widest">
                            🚧 MÓDULO EN DESARROLLO
                        </span>
                        <h1 className="text-2xl font-black text-slate-900 pt-2">Agente IA de Ventas por WhatsApp</h1>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            Estamos preparando una increíble integración de Inteligencia Artificial para la toma de pedidos, catálogo interactivo y validación de pagos en tiempo real.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium">
                        ✨ Próximamente disponible en tu panel de Kodefy.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Banner En Desarrollo */}
            <div className="bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-between gap-3 shadow-sm border border-amber-400">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🚧</span>
                    <span>MÓDULO EN DESARROLLO (MODO BETA LOCAL)</span>
                </div>
                <span className="bg-slate-950 text-amber-400 px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-mono font-black">
                    En Desarrollo
                </span>
            </div>

            {/* Banner Informativo Explicativo */}
            <div className="bg-blue-900 text-white p-5 rounded-2xl shadow-md border border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-800/80 rounded-xl text-blue-200 shrink-0">
                        <KeyRound size={24} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            💡 ¿Qué debes poner en esta pantalla?
                        </h2>
                        <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                            <strong>1. La clave de IA (Gemini) es CENTRAL:</strong> Tus clientes <u>NO</u> tienen que poner ninguna API key de Gemini. Kodefy la administra automáticamente.<br />
                            <strong>2. Credenciales de WhatsApp Business:</strong> Son los códigos que Meta te otorga cuando registras el número telefónico del negocio en Meta Developers. Para probar en tu computadora hoy mismo, usa el tab <strong>"Probador de IA Local"</strong> sin necesidad de credenciales.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setActiveTab('simulator')}
                    className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                    <TestTube size={16} /> Probar IA Ahora Mismo
                </button>
            </div>

            {/* Header Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-100">
                        <Bot size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-slate-900">Agente IA de Ventas por WhatsApp</h1>
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-200 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                🚧 EN DESARROLLO
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                                <Sparkles size={12} /> Powered by Gemini
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Atención 24/7, catálogo interactivo, cálculo de pedidos y validación de pagos en tiempo real.
                        </p>
                    </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('simulator')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'simulator' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <TestTube size={16} /> Probador de IA (Local)
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'config' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <Settings2 size={16} /> Configuración Meta
                    </button>
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'chats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <MessageSquare size={16} /> Chats en Vivo ({conversaciones.length})
                    </button>
                </div>
            </div>

            {/* Pestaña: PROBADOR / SIMULADOR LOCAL (Para probar YA mismo sin Meta) */}
            {activeTab === 'simulator' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <TestTube className="text-emerald-600" size={20} /> Simulador de Chat de WhatsApp en Vivo
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Pruebas locales: Escribe cualquier mensaje como si fueras un cliente en WhatsApp. La IA responderá consultando los productos reales de tu negocio.
                            </p>
                        </div>
                        <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                            Modo Sandbox Activo
                        </span>
                    </div>

                    {/* Chat Box del Simulador */}
                    <div className="bg-[#f0f2f5] rounded-2xl p-4 border border-slate-200 min-h-[380px] max-h-[500px] overflow-y-auto space-y-3">
                        {simHistorial.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs shadow-xs ${
                                        msg.sender === 'user'
                                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                                            : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                                    }`}
                                >
                                    {msg.text.startsWith('data:image/') ? (
                                        <div className="space-y-1">
                                            <span className="block text-[10px] text-slate-500 font-semibold mb-1">📷 Imagen de Comprobante Enviada:</span>
                                            <img
                                                src={msg.text}
                                                alt="Comprobante subido"
                                                className="max-w-[200px] max-h-[220px] rounded-xl border border-slate-200 object-cover shadow-xs"
                                            />
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {simLoading && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl w-fit">
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-900"></div>
                                <span>La IA de Kodefy está pensando...</span>
                            </div>
                        )}
                    </div>

                    {/* Formulario de Entrada del Simulador con Adjunto de Foto */}
                    <form onSubmit={handleRunSimulator} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-slate-900 focus-within:bg-white">
                            <input
                                type="text"
                                value={simMensajeText.startsWith('data:image/') ? '📷 [Imagen cargada desde portapapeles/archivo]' : simMensajeText}
                                onChange={(e) => setSimMensajeText(e.target.value)}
                                onPaste={handlePasteImage}
                                placeholder="Ej: Hola, o pega tu captura de Yape con Ctrl + V..."
                                className="flex-1 bg-transparent py-1.5 text-xs focus:outline-none"
                            />
                            <label className="cursor-pointer p-2 hover:bg-slate-200 text-slate-600 rounded-lg transition-all" title="Subir Captura de Pago de Prueba">
                                <ImageIcon size={18} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const base64 = event.target?.result as string;
                                                setSimMensajeText(base64);
                                                toast.success('Imagen de comprobante adjuntada. Haz clic en Probar.');
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={simLoading || !simMensajeText.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Send size={16} /> Probar Mensaje / Foto
                        </button>
                    </form>
                </div>
            )}

            {/* Pestaña: Configuración Meta WhatsApp */}
            {activeTab === 'config' && (
                <form onSubmit={handleSaveConfig} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Guía Explicativa sobre Meta */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <Info size={16} className="text-amber-700" /> ¿Cómo conectar el WhatsApp real de un negocio?
                            </h3>
                            <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-amber-800">
                                <li>Crear una cuenta en <strong>developers.facebook.com</strong> y activar el producto <em>WhatsApp Cloud API</em>.</li>
                                <li>Ingresar el <strong>Phone Number ID</strong> y <strong>WABA Account ID</strong> asignados a la línea telefónica del cliente.</li>
                                <li>Generar el <strong>Permanent Access Token</strong> en Meta Business Manager para permitir a Kodefy enviar respuestas automáticas.</li>
                            </ol>
                        </div>

                        {/* Credenciales de Meta Cloud API */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Smartphone size={18} className="text-blue-600" /> Credenciales WhatsApp Business (Meta API)
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number ID (Meta)</label>
                                    <input
                                        type="text"
                                        value={config.phone_number_id}
                                        onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                                        placeholder="Ej: 109876543210985"
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">WABA Account ID (Meta)</label>
                                    <input
                                        type="text"
                                        value={config.waba_id}
                                        onChange={(e) => setConfig({ ...config, waba_id: e.target.value })}
                                        placeholder="Ej: 100987654321"
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Permanent Access Token (Meta)</label>
                                    <input
                                        type="password"
                                        value={config.access_token}
                                        onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                                        placeholder="EAA..."
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* URL del Webhook para Meta */}
                        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-xs">
                            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                                <KeyRound size={16} className="text-emerald-400" /> URL de Webhook y Token de Verificación (Meta Developer)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="block text-[10px] text-slate-400 mb-1">URL del Webhook Meta:</span>
                                    <div className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto">
                                        <span className="truncate">https://kodefy.app/api/whatsapp/webhook</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText('https://kodefy.app/api/whatsapp/webhook');
                                                toast.success('URL del Webhook copiada 🚀');
                                            }}
                                            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-sans ml-auto shrink-0"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 mb-1">Verify Token secreto:</span>
                                    <div className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto">
                                        <span>{config.verify_token || 'kodefy_wa_verify_secret'}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(config.verify_token || 'kodefy_wa_verify_secret');
                                                toast.success('Verify Token copiado 🚀');
                                            }}
                                            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-sans ml-auto shrink-0"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personalidad del Bot */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Sparkles size={18} className="text-amber-500" /> Personalidad y Mensajes del Bot
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Asistente</label>
                                    <input
                                        type="text"
                                        value={config.nombre_asistente}
                                        onChange={(e) => setConfig({ ...config, nombre_asistente: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Costo Fijo de Delivery ($)</label>
                                    <input
                                        type="number"
                                        step="0.50"
                                        value={config.costo_delivery_fijo}
                                        onChange={(e) => setConfig({ ...config, costo_delivery_fijo: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Mensaje de Bienvenida Inicial</label>
                                    <textarea
                                        rows={2}
                                        value={config.mensaje_bienvenida}
                                        onChange={(e) => setConfig({ ...config, mensaje_bienvenida: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Instrucciones Especiales / Prompt</label>
                                    <textarea
                                        rows={3}
                                        value={config.prompt_personalizado}
                                        onChange={(e) => setConfig({ ...config, prompt_personalizado: e.target.value })}
                                        placeholder="Ej: Somos una pollería familiar. Ofrece promociones del día y recuerda a los clientes pedir las cremas caseras."
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Datos de Pago (Yape / Plin / Cuentas Bancarias) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <CreditCard size={18} className="text-purple-600" /> Datos de Pago para el Cliente (Yape / Plin / Cuentas)
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Número de Yape / Plin</label>
                                    <input
                                        type="text"
                                        value={config.numero_yape_plin}
                                        onChange={(e) => setConfig({ ...config, numero_yape_plin: e.target.value })}
                                        placeholder="Ej: 987 654 321"
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Titular (Yape/Plin)</label>
                                    <input
                                        type="text"
                                        value={config.nombre_titular_yape_plin}
                                        onChange={(e) => setConfig({ ...config, nombre_titular_yape_plin: e.target.value })}
                                        placeholder="Ej: Juan Pérez / Pollería El Rey S.A.C."
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Datos de Cuentas Bancarias / CCI (Opcional)</label>
                                    <textarea
                                        rows={2}
                                        value={config.datos_cuenta_bancaria}
                                        onChange={(e) => setConfig({ ...config, datos_cuenta_bancaria: e.target.value })}
                                        placeholder="Ej: BCP Cta Cte: 193-12345678-0-99 | CCI: 002-193-0012345678099-12"
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">URL / Imagen del Código QR (Opcional)</label>
                                    <input
                                        type="text"
                                        value={config.qr_yape_plin_url}
                                        onChange={(e) => setConfig({ ...config, qr_yape_plin_url: e.target.value })}
                                        placeholder="https://tudominio.com/qr-yape.png"
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna 3: Interruptores y Modos Operativos */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <ShieldCheck size={18} className="text-emerald-600" /> Modos y Filtros Antifraude
                            </h2>

                            <div className="space-y-3">
                                {/* Bot Activo */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Estado del Bot</p>
                                        <p className="text-[11px] text-slate-500">Respuesta automática activada</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, bot_activo: !config.bot_activo })}
                                        className="text-slate-800"
                                    >
                                        {config.bot_activo ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                                    </button>
                                </div>

                                {/* Modo Delivery */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">🛵 Atender Delivery</p>
                                        <p className="text-[11px] text-slate-500">Acepta pedidos a domicilio</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, modo_delivery: !config.modo_delivery })}
                                    >
                                        {config.modo_delivery ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                                    </button>
                                </div>

                                {/* Modo Recojo */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">🛍️ Atender Recojo en Tienda</p>
                                        <p className="text-[11px] text-slate-500">Pedidos para llevar sin cola</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, modo_recojo: !config.modo_recojo })}
                                    >
                                        {config.modo_recojo ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                                    </button>
                                </div>

                                {/* Modo Mesa */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">🪑 Atender Pedidos en Mesa</p>
                                        <p className="text-[11px] text-slate-500">Pedidos con QR en mesa</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, modo_mesa: !config.modo_mesa })}
                                    >
                                        {config.modo_mesa ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                                    </button>
                                </div>

                                {/* Antifraude OCR Comprobante */}
                                <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950">🛡️ Antifraude Comprobantes</p>
                                        <p className="text-[11px] text-emerald-700">Exigir foto de pago con validación OCR</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, modo_antifraude_comprobante: !config.modo_antifraude_comprobante })}
                                    >
                                        {config.modo_antifraude_comprobante ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-slate-400" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50"
                            >
                                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Pestaña: Chats en Vivo */}
            {activeTab === 'chats' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-3 min-h-[600px] overflow-hidden">
                    {/* Lista de Conversaciones */}
                    <div className="border-r border-slate-100 flex flex-col bg-slate-50/50">
                        <div className="p-4 border-b border-slate-100 bg-white">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Conversaciones Recientes</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {conversaciones.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    No hay conversaciones registradas aún por WhatsApp.
                                </div>
                            ) : (
                                conversaciones.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConv(conv)}
                                        className={`w-full text-left p-4 hover:bg-slate-100/80 transition-all flex items-start gap-3 ${
                                            selectedConv?.id === conv.id ? 'bg-white shadow-xs border-l-4 border-slate-900' : ''
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                            <User size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-slate-900 truncate">{conv.nombre_cliente || conv.telefono_cliente}</p>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(conv.ultima_interaccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{conv.telefono_cliente}</p>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                {conv.estado === 'pausado_humano' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        <PauseCircle size={10} /> Control Humano
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        <Bot size={10} /> Atendiendo con IA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Visor de Chat Historial e Intervención */}
                    <div className="md:col-span-2 flex flex-col h-full bg-white">
                        {selectedConv ? (
                            <>
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                                            {selectedConv.nombre_cliente?.[0] || 'C'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">{selectedConv.nombre_cliente || 'Cliente'}</p>
                                            <p className="text-[11px] font-mono text-slate-500">{selectedConv.telefono_cliente}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleBlockFraud}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
                                            title="Bloquear este número por intento de fraude"
                                        >
                                            <AlertCircle size={15} /> Bloquear (Fraude)
                                        </button>
                                        <button
                                            onClick={toggleEstadoConversacion}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                                selectedConv.estado === 'pausado_humano'
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                            }`}
                                        >
                                            {selectedConv.estado === 'pausado_humano' ? (
                                                <>
                                                    <PlayCircle size={15} /> Reactivar Bot IA
                                                </>
                                            ) : (
                                                <>
                                                    <PauseCircle size={15} /> Intervenir (Tomar Control Humano)
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc] max-h-[420px]">
                                    {mensajes.map((m) => {
                                        const isClient = m.emisor === 'cliente';
                                        return (
                                            <div key={m.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                                                <div
                                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                                                        isClient
                                                            ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                                            : m.emisor === 'bot'
                                                            ? 'bg-emerald-700 text-white rounded-tr-none'
                                                            : 'bg-blue-600 text-white rounded-tr-none'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1 mb-1 opacity-80 text-[10px] font-semibold">
                                                        {isClient ? (
                                                            <span>Cliente</span>
                                                        ) : m.emisor === 'bot' ? (
                                                            <span className="flex items-center gap-1"><Bot size={10} /> IA Bot</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1"><UserCheck size={10} /> Operador Humano</span>
                                                        )}
                                                    </div>
                                                    {m.contenido.startsWith('data:image/') || m.media_url ? (
                                                        <div className="space-y-1 my-1">
                                                            <img
                                                                src={m.media_url || m.contenido}
                                                                alt="Adjunto de WhatsApp"
                                                                className="max-w-[200px] max-h-[220px] rounded-xl border border-slate-200 object-cover shadow-xs"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap leading-relaxed">{m.contenido}</p>
                                                    )}
                                                    <span className="block text-[9px] text-right mt-1 opacity-70">
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={handleSendManualMessage} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
                                    <input
                                        type="text"
                                        value={nuevoMensaje}
                                        onChange={(e) => setNuevoMensaje(e.target.value)}
                                        placeholder={
                                            selectedConv.estado === 'pausado_humano'
                                                ? 'Escribe tu respuesta humana directamente al cliente...'
                                                : 'Escribe para enviar mensaje (La IA se pausará automáticamente)...'
                                        }
                                        className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingMsg || !nuevoMensaje.trim()}
                                        className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-all disabled:opacity-40"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-xs">
                                <MessageSquare size={32} className="mb-2 opacity-50" />
                                Selecciona una conversación para ver el chat en vivo.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
