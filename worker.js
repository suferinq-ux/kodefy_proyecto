const { createClient } = require('@supabase/supabase-js');
const net = require('net');

const SUPABASE_URL = 'https://okzncqmhjvsrdhluwuhx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rem5jcW1oanZzcmRobHV3dWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MDE2NCwiZXhwIjoyMDkyODE2MTY0fQ.2iI3KSEyNOZWxqUQIXOLsJjk2yuQXy2c6lZVlIglVdA';
const NEGOCIO_ID = 'cba58c29-541f-4388-83b1-ce47c66d9328';
const PRINTER_IP = process.env.PRINTER_IP || '192.168.123.100';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');
const NOMBRE_NEGOCIO = "POLLERIA CHIFA D'REYKELT";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('===========================================');
console.log('  KODEFY PRINT WORKER - ' + NOMBRE_NEGOCIO);
console.log('===========================================');
console.log('Impresora: ' + PRINTER_IP + ':' + PRINTER_PORT);
console.log('Negocio ID: ' + NEGOCIO_ID);
console.log('-------------------------------------------');

function obtenerFechaHoy() {
    var ahora = new Date();
    var peru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    var dia = String(peru.getUTCDate()).padStart(2, '0');
    var mes = String(peru.getUTCMonth() + 1).padStart(2, '0');
    var anio = peru.getUTCFullYear();
    return anio + '-' + mes + '-' + dia;
}

function obtenerFechaHora() {
    var ahora = new Date();
    var peru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    var dia = String(peru.getUTCDate()).padStart(2, '0');
    var mes = String(peru.getUTCMonth() + 1).padStart(2, '0');
    var anio = peru.getUTCFullYear();
    var hora = String(peru.getUTCHours()).padStart(2, '0');
    var min = String(peru.getUTCMinutes()).padStart(2, '0');
    return dia + '/' + mes + '/' + anio + '  ' + hora + ':' + min;
}

function repetir(caracter, veces) {
    var resultado = '';
    for (var i = 0; i < veces; i++) resultado += caracter;
    return resultado;
}

async function imprimirTicket(venta) {
    return new Promise(function(resolve, reject) {
        var client = new net.Socket();
        var ESC = '\x1b';
        var GS = '\x1d';
        var LF = '\x0a';

        var p = '';
        var isAdicional = Boolean(venta.es_adicional);

        // ====== INICIALIZAR IMPRESORA ======
        p += ESC + '@';
        p += ESC + 't' + '\x10';          // Codepage WPC1252 (soporta ñ, tildes)

        // ====== ENCABEZADO ======
        p += ESC + 'a' + '\x01';          // Centrar
        p += ESC + 'E' + '\x01';          // Bold ON
        p += GS + '!' + '\x11';           // Doble alto y ancho
        p += NOMBRE_NEGOCIO + LF;
        p += GS + '!' + '\x00';           // Normal
        p += LF;

        p += ESC + 'E' + '\x00';          // Bold OFF
        p += repetir('=', 42) + LF;

        // ====== TITULO COCINA ======
        p += ESC + 'E' + '\x01';
        p += GS + '!' + '\x11';
        p += (isAdicional ? '*** COMANDA ADICIONAL ***' : '*** COCINA ***') + LF;
        p += GS + '!' + '\x00';
        p += ESC + 'E' + '\x00';
        p += repetir('=', 42) + LF;

        // ====== FECHA Y HORA ======
        p += ESC + 'a' + '\x00';          // Izquierda
        p += 'Fecha: ' + obtenerFechaHora() + LF;

        // ====== TICKET ID ======
        p += ESC + 'E' + '\x01';
        p += 'Ticket: #' + String(venta.id).split('-')[0].toUpperCase() + LF;
        p += ESC + 'E' + '\x00';

        // ====== TIPO DE PEDIDO ======
        var tipoPedido = venta.tipo_pedido || 'mesa';
        if (tipoPedido === 'mesa') {
            p += GS + '!' + '\x11';
            p += ESC + 'E' + '\x01';
            p += 'MESA: ' + (venta.mesa_numero || '---') + LF;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
        } else if (tipoPedido === 'llevar') {
            p += GS + '!' + '\x11';
            p += ESC + 'E' + '\x01';
            p += '>> PARA LLEVAR <<' + LF;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
        } else if (tipoPedido === 'delivery') {
            p += GS + '!' + '\x11';
            p += ESC + 'E' + '\x01';
            p += '>> DELIVERY <<' + LF;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
            if (venta.direccion_envio) {
                p += 'Dir: ' + venta.direccion_envio + LF;
            }
        }

        // ====== USUARIO ======
        if (venta.usuario_nombre) {
            p += 'Atendido por: ' + venta.usuario_nombre + LF;
        }

        p += repetir('-', 42) + LF;

        // ====== ITEMS ======
        p += ESC + 'a' + '\x00';
        p += ESC + 'E' + '\x01';
        p += '  DETALLE DEL PEDIDO' + LF;
        p += ESC + 'E' + '\x00';
        p += repetir('-', 42) + LF;

        // Seleccionar items (si es adicional usar SOLO items_adicionales)
        var itemsAImprimir = (isAdicional && Array.isArray(venta.items_adicionales) && venta.items_adicionales.length > 0)
            ? venta.items_adicionales
            : (venta.items || []);

        if (Array.isArray(itemsAImprimir)) {
            itemsAImprimir.forEach(function(item, index) {
                p += ESC + 'E' + '\x01';
                p += GS + '!' + '\x01';   // Doble alto
                p += ' ' + item.cantidad + 'x ' + (item.nombre || 'Sin nombre') + LF;
                p += GS + '!' + '\x00';
                p += ESC + 'E' + '\x00';

                var detalles = item.detalles || {};
                if (detalles.parte) {
                    p += '    > Parte: ' + detalles.parte + LF;
                }
                if (detalles.trozado) {
                    p += '    > Corte: ' + detalles.trozado + LF;
                }
                if (detalles.termino) {
                    p += '    > Termino: ' + detalles.termino + LF;
                }
                if (detalles.salsa) {
                    p += '    > Salsa: ' + detalles.salsa + LF;
                }
                if (detalles.guarnicion) {
                    p += '    > Guarnicion: ' + detalles.guarnicion + LF;
                }
                if (detalles.notas || item.notas) {
                    p += ESC + 'E' + '\x01';
                    p += '    ** NOTA: ' + (detalles.notas || item.notas) + LF;
                    p += ESC + 'E' + '\x00';
                }
                if (detalles.complementos && Array.isArray(detalles.complementos)) {
                    detalles.complementos.forEach(function(comp) {
                        p += '    + ' + comp + LF;
                    });
                }

                if (index < itemsAImprimir.length - 1) {
                    p += '    ........................' + LF;
                }
            });
        }

        p += repetir('-', 42) + LF;

        // ====== NOTAS GENERALES ======
        if (venta.notas) {
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x01';
            p += 'NOTAS: ' + venta.notas + LF;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
            p += repetir('-', 42) + LF;
        }

        // ====== PIE ======
        p += ESC + 'a' + '\x01';
        p += LF;
        p += 'Impreso por KODEFY' + LF;
        p += repetir('=', 42) + LF;

        // ====== CORTAR PAPEL ======
        p += LF + LF + LF + LF;
        p += GS + 'V' + '\x41' + '\x00';

        var buffer = Buffer.from(p, 'latin1');

        client.setTimeout(5000);
        client.connect(PRINTER_PORT, PRINTER_IP, function() {
            console.log('[OK] Conectado a impresora ' + PRINTER_IP);
            client.write(buffer, function(err) {
                if (err) { client.destroy(); reject(err); }
                else { client.end(); resolve(); }
            });
        });
        client.on('error', function(err) { client.destroy(); reject(err); });
        client.on('timeout', function() { client.destroy(); reject(new Error('Timeout')); });
    });
}

// === LIMPIEZA INICIAL: Omite pendientes de días anteriores ===
async function limpiarAntiguos() {
    try {
        var hoy = obtenerFechaHoy();
        await supabase
            .from('ventas')
            .update({ estado_impresion: 'omitido' })
            .eq('negocio_id', NEGOCIO_ID)
            .eq('estado_impresion', 'pendiente')
            .lt('fecha', hoy);
        console.log('[OK] Limpieza de impresiones antiguas de días pasados completada');
    } catch (e) {
        console.log('[WARN] No se pudo limpiar antiguos: ' + e.message);
    }
}

// === POLLING: revisa solo ventas de HOY cada 5 segundos ===
async function buscarPendientes() {
    try {
        var hoy = obtenerFechaHoy();
        var result = await supabase
            .from('ventas')
            .select('*, mesas(numero, piso)')
            .eq('negocio_id', NEGOCIO_ID)
            .eq('estado_impresion', 'pendiente')
            .eq('fecha', hoy);

        var data = result.data;
        var error = result.error;

        if (error) {
            console.log('[ERROR] ' + error.message);
            return;
        }

        if (data && data.length > 0) {
            console.log('[!] ' + data.length + ' venta(s) pendiente(s) de hoy');
            for (var i = 0; i < data.length; i++) {
                var venta = data[i];

                // Formatear numero real de mesa y piso
                if (venta.mesas && venta.mesas.numero) {
                    var pisoNum = Number(venta.mesas.piso || 1);
                    var pisoTexto = '';
                    if (pisoNum === 1) pisoTexto = ' (1er PISO)';
                    else if (pisoNum === 2) pisoTexto = ' (2do PISO)';
                    else if (pisoNum === 3) pisoTexto = ' (3er PISO)';
                    else if (pisoNum === 5) pisoTexto = ' (TERRAZA)';
                    else pisoTexto = ' (PISO ' + pisoNum + ')';

                    venta.mesa_numero = venta.mesas.numero + pisoTexto;
                }

                // Si es adicional y no tiene items adicionales, se marca impreso sin enviar a la impresora
                var isAdicional = Boolean(venta.es_adicional);
                if (isAdicional && (!venta.items_adicionales || !Array.isArray(venta.items_adicionales) || venta.items_adicionales.length === 0)) {
                    console.log('[OMITIDO] Venta adicional sin nuevos items: ' + venta.id);
                    await supabase.from('ventas').update({ estado_impresion: 'impreso', es_adicional: false }).eq('id', venta.id);
                    continue;
                }

                console.log('[IMPRIMIENDO] Venta: ' + venta.id + (isAdicional ? ' (Adicional)' : ''));
                try {
                    await imprimirTicket(venta);
                    console.log('[OK] Impreso: ' + venta.id);
                    await supabase.from('ventas').update({ estado_impresion: 'impreso', es_adicional: false }).eq('id', venta.id);
                } catch (printError) {
                    console.log('[ERROR] ' + printError.message);
                    await supabase.from('ventas').update({ estado_impresion: 'error' }).eq('id', venta.id);
                }
            }
        }
    } catch (err) {
        console.log('[ERROR] ' + err.message);
    }
}

async function iniciarWorker() {
    await limpiarAntiguos();
    console.log('[OK] Worker activo. Revisando ventas de hoy cada 5 segundos...');
    setInterval(buscarPendientes, 5000);
    buscarPendientes();
}

iniciarWorker();
