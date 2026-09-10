import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = [
    'ventas',
    'inventario_diario',
    'mesas',
    'gastos',
    'configuracion_negocio',
    'productos',
    'categorias',
    'user_profiles',
    'estadisticas_productos',
    'whatsapp_config',
    'whatsapp_mensajes',
    'bebidas_config',
    'anulaciones'
];

async function getSupabaseAndVerify(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseKey) {
        throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        throw new Error('No autorizado (Falta Token)');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        throw new Error('Token inválido o expirado');
    }

    return supabase;
}

export async function POST(request: Request) {
    try {
        const supabase = await getSupabaseAndVerify(request);
        const { table, data, options } = await request.json();

        if (!table || !ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: 'Tabla no permitida o no especificada' }, { status: 400 });
        }

        const query = supabase.from(table).insert(data);
        if (options?.select) {
            query.select(options.select);
        }
        if (options?.single) {
            query.single();
        }

        const { data: result, error } = await query;

        if (error) throw error;
        return NextResponse.json({ data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: err.message?.includes('No autorizado') ? 401 : 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await getSupabaseAndVerify(request);
        const { table, data, filters, options } = await request.json();

        if (!table || !ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: 'Tabla no permitida o no especificada' }, { status: 400 });
        }

        let query = supabase.from(table).update(data);
        
        if (filters) {
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
        }

        if (options?.select) {
            query.select(options.select);
        }
        if (options?.single) {
            query.single();
        }

        const { data: result, error } = await query;

        if (error) throw error;
        return NextResponse.json({ data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: err.message?.includes('No autorizado') ? 401 : 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await getSupabaseAndVerify(request);
        const { table, filters, options } = await request.json();

        if (!table || !ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: 'Tabla no permitida o no especificada' }, { status: 400 });
        }

        let query = supabase.from(table).delete();
        
        if (filters) {
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
        }

        if (options?.select) {
            query.select(options.select);
        }
        if (options?.single) {
            query.single();
        }

        const { data: result, error } = await query;

        if (error) throw error;
        return NextResponse.json({ data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: err.message?.includes('No autorizado') ? 401 : 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await getSupabaseAndVerify(request);
        const { table, data, options } = await request.json();

        if (!table || !ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: 'Tabla no permitida o no especificada' }, { status: 400 });
        }

        const query = supabase.from(table).upsert(data, options?.onConflict ? { onConflict: options.onConflict } : undefined);
        
        if (options?.select) {
            query.select(options.select);
        }
        if (options?.single) {
            query.single();
        }

        const { data: result, error } = await query;

        if (error) throw error;
        return NextResponse.json({ data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: err.message?.includes('No autorizado') ? 401 : 500 });
    }
}
