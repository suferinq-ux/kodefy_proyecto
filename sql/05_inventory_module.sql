-- ==========================================
-- MÓDULO DE INVENTARIO - ESQUEMA DE BASE DE DATOS
-- ==========================================

-- 1. UNIDADES DE MEDIDA
CREATE TABLE IF NOT EXISTS public.unidades_medida (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, -- Ej: Kilogramo, Litro, Unidad
    abreviatura TEXT NOT NULL, -- Ej: kg, L, un
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. CATEGORÍAS DE INSUMOS
CREATE TABLE IF NOT EXISTS public.categorias_insumo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. ALMACENES
CREATE TABLE IF NOT EXISTS public.almacenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. INSUMOS (Materia Prima)
CREATE TABLE IF NOT EXISTS public.insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    sku TEXT,
    nombre TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias_insumo(id) ON DELETE SET NULL,
    unidad_base_id UUID REFERENCES public.unidades_medida(id) ON DELETE RESTRICT,
    stock_actual NUMERIC(15,4) DEFAULT 0,
    stock_minimo NUMERIC(15,4) DEFAULT 0,
    stock_maximo NUMERIC(15,4),
    costo_promedio NUMERIC(10,2) DEFAULT 0,
    costo_ultimo NUMERIC(10,2) DEFAULT 0,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'descontinuado')),
    imagen_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. PROVEEDORES
CREATE TABLE IF NOT EXISTS public.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    ruc TEXT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. INSUMO - PROVEEDORES (Relación y precios de compra)
CREATE TABLE IF NOT EXISTS public.insumo_proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    precio_compra NUMERIC(10,2) NOT NULL,
    unidad_compra_id UUID REFERENCES public.unidades_medida(id),
    factor_conversion NUMERIC(15,4) NOT NULL DEFAULT 1, -- Cuántas unidades base hay en una unidad de compra
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(insumo_id, proveedor_id)
);

-- 7. LOTES (Para control FIFO y vencimientos)
CREATE TABLE IF NOT EXISTS public.lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    cantidad_inicial NUMERIC(15,4) NOT NULL,
    cantidad_actual NUMERIC(15,4) NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    costo_unitario NUMERIC(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. RECETAS (Ficha técnica ligada a un Producto)
CREATE TABLE IF NOT EXISTS public.recetas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE, -- Producto final de la carta. Nullable si es sub-receta pura que no se vende.
    nombre TEXT NOT NULL, -- Por defecto el nombre del producto, útil si es sub-receta.
    porcion_rendimiento NUMERIC(10,2) DEFAULT 1,
    costo_total NUMERIC(10,2) DEFAULT 0,
    margen_calculado NUMERIC(10,2) DEFAULT 0,
    instrucciones TEXT,
    tiempo_preparacion_min INTEGER,
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'revision', 'descontinuada')),
    es_sub_receta BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 9. RECETA INSUMOS (Detalle / BOM)
CREATE TABLE IF NOT EXISTS public.receta_insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES public.insumos(id) ON DELETE CASCADE,
    sub_receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE, -- Si usa otra receta como ingrediente
    cantidad NUMERIC(15,4) NOT NULL,
    unidad_medida_id UUID REFERENCES public.unidades_medida(id),
    merma_porcentaje NUMERIC(5,2) DEFAULT 0,
    costo_parcial NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    CHECK ((insumo_id IS NOT NULL AND sub_receta_id IS NULL) OR (insumo_id IS NULL AND sub_receta_id IS NOT NULL))
);

-- 10. MOVIMIENTOS INVENTARIO (Kardex)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    almacen_id UUID REFERENCES public.almacenes(id) ON DELETE RESTRICT,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('compra', 'venta', 'ajuste', 'merma', 'devolucion', 'transferencia', 'consumo_interno')),
    cantidad NUMERIC(15,4) NOT NULL, -- Positivo o Negativo
    stock_anterior NUMERIC(15,4) NOT NULL,
    stock_actual NUMERIC(15,4) NOT NULL,
    costo_unitario NUMERIC(10,4),
    referencia_id UUID, -- UUID de venta, ajuste, o compra
    usuario_id UUID REFERENCES auth.users(id),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 11. AJUSTES INVENTARIO
CREATE TABLE IF NOT EXISTS public.ajustes_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    tipo_ajuste TEXT NOT NULL CHECK (tipo_ajuste IN ('entrada_compra', 'entrada_devolucion', 'salida_merma', 'salida_vencimiento', 'salida_consumo', 'salida_robo', 'conteo_fisico')),
    almacen_id UUID REFERENCES public.almacenes(id) ON DELETE RESTRICT,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    cantidad NUMERIC(15,4) NOT NULL, -- Puede ser positivo o negativo
    motivo TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    responsable_id UUID REFERENCES auth.users(id),
    aprobador_id UUID REFERENCES auth.users(id),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    evidencia_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- HABILITAR RLS
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_insumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumo_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_inventario ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Basado en negocio_id)
DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY[
    'unidades_medida', 'categorias_insumo', 'almacenes', 'insumos', 
    'proveedores', 'insumo_proveedores', 'lotes', 'recetas', 
    'receta_insumos', 'movimientos_inventario', 'ajustes_inventario'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY "Super admins can read all %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.is_super_admin());
      CREATE POLICY "Users can select own %1$s" ON public.%1$s FOR SELECT TO authenticated USING (negocio_id = public.get_user_negocio_id());
      CREATE POLICY "Users can insert own %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (negocio_id = public.get_user_negocio_id());
      CREATE POLICY "Users can update own %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (negocio_id = public.get_user_negocio_id()) WITH CHECK (negocio_id = public.get_user_negocio_id());
      CREATE POLICY "Users can delete own %1$s" ON public.%1$s FOR DELETE TO authenticated USING (negocio_id = public.get_user_negocio_id());
    ', table_name);
  END LOOP;
END $$;

-- FUNCIÓN PARA DESCONTAR INVENTARIO DESDE UNA VENTA
CREATE OR REPLACE FUNCTION public.descontar_inventario_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_item JSONB;
    v_producto_id UUID;
    v_cantidad_vendida NUMERIC;
    v_receta RECORD;
    v_ingrediente RECORD;
    v_stock_actual NUMERIC;
BEGIN
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.estado_pedido != 'entregado' AND NEW.estado_pedido = 'entregado')) THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            v_producto_id := (v_item->>'id')::UUID;
            IF v_producto_id IS NULL THEN
                v_producto_id := (v_item->>'producto_id')::UUID;
            END IF;
            
            v_cantidad_vendida := (v_item->>'cantidad')::NUMERIC;
            
            IF v_producto_id IS NOT NULL AND v_cantidad_vendida > 0 THEN
                FOR v_receta IN SELECT id FROM public.recetas WHERE producto_id = v_producto_id AND negocio_id = NEW.negocio_id AND estado = 'activa' LIMIT 1
                LOOP
                    FOR v_ingrediente IN SELECT insumo_id, cantidad, merma_porcentaje FROM public.receta_insumos WHERE receta_id = v_receta.id AND insumo_id IS NOT NULL
                    LOOP
                        DECLARE
                            v_cantidad_total_descontar NUMERIC := (v_ingrediente.cantidad * v_cantidad_vendida);
                            v_stock_previo NUMERIC;
                        BEGIN
                            SELECT stock_actual INTO v_stock_previo FROM public.insumos WHERE id = v_ingrediente.insumo_id FOR UPDATE;
                            
                            IF v_stock_previo IS NOT NULL THEN
                                UPDATE public.insumos SET stock_actual = stock_actual - v_cantidad_total_descontar, updated_at = now() WHERE id = v_ingrediente.insumo_id RETURNING stock_actual INTO v_stock_actual;
                                
                                INSERT INTO public.movimientos_inventario (negocio_id, insumo_id, tipo_movimiento, cantidad, stock_anterior, stock_actual, referencia_id, fecha)
                                VALUES (NEW.negocio_id, v_ingrediente.insumo_id, 'venta', -v_cantidad_total_descontar, v_stock_previo, v_stock_actual, NEW.id, now());
                            END IF;
                        END;
                    END LOOP;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS trg_descontar_inventario ON public.ventas;
-- CREATE TRIGGER trg_descontar_inventario
-- AFTER INSERT OR UPDATE ON public.ventas
-- FOR EACH ROW EXECUTE FUNCTION public.descontar_inventario_venta();
