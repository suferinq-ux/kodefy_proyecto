const { createClient } = require('@supabase/supabase-js');
const net = require('net');

// Configuración de Supabase
const SUPABASE_URL = 'https://okzncqmhjvsrdhluwuhx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rem5jcW1oanZzcmRobHV3dWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MDE2NCwiZXhwIjoyMDkyODE2MTY0fQ.2iI3KSEyNOZWxqUQIXOLsJjk2yuQXy2c6lZVlIglVdA';

// Configuración de la Impresora de Cocina
const PRINTER_IP = process.env.PRINTER_IP || '192.168.123.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generarComandaESCPOST(venta) {
    const isAdicional = Boolean(venta.es_adicional);
    const items = (isAdicional && venta.items_adicionales && venta.items_adicionales.length > 0)
        ? venta.items_adicionales
        : (venta.items || []);

    const bufferArray = [];

    // Helpers ESC/POS
    const INIT = Buffer.from([0x1B, 0x40]);
    const ALIGN_CENTER = Buffer.from([0x1B, 0x61, 0x01]);
    const ALIGN_LEFT = Buffer.from([0x1B, 0x61, 0x00]);
    const BOLD_ON = Buffer.from([0x1B, 0x45, 0x01]);
    const BOLD_OFF = Buffer.from([0x1B, 0x45, 0x00]);
    const SIZE_NORMAL = Buffer.from([0x1D, 0x21, 0x00]);
    const SIZE_MEDIUM = Buffer.from([0x1D, 0x21, 0x11]); // 2x alto y ancho
    const SIZE_LARGE = Buffer.from([0x1D, 0x21, 0x22]);  // 3x alto y ancho
    const CUT_PAPER = Buffer.from([0x1D, 0x56, 0x00]);   // Corte total
    const NEWLINE = Buffer.from('\n');

    bufferArray.push(INIT);
    bufferArray.push(ALIGN_CENTER);
    bufferArray.push(BOLD_ON);
    bufferArray.push(SIZE_MEDIUM);
    bufferArray.push(Buffer.from("Reykelt - Brasas & Broasters\n"));
    bufferArray.push(Buffer.from(isAdicional ? "*** COMANDA ADICIONAL ***\n" : "--- COMANDA DE COCINA ---\n"));
    
    bufferArray.push(BOLD_OFF);
    bufferArray.push(SIZE_NORMAL);

    const fechaObj = venta.created_at ? new Date(venta.created_at) : new Date();
    const fechaStr = fechaObj.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    bufferArray.push(Buffer.from(`Fecha: ${fechaStr}\n`));
    bufferArray.push(Buffer.from("==========================================\n"));

    bufferArray.push(ALIGN_LEFT);
    bufferArray.push(BOLD_ON);
    bufferArray.push(SIZE_MEDIUM);

    const mesaNum = venta.mesas?.numero ? `MESA: ${venta.mesas.numero}` : (venta.tipo_pedido === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR');
    bufferArray.push(Buffer.from(`PEDIDO #${venta.id.slice(0, 8)}\n`));
    bufferArray.push(Buffer.from(`${mesaNum}\n`));
    bufferArray.push(Buffer.from("==========================================\n"));

    // Formatear Items
    items.forEach(item => {
        bufferArray.push(BOLD_ON);
        bufferArray.push(SIZE_LARGE);
        bufferArray.push(Buffer.from(`${item.cantidad}x ${item.nombre}\n`));

        if (item.detalles?.parte || item.detalles?.trozado || item.detalles?.notas) {
            bufferArray.push(SIZE_MEDIUM);
            bufferArray.push(BOLD_OFF);
            if (item.detalles?.parte) bufferArray.push(Buffer.from(`   Parte: ${item.detalles.parte}\n`));
            if (item.detalles?.trozado) bufferArray.push(Buffer.from(`   Corte: ${item.detalles.trozado}\n`));
            if (item.detalles?.notas) bufferArray.push(Buffer.from(`   NOTA: ${item.detalles.notas}\n`));
        }
        bufferArray.push(NEWLINE);
    });

    if (venta.notas) {
        bufferArray.push(SIZE_NORMAL);
        bufferArray.push(BOLD_ON);
        bufferArray.push(Buffer.from(`NOTAS GENERALES: ${venta.notas}\n`));
    }

    bufferArray.push(Buffer.from("\n\n\n"));
    bufferArray.push(CUT_PAPER);

    return Buffer.concat(bufferArray);
}

async function enviarAImpresora(buffer) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(3000);

        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            client.write(buffer, (err) => {
                if (err) {
                    client.destroy();
                    reject(err);
                } else {
                    client.end();
                    resolve();
                }
            });
        });

        client.on('error', (err) => {
            client.destroy();
            reject(err);
        });

        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Timeout al conectar con la ticketera'));
        });
    });
}

async function procesarImpresionesPendientes() {
    try {
        const { data: ventas, error } = await supabase
            .from('ventas')
            .select('*, mesas:mesa_id(numero)')
            .eq('estado_impresion', 'pendiente')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error al consultar ventas pendientes:', error.message);
            return;
        }

        if (ventas && ventas.length > 0) {
            console.log(`[WORKER] Encontradas ${ventas.length} impresiones pendientes...`);

            for (const venta of ventas) {
                try {
                    const ticketData = generarComandaESCPOST(venta);
                    await enviarAImpresora(ticketData);

                    console.log(`✅ Impresión exitosa para Pedido #${venta.id.slice(0, 8)} (${venta.es_adicional ? 'Adicional' : 'Nuevo'})`);

                    // Marcar como impreso y limpiar flag adicional
                    await supabase
                        .from('ventas')
                        .update({ estado_impresion: 'impreso', es_adicional: false })
                        .eq('id', venta.id);

                } catch (errPrint) {
                    console.error(`❌ Error al imprimir Pedido #${venta.id.slice(0, 8)}:`, errPrint.message);
                    await supabase
                        .from('ventas')
                        .update({ estado_impresion: 'error' })
                        .eq('id', venta.id);
                }
            }
        }
    } catch (err) {
        console.error('[WORKER] Error en ciclo:', err.message);
    }
}

console.log('🚀 Worker de Impresión Reykelt iniciado correctamente.');
console.log(`📡 Apuntando a Ticketera: ${PRINTER_IP}:${PRINTER_PORT}`);
console.log('⏱️ Polling cada 3 segundos...');

// Polling cada 3 segundos
setInterval(procesarImpresionesPendientes, 3000);
