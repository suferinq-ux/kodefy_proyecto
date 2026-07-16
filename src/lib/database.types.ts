// Tipos TypeScript para las tablas de Supabase

export interface Negocio {
    id: string;
    nombre: string;
    slug: string;
    codigo_acceso?: string;
    logo_url?: string;
    color_primario: string;
    color_secundario: string;
    estado: 'activo' | 'suspendido';
    latitud?: number;
    longitud?: number;
    costo_base_delivery?: number;
    costo_por_km?: number;
    created_at: string;
    updated_at: string;
}
export interface InventarioDiario {
    id: string;
    negocio_id: string;
    fecha: string; // ISO date string
    pollos_enteros: number;
    gaseosas: number;
    dinero_inicial?: number; // Caja chica / Base
    bebidas_detalle?: BebidasDetalle; // Detailed beverage inventory
    estado: 'abierto' | 'cerrado';
    stock_pollos_real?: number;
    stock_gaseosas_real?: number;
    papas_iniciales?: number;
    papas_finales?: number;
    cena_personal?: number;
    pollos_golpeados?: number;
    dinero_cierre_real?: number;
    chicha_inicial?: number; // Litros de chicha
    observaciones_cierre?: string;
    created_at: string;
    updated_at: string;
}

export interface Producto {
    id: string;
    negocio_id: string;
    nombre: string;
    tipo: 'pollo' | 'bebida' | 'complemento' | 'promocion';
    precio: number;
    fraccion_pollo: number; // 1.0, 0.25, 0.125, 0
    // Campos para trackeo de bebidas
    marca_gaseosa?: string | null;
    tipo_gaseosa?: string | null;
    activo: boolean;
    imagen_url?: string; // URL de la imagen del producto
    descripcion?: string; // Descripción detallada del producto
    categoria_id?: string; // UUID de la categoría
    created_at: string;
}

export interface Categoria {
    id: string;
    negocio_id: string;
    nombre: string;
    orden: number;
    created_at: string;
}

export interface ConfiguracionNegocio {
    id: string;
    negocio_id: string;
    nombre_negocio?: string;
    telefono?: string;
    ip_impresora_caja?: string;
    ip_impresora_cocina?: string;
    modo_impresion: 'red' | 'pos';
    created_at: string;
    updated_at: string;
}

export interface Gasto {
    id: string;
    negocio_id: string;
    descripcion: string;
    monto: number;
    fecha: string;
    metodo_pago?: 'efectivo' | 'yape' | 'plin';
    created_at: string;
}

export interface ItemVenta {
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    fraccion_pollo: number;
    // Detalle de bebida para este item
    detalle_bebida?: {
        marca: string;
        tipo: string;
    };
    tipo?: 'pollo' | 'bebida' | 'complemento' | 'promocion';
    printed?: boolean;
    detalles?: {
        parte?: string;
        trozado?: string;
        notas?: string;
    };
}

export interface Venta {
    id: string;
    negocio_id: string;
    fecha: string; // ISO date string
    items: ItemVenta[];
    total: number;
    pollos_restados: number;
    gaseosas_restadas: number;
    chicha_restada?: number; // Litros restados en esta venta
    bebidas_detalle?: BebidasDetalle; // Consolidado de bebidas restadas en esta venta
    metodo_pago: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'mixto';
    pago_dividido?: {
        efectivo?: number;
        yape?: number;
        plin?: number;
        tarjeta?: number;
    };
    estado_pedido: 'pendiente' | 'listo' | 'entregado';
    estado_pago?: 'pendiente' | 'pagado';
    mesa?: string; // Deprecated: usar mesa_id
    mesa_id?: number; // ID de la mesa asignada
    notas?: string; // Comentarios del pedido
    tipo_pedido?: 'mesa' | 'llevar' | 'delivery'; // Tipo de pedido
    costo_envio?: number; // Costo por delivery
    direccion_envio?: string; // Dirección para delivery
    distancia_km?: number; // Distancia para delivery en km
    repartidor_id?: string; // UUID del repartidor asignado
    estado_delivery?: 'buscando_repartidor' | 'asignado' | 'en_camino' | 'entregado';
    estado_impresion?: 'pendiente' | 'impreso' | 'error'; // Control de impresion local
    referencia_envio?: string;
    telefono_envio?: string;
    tiempo_estimado_envio?: string;
    latitud_envio?: number;
    longitud_envio?: number;
    geometria_envio?: [number, number][];
    usuario_nombre?: string; // Nombre de quien atendió
    created_at: string;
    updated_at?: string; // Add updated_at
    mesas?: { numero: number } | null; // Join result
}

export interface Mesa {
    id: number;
    negocio_id: string;
    numero: number;
    estado: 'libre' | 'ocupada';
    created_at: string;
}

export interface RepartidorUbicacion {
    id: string; // UUID del usuario
    negocio_id: string;
    lat: number;
    lng: number;
    updated_at: string;
    usuarios?: { nombre: string }; // Relación con perfil si aplica
}


export interface StockActual {
    fecha: string;
    pollos_enteros: number;
    gaseosas: number;
    pollos_disponibles: number;
    gaseosas_disponibles: number;
    pollos_iniciales: number;
    gaseosas_iniciales: number;
    pollos_vendidos: number;
    gaseosas_vendidas: number;
    chicha_inicial?: number;
    chicha_vendida?: number;
    chicha_disponible?: number;
    papas_iniciales?: number;
    dinero_inicial: number;
    estado: 'abierto' | 'cerrado';
    bebidas_detalle?: BebidasDetalle; // Initial stock
    bebidas_ventas?: BebidasDetalle[]; // Array of sales to subtract
}

// Detailed beverage inventory structure (tamaños reales Perú)
export interface BebidasDetalle {
    [key: string]: Record<string, number | undefined> | undefined;
    inca_kola?: Record<string, number | undefined>;
    coca_cola?: Record<string, number | undefined>;
    sprite?: Record<string, number | undefined>;
    fanta?: Record<string, number | undefined>;
    agua_mineral?: Record<string, number | undefined>;
    chicha?: Record<string, number | undefined>;
}

// Tipos para el carrito de compras
export interface ItemCarrito extends ItemVenta {
    subtotal: number;
}

// Tipo para la respuesta de inserción
export interface AperturaResponse {
    success: boolean;
    message: string;
    data?: InventarioDiario;
}

export interface VentaResponse {
    success: boolean;
    message: string;
    data?: Venta;
}
