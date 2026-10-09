import { NextResponse } from 'next/server';

const MICROSERVICE_URL = process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3001';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const negocioId = searchParams.get('negocioId');

        if (!negocioId) {
            return NextResponse.json({ error: 'Falta negocioId' }, { status: 400 });
        }

        const response = await fetch(`${MICROSERVICE_URL}/session/status/${negocioId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
            console.error('[API whatsapp/session/status] Microservicio respondió:', response.status, data);
            return NextResponse.json(
                { success: false, error: data?.error || 'Servicio de WhatsApp no disponible' },
                { status: response.ok ? 500 : response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API whatsapp/session/status] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
