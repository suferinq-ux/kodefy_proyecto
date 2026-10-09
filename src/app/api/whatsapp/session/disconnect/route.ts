import { NextResponse } from 'next/server';

const MICROSERVICE_URL = process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3001';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { negocioId } = body;

        if (!negocioId) {
            return NextResponse.json({ error: 'Falta negocioId' }, { status: 400 });
        }

        const response = await fetch(`${MICROSERVICE_URL}/session/disconnect/${negocioId}`, {
            method: 'POST'
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
            console.error('[API whatsapp/session/disconnect] Microservicio respondió:', response.status, data);
            return NextResponse.json(
                { success: false, error: data?.error || 'Servicio de WhatsApp no disponible' },
                { status: response.ok ? 500 : response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API whatsapp/session/disconnect] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
