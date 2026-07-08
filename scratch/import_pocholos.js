const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const negocioId = '880a239c-acb7-48a8-ad46-a537e2e4290f';
const catPollos = '4b86cf0c-38ec-4653-93d8-da577352e28e';
const catComplementos = '8ac5f4d9-0d11-40f1-b614-d2560966bb99';
const catBebidas = 'c70b0279-df2c-49d4-aee9-3aa6cbeda409';

const productos = [
  { nombre: 'Maracuyá Vaso', precio: 3, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Chaufa Brasa a lo Pobre Junior', precio: 16, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Chicha Morada 1L', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Santiago Queirolo', precio: 27, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Taper mediano', precio: 0.5, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Chicha Morada Vaso', precio: 3, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Chaufa Brasa a lo Pobre King', precio: 25, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: 'Maracuyá Jarra', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Chori Brasa King', precio: 22, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: 'Porción de Arroz Blanco', precio: 4, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Pollo a la Plancha', precio: 22, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Gordita Inca Kola', precio: 5, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Porción de Papas Fritas', precio: 5, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Salchi Brasa King', precio: 23, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: '1/4 de Pollo a la Brasa', precio: 20, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: 'Salchipapa Simple', precio: 10, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Chicha Morada 1/2L', precio: 6, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Cusqueña Trigo 310mL', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Taper Personal', precio: 1, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Pollo Entero + Chicha 1L', precio: 73, tipo: 'promocion', fraccion_pollo: 1, categoria_id: catPollos },
  { nombre: 'Mostrazo', precio: 22, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: 'Vino Intipalka', precio: 38, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Vino Tabernero', precio: 29, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Cuarto Anticuchero', precio: 25, tipo: 'pollo', fraccion_pollo: 0.25, categoria_id: catPollos },
  { nombre: 'Brasa Kids', precio: 13, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Pollo Entero + Gaseosa 1.5L', precio: 76, tipo: 'promocion', fraccion_pollo: 1, categoria_id: catPollos },
  { nombre: 'Salchi Brasa Junior', precio: 15, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: '1/8 de Pollo a la Brasa', precio: 11, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Vino Casillero del Diablo', precio: 55, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 2L', precio: 8, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Trilogía Pocholos', precio: 18, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Gaseosa Personal Coca Cola', precio: 2.5, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 625ml Inca Kola', precio: 4, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa Personal Inca Kola', precio: 2.5, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 625ml Coca Cola', precio: 4, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Agua Mineral', precio: 3, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 500ml', precio: 3, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Chaufa de Pollo', precio: 12, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Salchipapa Especial', precio: 14, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Heineken 330mL', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Corona 355mL', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Combo: Pollo Entero + 1/4 Pollo (Solo)', precio: 82, tipo: 'promocion', fraccion_pollo: 1.25, categoria_id: catPollos },
  { nombre: 'Pollo Entero Solo', precio: 45, tipo: 'pollo', fraccion_pollo: 1, categoria_id: catPollos },
  { nombre: 'Saltado de Pollo', precio: 20, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Chori Brasa Junior', precio: 13, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Mostrito', precio: 13, tipo: 'pollo', fraccion_pollo: 0.125, categoria_id: catPollos },
  { nombre: 'Porción de Ensalada Familiar', precio: 5, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: '1 Pollo a la Brasa', precio: 70, tipo: 'pollo', fraccion_pollo: 1, categoria_id: catPollos },
  { nombre: 'Pilsen 310mL', precio: 8, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 1.5L Inca Kola', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Porción de Ensalada Personal', precio: 2, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Porción de 3 Chorizos', precio: 5, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Pollo Entero + Chaufa + Chicha 1L', precio: 83, tipo: 'promocion', fraccion_pollo: 1, categoria_id: catPollos },
  { nombre: 'Anticucho de Corazón', precio: 16, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Cusqueña Negra 310mL', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: '1/2 Pollo a la Brasa', precio: 37, tipo: 'pollo', fraccion_pollo: 0.5, categoria_id: catPollos },
  { nombre: 'Gaseosa 1L Coca Cola', precio: 8, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Brasa Light', precio: 20, tipo: 'complemento', fraccion_pollo: 0.25, categoria_id: catComplementos },
  { nombre: 'Gaseosa 1.5L Coca Cola', precio: 10, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Gaseosa 1L Inca Kola', precio: 8, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Maracuyá 1/2 Jarra', precio: 6, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Taper Grande', precio: 1, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Infusiones', precio: 2, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas },
  { nombre: 'Huevo Frito', precio: 2, tipo: 'complemento', fraccion_pollo: 0, categoria_id: catComplementos },
  { nombre: 'Fanta Descartable', precio: 4, tipo: 'bebida', fraccion_pollo: 0, categoria_id: catBebidas }
].map(p => ({ ...p, negocio_id: negocioId, activo: true }));

async function run() {
  console.log(`Insertando ${productos.length} productos para Pocholo's...`);
  const { data, error } = await supabase.from('productos').insert(productos);
  if (error) {
    console.error('Error al insertar:', error);
  } else {
    console.log('¡Productos cargados con éxito!');
  }
}

run();
