import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { negocio_id, ...configData } = body;

        if (!negocio_id) {
            return NextResponse.json({ error: 'Falta negocio_id' }, { status: 400 });
        }

        const payload = {
            negocio_id,
            ...configData,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
            .from('whatsapp_config')
            .upsert(payload, { onConflict: 'negocio_id' })
            .select()
            .single();

        if (error) {
            console.error('[API whatsapp/config Error]:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('[API whatsapp/config Catch Error]:', err);
        return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
    }
}
