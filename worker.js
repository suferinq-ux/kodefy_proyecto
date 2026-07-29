const { createClient } = require('@supabase/supabase-js');
const net = require('net');

// Configuración de Supabase
const SUPABASE_URL = 'https://okzncqmhjvsrdhluwuhx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rem5jcW1oanZzcmRobHV3dWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MDE2NCwiZXhwIjoyMDkyODE2MTY0fQ.2iI3KSEyNOZWxqUQIXOLsJjk2yuQXy2c6lZVlIglVdA';

// Configuración de Impresora
const PRINTER_IP = process.env.PRINTER_IP || '192.168.123.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');

// Variables dinámicas del Negocio
let NEGOCIO_ID = process.env.NEGOCIO_ID || null; 
let NOMBRE_NEGOCIO = "POLLERIA CHIFA D'REYKEL";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Carga el negocio_id y el nombre comercial desde la BD automáticamente en el arranque
 */
async function cargarConfiguracionNegocio() {
    try {
        const { data, error } = await supabase
            .from('configuracion_negocio')
            .select('negocio_id, nombre_negocio')
            .limit(1)
            .maybeSingle();

        if (!error && data) {
            if (data.negocio_id) {
                NEGOCIO_ID = data.negocio_id;
            }
            if (data.nombre_negocio) {
                NOMBRE_NEGOCIO = data.nombre_negocio;
            }
            console.log(`🏢 Negocio aislado detectado: "${NOMBRE_NEGOCIO}" (ID: ${NEGOCIO_ID || 'General'})`);
        }
    } catch (e) {
        console.warn('⚠️ No se pudo cargar configuracion_negocio automáticamente:', e.message);
    }
}

/**
 * Obtener la fecha actual de Perú (YYYY-MM-DD)
 */
function obtenerFechaHoy() {
    const now = new Date();
    const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('es-PE', options);
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
}

/**
 * Limpia/omite automáticamente pedidos antiguos pendientes de días anteriores de ESTE negocio
 */
async function limpiarImpresionesAntiguas() {
    try {
        const hoy = obtenerFechaHoy();
        let query = supabase
            .from('ventas')
            .update({ estado_impresion: 'omitido' })
            .eq('estado_impresion', 'pendiente')
            .lt('fecha', hoy);

        if (NEGOCIO_ID) {
            query = query.eq('negocio_id', NEGOCIO_ID);
        }

        const { error } = await query;

        if (!error) {
            console.log('🧹 Limpieza inicial: Se descartaron impresiones pendientes de días anteriores.');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo realizar la limpieza de días anteriores:', e.message);
    }
}

function generarComandaESCPOST(venta) {
    const isAdicional = Boolean(venta.es_adicional);
    
    // Si es una comanda adicional, usaremos ÚNICAMENTE items_adicionales.
    // Si no existen items_adicionales, no se imprime nada para evitar duplicar platos.
    let items = [];
    if (isAdicional) {
        items = (Array.isArray(venta.items_adicionales) && venta.items_adicionales.length > 0)
            ? venta.items_adicionales
            : [];
    } else {
        items = venta.items || [];
    }

    if (items.length === 0) {
        return null; // Retornar null si no hay ítems válidos para imprimir
    }

    const bufferArray = [];

    // Helpers ESC/POS
    const INIT = Buffer.from([0x1B, 0x40]);
    const ALIGN_CENTER = Buffer.from([0x1B, 0x61, 0x01]);
    const ALIGN_LEFT = Buffer.from([0x1B, 0x61, 0x00]);
    const BOLD_ON = Buffer.from([0x1B, 0x45, 0x01]);
    const BOLD_OFF = Buffer.from([0x1B, 0x45, 0x00]);
    const SIZE_NORMAL = Buffer.from([0x1D, 0x21, 0x00]);
    const SIZE_MEDIUM = Buffer.from([0x1D, 0x21, 0x11]); // 2x alto y ancho
    const CUT_PAPER = Buffer.from([0x1D, 0x56, 0x00]);   // Corte total
    const NEWLINE = Buffer.from('\n');

    bufferArray.push(INIT);

    // 1. Encabezado Centrado (Diseño idéntico a la ticketera original)
    bufferArray.push(ALIGN_CENTER);
    bufferArray.push(BOLD_ON);
    bufferArray.push(SIZE_MEDIUM);
    bufferArray.push(Buffer.from(`${NOMBRE_NEGOCIO.toUpperCase()}\n\n`));
    
    bufferArray.push(SIZE_NORMAL);
    bufferArray.push(Buffer.from(isAdicional ? "*** COMANDA ADICIONAL ***\n\n" : "*** COCINA ***\n\n"));
    bufferArray.push(BOLD_OFF);

    // 2. Datos del pedido
    bufferArray.push(ALIGN_LEFT);

    const fechaObj = venta.created_at ? new Date(venta.created_at) : new Date();
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const anio = fechaObj.getFullYear();
    const horas = String(fechaObj.getHours()).padStart(2, '0');
    const minutos = String(fechaObj.getMinutes()).padStart(2, '0');
    const fechaStr = `${dia}/${mes}/${anio} ${horas}:${minutos}`;

    bufferArray.push(Buffer.from(`Fecha: ${fechaStr}\n`));
    bufferArray.push(Buffer.from(`Ticket: #${venta.id.slice(0, 8).toUpperCase()}\n`));

    // Formatear Mesa y Piso (sin usar caracteres especiales ° que fallan en la ticketera)
    let mesaVal = 'PARA LLEVAR';
    if (venta.tipo_pedido === 'delivery') {
        mesaVal = 'DELIVERY';
    } else if (venta.mesas?.numero) {
        const pisoNum = Number(venta.mesas.piso || 1);
        let pisoTexto = '';
        if (pisoNum === 1) pisoTexto = ' (1er PISO)';
        else if (pisoNum === 2) pisoTexto = ' (2do PISO)';
        else if (pisoNum === 3) pisoTexto = ' (3er PISO)';
        else if (pisoNum === 5) pisoTexto = ' (TERRAZA)';
        else pisoTexto = ` (PISO ${pisoNum})`;

        mesaVal = `${venta.mesas.numero}${pisoTexto}`;
    }

    bufferArray.push(BOLD_ON);
    bufferArray.push(Buffer.from(`MESA: ${mesaVal}\n`));
    bufferArray.push(BOLD_OFF);

    const usuario = venta.usuario_nombre || 'Caja';
    bufferArray.push(Buffer.from(`Atendido por: ${usuario}\n\n`));

    // 3. Encabezado de Items
    bufferArray.push(Buffer.from("DETALLE DEL PEDIDO\n"));
    bufferArray.push(Buffer.from("----------------------------------------\n"));

    // 4. Lista de Items
    items.forEach(item => {
        bufferArray.push(BOLD_ON);
        bufferArray.push(SIZE_MEDIUM);
        bufferArray.push(Buffer.from(`${item.cantidad}x ${item.nombre}\n`));
        bufferArray.push(SIZE_NORMAL);
        bufferArray.push(BOLD_OFF);

        if (item.detalles?.parte || item.detalles?.trozado || item.detalles?.notas) {
            if (item.detalles?.parte) bufferArray.push(Buffer.from(`   Parte: ${item.detalles.parte.toUpperCase()}\n`));
            if (item.detalles?.trozado) bufferArray.push(Buffer.from(`   Corte: ${item.detalles.trozado}\n`));
            if (item.detalles?.notas) bufferArray.push(Buffer.from(`   Nota: ${item.detalles.notas}\n`));
        }
        bufferArray.push(NEWLINE);
    });

    // 5. Notas Generales
    if (venta.notas) {
        bufferArray.push(Buffer.from("----------------------------------------\n"));
        bufferArray.push(BOLD_ON);
        bufferArray.push(Buffer.from(`NOTAS: ${venta.notas}\n`));
        bufferArray.push(BOLD_OFF);
    }

    // 6. Pie de Página
    bufferArray.push(Buffer.from("----------------------------------------\n"));
    bufferArray.push(ALIGN_CENTER);
    bufferArray.push(Buffer.from("Impreso por KODEFY\n"));
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
        const hoy = obtenerFechaHoy();

        let query = supabase
            .from('ventas')
            .select('*, mesas:mesa_id(numero, piso)')
            .eq('estado_impresion', 'pendiente')
            .eq('fecha', hoy);

        if (NEGOCIO_ID) {
            query = query.eq('negocio_id', NEGOCIO_ID);
        }

        const { data: ventas, error } = await query.order('created_at', { ascending: true });

        if (error) {
            console.error('Error al consultar ventas pendientes:', error.message);
            return;
        }

        if (ventas && ventas.length > 0) {
            console.log(`[WORKER] Encontradas ${ventas.length} impresiones pendientes de hoy...`);

            for (const venta of ventas) {
                try {
                    const ticketData = generarComandaESCPOST(venta);
                    
                    if (!ticketData) {
                        console.log(`ℹ️ Pedido #${venta.id.slice(0, 8)} marcado sin adicionales.`);
                        await supabase
                            .from('ventas')
                            .update({ estado_impresion: 'impreso', es_adicional: false })
                            .eq('id', venta.id);
                        continue;
                    }

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

async function iniciarWorker() {
    console.log('🚀 Worker de Impresión Kodefy iniciado...');
    
    // 1. Obtener automáticamente el negocio_id y el nombre de la empresa desde la BD
    await cargarConfiguracionNegocio();

    console.log(`📡 Apuntando a Ticketera: ${PRINTER_IP}:${PRINTER_PORT}`);
    console.log(`📅 Fecha de Operación: ${obtenerFechaHoy()}`);
    
    // 2. Descartar automáticamente impresiones antiguas de días pasados de este negocio
    await limpiarImpresionesAntiguas();

    console.log('⏱️ Polling cada 3 segundos...');
    // 3. Polling de impresiones solo del día de hoy y de este negocio
    setInterval(procesarImpresionesPendientes, 3000);
}

iniciarWorker();
