const { createClient } = require('@supabase/supabase-js');
const net = require('net');

const SUPABASE_URL = 'https://okzncqmhjvsrdhluwuhx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rem5jcW1oanZzcmRobHV3dWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI0MDE2NCwiZXhwIjoyMDkyODE2MTY0fQ.2iI3KSEyNOZWxqUQIXOLsJjk2yuQXy2c6lZVlIglVdA';
const NEGOCIO_ID = process.env.NEGOCIO_ID || 'cba58c29-541f-4388-83b1-ce47c66d9328'; // Reykelt by default
const PRINTER_IP = process.env.PRINTER_IP || '192.168.18.50';
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100');
const NOMBRE_NEGOCIO = process.env.NOMBRE_NEGOCIO || "MI NEGOCIO";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ESC = '\x1b';
const GS = '\x1d';

const a = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ñÑ]/g, 'N').toUpperCase();
const pad = n => String(n).padStart(2, '0');
const fmtFecha = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtHora = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const pisoLabel = (piso) => {
    const n = Number(piso || 1);
    if (n === 1) return '1ER PISO';
    if (n === 2) return '2DO PISO';
    if (n === 3) return '3ER PISO';
    if (n === 4) return '4TO PISO';
    if (n === 5) return 'TERRAZA';
    return 'PISO ' + n;
};

const LINEA = '--------------------------------';

console.log('===========================================');
console.log('  KODEFY PRINT WORKER (COCINA) - REALTIME');
console.log('===========================================');
console.log('Impresora: ' + PRINTER_IP + ':' + PRINTER_PORT);
console.log('Negocio ID: ' + NEGOCIO_ID);
console.log('-------------------------------------------');

async function imprimirTicket(venta, itemsAImprimir, esAdicional) {
    const ahora = new Date();

    // Número REAL de mesa + su piso (venta.mesa_id es el ID interno)
    let mesaNumero = '';
    let pisoTxt = '';
    const tipo = String(venta.tipo_pedido || 'mesa').toLowerCase();
    if (tipo === 'mesa' && venta.mesa_id != null) {
        const { data: mesa } = await supabase
            .from('mesas')
            .select('numero, piso')
            .eq('id', venta.mesa_id)
            .maybeSingle();
        if (mesa) {
            mesaNumero = mesa.numero;
            pisoTxt = pisoLabel(mesa.piso);
        }
    }

    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let p = '';
        p += ESC + '@';                                    // Inicializar

        // ====== ENCABEZADO (centrado, doble) ======
        p += ESC + 'a' + '\x01';
        p += ESC + 'E' + '\x01';
        p += GS + '!' + '\x11';
        p += (NOMBRE_NEGOCIO) + '\n';
        p += GS + '!' + '\x00';
        p += ESC + 'E' + '\x00';
        p += LINEA + '\n';

        // ====== TITULO (doble) ======
        p += ESC + 'E' + '\x01';
        p += GS + '!' + '\x11';
        p += esAdicional ? '*** ADICIONAL ***\n' : '*** COMANDA ***\n';
        p += GS + '!' + '\x00';
        p += ESC + 'E' + '\x00';
        p += LINEA + '\n';

        // ====== FECHA / HORA / # ======
        p += ESC + 'a' + '\x00';
        p += `${fmtFecha(ahora)}   ${fmtHora(ahora)}\n`;
        p += `#${String(venta.id || '').split('-')[0].toUpperCase()}\n`;

        // ====== TIPO DE PEDIDO + MESA + PISO (GRANDE) ======
        if (tipo === 'delivery') {
            p += ESC + 'a' + '\x01';
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x11';
            p += 'DELIVERY\n';
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
            if (venta.telefono_envio) p += `TEL: ${venta.telefono_envio}\n`;
            if (venta.direccion_envio) p += a('DIR: ' + venta.direccion_envio) + '\n';
            p += ESC + 'a' + '\x00';
        } else if (tipo === 'llevar') {
            p += ESC + 'a' + '\x01';
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x11';
            p += 'PARA LLEVAR\n';
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
            p += ESC + 'a' + '\x00';
        } else {
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x01';                        // Doble alto, ancho normal
            p += 'TIPO: MESA\n';
            p += `MESA N: ${mesaNumero || '---'}\n`;
            p += `PISO: ${pisoTxt || '1ER PISO'}\n`;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
        }

        if (venta.usuario_nombre) p += `ATIENDE: ${a(venta.usuario_nombre)}\n`;
        p += LINEA + '\n';

        // ====== PRODUCTOS (nombre en doble alto) ======
        itemsAImprimir.forEach(item => {
            p += ESC + 'a' + '\x00';
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x01';
            p += `${item.cantidad}x ${a(item.nombre)}\n`;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';

            const det = item.detalles || {};
            const lineas = [];
            if (det.parte) lineas.push(`PRESA: ${det.parte}`);
            if (det.trozado && String(det.trozado).toLowerCase() !== 'entero') lineas.push(`TROZADO: ${det.trozado}`);
            if (det.termino) lineas.push(`TERMINO: ${det.termino}`);
            if (det.salsa) lineas.push(`SALSA: ${det.salsa}`);
            if (det.guarnicion) lineas.push(`GUARNICION: ${det.guarnicion}`);
            if (item.detalle_bebida && item.detalle_bebida.marca) {
                lineas.push(`BEBIDA: ${[item.detalle_bebida.marca, item.detalle_bebida.tipo].filter(Boolean).join(' ')}`);
            }
            lineas.forEach(l => p += `   ${a(l)}\n`);
            if (det.notas || item.notas) p += `   NOTA: ${a(det.notas || item.notas)}\n`;
            if (det.complementos && Array.isArray(det.complementos)) {
                det.complementos.forEach(c => p += `   + ${a(c)}\n`);
            }
            p += '\n';
        });

        // ====== NOTAS GENERALES ======
        if (venta.notas) {
            p += LINEA + '\n';
            p += ESC + 'E' + '\x01';
            p += GS + '!' + '\x01';
            p += `NOTA: ${a(venta.notas)}\n`;
            p += GS + '!' + '\x00';
            p += ESC + 'E' + '\x00';
        }

        // ====== PIE + CORTE ======
        p += ESC + 'a' + '\x01';
        p += LINEA + '\n';
        p += 'IMPRESO POR KODEFY POS\n';
        p += '\n\n\n\n\n';
        p += GS + 'V' + '\x41' + '\x00';

        const buffer = Buffer.from(p, 'latin1');

        client.setTimeout(3000);
        client.connect(PRINTER_PORT, PRINTER_IP, () => {
            console.log(`🔗 Conectado a la impresora ${PRINTER_IP}`);
            client.write(buffer, (err) => {
                if (err) { client.destroy(); reject(err); }
                else { client.end(); resolve(); }
            });
        });
        client.on('error', (err) => { client.destroy(); reject(err); });
        client.on('timeout', () => { client.destroy(); reject(new Error('Timeout impresora')); });
    });
}

const manejarVenta = async (payload) => {
    const venta = payload.new;
    const esUpdate = payload.eventType === 'UPDATE';

    let esAdicional = false;
    let itemsAImprimir;

    if (esUpdate) {
        // Solo imprimir cuando la app ACABA de marcar la comanda pendiente.
        // Los cobros/pagos u otros UPDATEs (pendiente -> pendiente) NO imprimen.
        const antes = payload.old || {};
        const recienPendiente = antes.estado_impresion !== 'pendiente' && venta.estado_impresion === 'pendiente';

        if (!recienPendiente) {
            console.log(`⏭️ UPDATE sin comanda nueva (${venta.id}) — no se imprime`);
            return;
        }

        esAdicional = Boolean(venta.es_adicional) && Array.isArray(venta.items_adicionales) && venta.items_adicionales.length > 0;
        itemsAImprimir = esAdicional ? venta.items_adicionales : (Array.isArray(venta.items) ? venta.items : []);
    } else {
        // INSERT: nueva venta -> imprimir comanda completa
        if (venta.estado_impresion !== 'pendiente') {
            console.log(`⏭️ Venta ${venta.id} no pendiente, se omite`);
            return;
        }
        itemsAImprimir = Array.isArray(venta.items) ? venta.items : [];
    }

    if (!itemsAImprimir.length) return;

    console.log(`🔔 ${esAdicional ? 'ADICIONAL' : 'NUEVO PEDIDO'} para imprimir:`, venta.id, esAdicional ? `(${itemsAImprimir.length} plato(s) nuevo(s))` : `(${itemsAImprimir.length} item(s))`);

    try {
        await imprimirTicket(venta, itemsAImprimir, esAdicional);
        console.log('✅ Impreso correctamente:', venta.id);
        await supabase.from('ventas').update({ estado_impresion: 'impreso' }).eq('id', venta.id);
    } catch (error) {
        console.error('❌ Error al imprimir:', error.message);
        await supabase.from('ventas').update({ estado_impresion: 'error' }).eq('id', venta.id);
    }
};

supabase
  .channel('impresion-pedidos')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas', filter: `negocio_id=eq.${NEGOCIO_ID}` }, manejarVenta)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `negocio_id=eq.${NEGOCIO_ID}` }, manejarVenta)
  .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
          console.log('🟢 Conectado al servidor. Esperando nuevas comandas y adicionales...');
      }
  });