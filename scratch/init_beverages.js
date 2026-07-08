const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CATEGORIA_BEBIDAS_ID = 'fe4fd5ae-c14e-4ef4-95c1-73cb72ac80bf';

async function run() {
    console.log('--- Exhaustive Beverage Sync ---');

    const catalogs = [
        { nombre: 'Inca Kola', slug: 'inca_kola', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        { nombre: 'Coca Cola', slug: 'coca_cola', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        { nombre: 'Fanta', slug: 'fanta', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        { nombre: 'Sprite', slug: 'sprite', formatos: [
            { key: 'personal_retornable', label: 'Personal Ret.', precio: 3 },
            { key: 'descartable', label: 'Descartable', precio: 4 },
            { key: 'gordita', label: 'Gordita', precio: 5 },
            { key: 'litro', label: '1L', precio: 7 },
            { key: 'litro_medio', label: '1.5L', precio: 9 }
        ]},
        { nombre: 'Agua Mineral', slug: 'agua_mineral', formatos: [
            { key: 'personal', label: 'Personal', precio: 2 },
            { key: 'litro_medio', label: '1.5L', precio: 4 }
        ]},
        { nombre: 'Frugos', slug: 'frugos', formatos: [
            { key: 'un_litro', label: '1L', precio: 6 },
            { key: 'litro_medio', label: '1.5L', precio: 8 }
        ]},
        { nombre: 'Vino', slug: 'vino', formatos: [
            { key: 'queirolo', label: 'Queirolo', precio: 25 },
            { key: 'estancia', label: 'Estancia', precio: 45 }
        ]}
    ];

    // Ensure extra ones are in catalogo_bebidas
    const extraSlugs = ['frugos', 'vino'];
    for (const cat of catalogs.filter(c => extraSlugs.includes(c.slug))) {
        console.log(`Ensuring catalog entry: ${cat.nombre}`);
        const { error } = await supabase.from('catalogo_bebidas').upsert({
            nombre: cat.nombre,
            slug: cat.slug,
            dot_color: cat.slug === 'frugos' ? 'bg-orange-500' : 'bg-red-800',
            formatos: cat.formatos.map(f => ({ ...f, desc: `${cat.nombre} ${f.label}` })),
            activo: true
        }, { onConflict: 'slug' });
        if (error) console.error(`Error catalog ${cat.slug}:`, error);
    }

    // Sync Products
    for (const cat of catalogs) {
        for (const f of cat.formatos) {
            const nombre = `${cat.nombre} ${f.label}`;
            
            // Try to find by keys
            const { data: existing, error: findError } = await supabase.from('productos')
                .select('id')
                .eq('marca_gaseosa', cat.slug)
                .eq('tipo_gaseosa', f.key)
                .maybeSingle();

            if (findError) console.error(`Error searching ${nombre}:`, findError);

            if (existing) {
                console.log(`Updating product: ${nombre} -> S/ ${f.precio}`);
                const { error: upError } = await supabase.from('productos').update({
                    nombre,
                    precio: f.precio,
                    categoria_id: CATEGORIA_BEBIDAS_ID,
                    activo: true,
                    tipo: 'bebida'
                }).eq('id', existing.id);
                if (upError) console.error(`Error updating ${nombre}:`, upError);
            } else {
                console.log(`Creating product: ${nombre} -> S/ ${f.precio}`);
                const { error: inError } = await supabase.from('productos').insert({
                    nombre,
                    precio: f.precio,
                    tipo: 'bebida',
                    categoria_id: CATEGORIA_BEBIDAS_ID,
                    marca_gaseosa: cat.slug,
                    tipo_gaseosa: f.key,
                    fraccion_pollo: 0,
                    activo: true
                });
                if (inError) console.error(`Error inserting ${nombre}:`, inError);
            }
        }
    }

    console.log('--- Sync Finished ---');
}

run();
