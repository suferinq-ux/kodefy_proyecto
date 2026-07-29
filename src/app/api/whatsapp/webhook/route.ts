import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppTextMessage, markWhatsAppMessageAsRead } from '@/lib/whatsapp';
import { processIncomingWhatsAppMessage } from '@/services/whatsapp-ai-agent';

/**
 * GET /api/whatsapp/webhook
 * Validación de Webhook requerida por Meta Cloud API
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
        // Verificar si el token coincide con algún negocio configurado o el token maestro
        const { data: config } = await supabaseAdmin
            .from('whatsapp_config')
            .select('verify_token')
            .eq('verify_token', token)
            .maybeSingle();

        const DEFAULT_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kodefy_wa_verify_secret';

        if (config || token === DEFAULT_VERIFY_TOKEN) {
            console.log('[WhatsApp Webhook] Verificación de Meta exitosa!');
            return new NextResponse(challenge, { status: 200 });
        }
    }

    return new NextResponse('Error de verificación', { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Recepción y procesamiento multi-tenant de mensajes en tiempo real
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Estructura de evento de Meta WhatsApp Cloud API
        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0]?.value;

        if (!change || !change.messages || change.messages.length === 0) {
            // Es una notificación de estado (entregado, leído, etc.)
            return NextResponse.json({ status: 'ignored' }, { status: 200 });
        }

        const metadata = change.metadata;
        const phoneNumberId = metadata?.phone_number_id; // Identificador del canal del negocio receptante
        const message = change.messages[0];
        const from = message.from; // Número de WhatsApp del cliente
        const messageId = message.id;
        const contactName = change.contacts?.[0]?.profile?.name || 'Cliente WhatsApp';

        if (!phoneNumberId || !from) {
            return NextResponse.json({ status: 'missing_identifiers' }, { status: 200 });
        }

        // 1. Identificar a qué INQUILINO (negocio_id) pertenece este phone_number_id
        const { data: config, error: configErr } = await supabaseAdmin
            .from('whatsapp_config')
            .select('*')
            .eq('phone_number_id', phoneNumberId)
            .maybeSingle();

        if (configErr || !config) {
            console.warn(`[WhatsApp Webhook] Mensaje recibido para phone_number_id ${phoneNumberId} sin negocio asignado en Kodefy.`);
            return NextResponse.json({ status: 'tenant_not_found' }, { status: 200 });
        }

        const negocioId = config.negocio_id;
        const accessToken = config.access_token;

        // 2. Marcar mensaje entrante como leído en el teléfono del cliente (doble check azul)
        if (accessToken) {
            markWhatsAppMessageAsRead(phoneNumberId, accessToken, messageId);
        }

        // 3. Extraer contenido del mensaje (Texto, Imagen, etc.)
        let mensajeTexto = '';
        let mediaUrl = '';
        let mediaTipo = '';

        if (message.type === 'text') {
            mensajeTexto = message.text?.body || '';
        } else if (message.type === 'image') {
            mensajeTexto = message.image?.caption || '[Imagen enviada]';
            mediaUrl = message.image?.id || '';
            mediaTipo = 'imagen';
        } else if (message.type === 'interactive') {
            mensajeTexto = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
        } else {
            mensajeTexto = `[Mensaje de tipo ${message.type}]`;
        }

        // 4. Procesar el mensaje con el Agente de IA para este negocio
        const resIA = await processIncomingWhatsAppMessage({
            negocioId,
            telefonoCliente: from,
            nombreCliente: contactName,
            mensajeTexto,
            mediaUrl,
            mediaTipo,
        });

        // 5. Enviar la respuesta del Bot al WhatsApp del cliente
        if (resIA.respondió && resIA.mensajeRespuesta && accessToken) {
            await sendWhatsAppTextMessage({
                phoneNumberId,
                accessToken,
                to: from,
                text: resIA.mensajeRespuesta,
            });
        }

        return NextResponse.json({ status: 'success' }, { status: 200 });
    } catch (error) {
        console.error('[WhatsApp Webhook Error]:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
