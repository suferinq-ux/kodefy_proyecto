-- ==========================================
-- KODEFY TECH SAAS - SUPABASE SCHEMA SETUP
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Table: negocios
-- Almacena la información de cada inquilino (tenant)
CREATE TABLE IF NOT EXISTS public.negocios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    color_primario TEXT DEFAULT '#2563eb',
    color_secundario TEXT DEFAULT '#1e40af',
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: user_profiles
-- Perfiles de usuario vinculados a la autenticación de Supabase auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE, -- NULL si es super_admin sin negocio
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'cajero', 'mozo', 'repartidor')),
    activo BOOLEAN DEFAULT true,
    es_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: productos
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('pollo', 'bebida', 'complemento', 'promocion')),
    precio NUMERIC(10,2) NOT NULL,
    fraccion_pollo NUMERIC(4,3) DEFAULT 0,
    marca_gaseosa TEXT,
    tipo_gaseosa TEXT,
    activo BOOLEAN DEFAULT true,
    imagen_url TEXT,
    descripcion TEXT,
    categoria_id UUID, -- Se añade vía alter table después para evitar error circular si categorias no existe aún
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Vincular productos con categorias
ALTER TABLE public.productos ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;

-- Table: configuracion_negocio
CREATE TABLE IF NOT EXISTS public.configuracion_negocio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre_negocio TEXT,
    telefono TEXT,
    ip_impresora_caja TEXT,
    ip_impresora_cocina TEXT,
    modo_impresion TEXT DEFAULT 'red' CHECK (modo_impresion IN ('red', 'pos')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id)
);

-- Table: inventario_diario
CREATE TABLE IF NOT EXISTS public.inventario_diario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    pollos_enteros NUMERIC(10,2) DEFAULT 0,
    gaseosas INTEGER DEFAULT 0,
    dinero_inicial NUMERIC(10,2) DEFAULT 0,
    bebidas_detalle JSONB DEFAULT '{}'::jsonb,
    estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    stock_pollos_real NUMERIC(10,2),
    stock_gaseosas_real INTEGER,
    papas_iniciales NUMERIC(10,2) DEFAULT 0,
    papas_finales NUMERIC(10,2),
    cena_personal NUMERIC(10,2),
    pollos_golpeados NUMERIC(10,2),
    dinero_cierre_real NUMERIC(10,2),
    chicha_inicial NUMERIC(10,2) DEFAULT 0,
    observaciones_cierre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id, fecha)
);

-- Table: mesas
CREATE TABLE IF NOT EXISTS public.mesas (
    id SERIAL PRIMARY KEY,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    estado TEXT DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(negocio_id, numero)
);

-- Table: ventas
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    items JSONB NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    pollos_restados NUMERIC(10,2) DEFAULT 0,
    gaseosas_restadas INTEGER DEFAULT 0,
    chicha_restada NUMERIC(10,2) DEFAULT 0,
    bebidas_detalle JSONB DEFAULT '{}'::jsonb,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'yape', 'plin', 'mixto')),
    pago_dividido JSONB DEFAULT '{}'::jsonb,
    estado_pedido TEXT DEFAULT 'entregado' CHECK (estado_pedido IN ('pendiente', 'listo', 'entregado')),
    estado_pago TEXT DEFAULT 'pagado' CHECK (estado_pago IN ('pendiente', 'pagado')),
    mesa_id INTEGER REFERENCES public.mesas(id) ON DELETE SET NULL,
    notas TEXT,
    tipo_pedido TEXT DEFAULT 'mesa' CHECK (tipo_pedido IN ('mesa', 'llevar', 'delivery')),
    costo_envio NUMERIC(10,2) DEFAULT 0,
    direccion_envio TEXT,
    distancia_km NUMERIC(10,2),
    repartidor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    estado_delivery TEXT CHECK (estado_delivery IN ('buscando_repartidor', 'asignado', 'en_camino', 'entregado')),
    usuario_nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: gastos
CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha DATE NOT NULL,
    metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'yape', 'plin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: repartidor_ubicacion
CREATE TABLE IF NOT EXISTS public.repartidor_ubicacion (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    lat NUMERIC(10,8) NOT NULL,
    lng NUMERIC(11,8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)

ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidor_ubicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES

-- Helper Function para obtener el negocio_id y es_super_admin del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_negocio_id()
RETURNS UUID AS $$
  SELECT negocio_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT es_super_admin FROM public.user_profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies for: negocios
-- Super Admins can do everything.
CREATE POLICY "Super Admins can manage all negocios"
ON public.negocios
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Users can read their own negocio
CREATE POLICY "Users can read their own negocio"
ON public.negocios FOR SELECT
TO authenticated
USING (id = get_user_negocio_id());

-- Policies for: user_profiles
CREATE POLICY "Super Admins can manage all profiles"
ON public.user_profiles
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users can read profiles from their negocio"
ON public.user_profiles FOR SELECT
TO authenticated
USING (negocio_id = get_user_negocio_id() OR id = auth.uid());

CREATE POLICY "Admins can update profiles in their negocio"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (negocio_id = get_user_negocio_id() AND (SELECT rol FROM public.user_profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (negocio_id = get_user_negocio_id());

-- Policies for multitenant tables (productos, inventario_diario, mesas, ventas, gastos)
-- Rule: You can only read/write rows where negocio_id matches your own. Superadmins bypass this for SELECT.
-- Generamos dinámicamente las políticas similares:

DO $$ 
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['productos', 'inventario_diario', 'mesas', 'ventas', 'gastos', 'repartidor_ubicacion', 'categorias', 'configuracion_negocio'])
  LOOP
    EXECUTE format('
      CREATE POLICY "Super admins can read all %1$s" ON public.%1$s FOR SELECT TO authenticated USING (is_super_admin());
      CREATE POLICY "Users can select own %1$s" ON public.%1$s FOR SELECT TO authenticated USING (negocio_id = get_user_negocio_id());
      CREATE POLICY "Users can insert own %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (negocio_id = get_user_negocio_id());
      CREATE POLICY "Users can update own %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (negocio_id = get_user_negocio_id()) WITH CHECK (negocio_id = get_user_negocio_id());
      CREATE POLICY "Users can delete own %1$s" ON public.%1$s FOR DELETE TO authenticated USING (negocio_id = get_user_negocio_id());
    ', table_name);
  END LOOP;
END $$;
