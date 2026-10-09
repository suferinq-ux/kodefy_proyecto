import { NextResponse } from 'next/server';
import { processIncomingWhatsAppMessage } from '@/services/whatsapp-ai-agent';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { negocioId, telefonoCliente, nombreCliente, mensajeTexto, mediaUrl, mediaTipo } = body;

        if (!negocioId || !telefonoCliente) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
        }

        const response = await processIncomingWhatsAppMessage({
            negocioId,
            telefonoCliente,
            nombreCliente,
            mensajeTexto,
            mediaUrl,
            mediaTipo
        });

        return NextResponse.json({ success: true, response });

    } catch (error: any) {
        console.error('Error en Baileys Webhook:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
