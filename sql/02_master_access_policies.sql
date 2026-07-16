-- Eliminar políticas antiguas y crear nuevas con acceso maestro para Super Admin

-- 1. PRODUCTOS
DROP POLICY IF EXISTS "productos aislam" ON public.productos;
CREATE POLICY "productos master access" ON public.productos 
FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());

-- 2. MESAS
DROP POLICY IF EXISTS "mesas aislam" ON public.mesas;
CREATE POLICY "mesas master access" ON public.mesas 
FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());

-- 3. CATEGORIAS
DROP POLICY IF EXISTS "categorias aislam" ON public.categorias;
CREATE POLICY "categorias master access" ON public.categorias 
FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());

-- 4. VENTAS
DROP POLICY IF EXISTS "ventas aislam" ON public.ventas;
CREATE POLICY "ventas master access" ON public.ventas 
FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());

-- 5. USER PROFILES
DROP POLICY IF EXISTS "user_profiles aislam" ON public.user_profiles;
CREATE POLICY "user_profiles master access" ON public.user_profiles 
FOR ALL USING (negocio_id = public.user_negocio_id() OR id = auth.uid() OR public.is_superadmin());

-- 6. GASTOS
DO $$ BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gastos') THEN
        DROP POLICY IF EXISTS "gastos aislam" ON public.gastos;
        CREATE POLICY "gastos master access" ON public.gastos 
        FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());
    END IF; 
END $$;

-- 7. CONFIGURACION NEGOCIO
DO $$ BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_negocio') THEN
        DROP POLICY IF EXISTS "configuracion_negocio aislam" ON public.configuracion_negocio;
        CREATE POLICY "configuracion_negocio master access" ON public.configuracion_negocio 
        FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());
    END IF; 
END $$;

-- 8. CATALOGO BEBIDAS
DO $$ BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalogo_bebidas') THEN
        DROP POLICY IF EXISTS "catalogo_bebidas aislam" ON public.catalogo_bebidas;
        CREATE POLICY "catalogo_bebidas master access" ON public.catalogo_bebidas 
        FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());
    END IF; 
END $$;

-- 9. INVENTARIO DIARIO
DROP POLICY IF EXISTS "inventario_diario aislam" ON public.inventario_diario;
CREATE POLICY "inventario_diario master access" ON public.inventario_diario 
FOR ALL USING (negocio_id = public.user_negocio_id() OR public.is_superadmin());
