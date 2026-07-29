import { NextRequest, NextResponse } from 'next/server';
import { processIncomingWhatsAppMessage } from '@/services/whatsapp-ai-agent';

/**
 * POST /api/whatsapp/test-simulate
 * Endpoint de prueba local para simular mensajes de clientes en WhatsApp sin necesitar credenciales de Meta
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { negocioId, mensajeTexto, telefonoCliente = '+51999888777', nombreCliente = 'Cliente de Prueba' } = body;

        if (!negocioId || !mensajeTexto) {
            return NextResponse.json({ error: 'Faltan parámetros negocioId o mensajeTexto' }, { status: 400 });
        }

        const resIA = await processIncomingWhatsAppMessage({
            negocioId,
            telefonoCliente,
            nombreCliente,
            mensajeTexto,
        });

        return NextResponse.json({
            success: true,
            respondió: resIA.respondió,
            respuestaBot: resIA.mensajeRespuesta || 'El bot está desactivado en la configuración.',
        });
    } catch (error: any) {
        console.error('[WhatsApp Test Simulate Error]:', error);
        return NextResponse.json({ error: error?.message || 'Internal Error' }, { status: 500 });
    }
}
