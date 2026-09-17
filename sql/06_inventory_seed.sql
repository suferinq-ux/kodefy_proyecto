-- ==========================================
-- MÓDULO DE INVENTARIO - DATOS DE PRUEBA (SEED)
-- ==========================================

DO $$
DECLARE
    v_negocio_id UUID;
    v_admin_id UUID;
    v_unidad_kg UUID := uuid_generate_v4();
    v_unidad_l UUID := uuid_generate_v4();
    v_unidad_un UUID := uuid_generate_v4();
    v_cat_carnes UUID := uuid_generate_v4();
    v_cat_verduras UUID := uuid_generate_v4();
    v_cat_abarrotes UUID := uuid_generate_v4();
    v_cat_bebidas UUID := uuid_generate_v4();
    v_almacen_principal UUID := uuid_generate_v4();
    
    -- Insumos
    v_insumo_pollo UUID := uuid_generate_v4();
    v_insumo_papa UUID := uuid_generate_v4();
    v_insumo_aceite UUID := uuid_generate_v4();
    v_insumo_sal UUID := uuid_generate_v4();
    v_insumo_pimienta UUID := uuid_generate_v4();
    v_insumo_comino UUID := uuid_generate_v4();
    v_insumo_sillao UUID := uuid_generate_v4();
    v_insumo_vinagre UUID := uuid_generate_v4();
    v_insumo_ajo UUID := uuid_generate_v4();
    v_insumo_aji_panca UUID := uuid_generate_v4();
    v_insumo_tomate UUID := uuid_generate_v4();
    v_insumo_lechuga UUID := uuid_generate_v4();
    v_insumo_limon UUID := uuid_generate_v4();
    v_insumo_coca_cola UUID := uuid_generate_v4();
    v_insumo_chicha UUID := uuid_generate_v4();
    
    -- Productos finales (Recetas)
    v_prod_pollo_brasa UUID := uuid_generate_v4();
    v_prod_medio_pollo UUID := uuid_generate_v4();
    v_prod_cuarto_pollo UUID := uuid_generate_v4();
    v_prod_papas_fritas UUID := uuid_generate_v4();
    v_prod_ensalada UUID := uuid_generate_v4();
    v_prod_gaseosa_1l UUID := uuid_generate_v4();
    v_prod_chicha_vaso UUID := uuid_generate_v4();
    v_prod_combo_1 UUID := uuid_generate_v4();
    
    v_receta_pollo UUID := uuid_generate_v4();
    v_receta_medio UUID := uuid_generate_v4();
    v_receta_cuarto UUID := uuid_generate_v4();
    v_receta_papas UUID := uuid_generate_v4();
    v_receta_ensalada UUID := uuid_generate_v4();
BEGIN
    -- Obtener el primer negocio disponible para inyectar la data, o crear uno si no existe.
    SELECT id INTO v_negocio_id FROM public.negocios LIMIT 1;
    IF v_negocio_id IS NULL THEN
        INSERT INTO public.negocios (id, nombre, slug) VALUES (uuid_generate_v4(), 'Pollería El Buen Sabor', 'buen-sabor') RETURNING id INTO v_negocio_id;
    END IF;

    -- Obtener un usuario de prueba (opcional, para referencias)
    SELECT id INTO v_admin_id FROM auth.users LIMIT 1;

    -- 1. UNIDADES DE MEDIDA
    INSERT INTO public.unidades_medida (id, negocio_id, nombre, abreviatura) VALUES
    (v_unidad_kg, v_negocio_id, 'Kilogramo', 'kg'),
    (v_unidad_l, v_negocio_id, 'Litro', 'L'),
    (v_unidad_un, v_negocio_id, 'Unidad', 'un');

    -- 2. CATEGORÍAS DE INSUMOS
    INSERT INTO public.categorias_insumo (id, negocio_id, nombre, descripcion) VALUES
    (v_cat_carnes, v_negocio_id, 'Carnes', 'Pollo, carnes rojas, embutidos'),
    (v_cat_verduras, v_negocio_id, 'Verduras', 'Vegetales frescos'),
    (v_cat_abarrotes, v_negocio_id, 'Abarrotes', 'Condimentos, aceite, arroz'),
    (v_cat_bebidas, v_negocio_id, 'Bebidas', 'Gaseosas, cervezas, insumos para refrescos');

    -- 3. ALMACENES
    INSERT INTO public.almacenes (id, negocio_id, nombre, ubicacion) VALUES
    (v_almacen_principal, v_negocio_id, 'Almacén Principal', 'Zona trasera');

    -- 4. INSUMOS (15 insumos)
    INSERT INTO public.insumos (id, negocio_id, sku, nombre, categoria_id, unidad_base_id, stock_actual, stock_minimo, costo_promedio) VALUES
    (v_insumo_pollo, v_negocio_id, 'INS-001', 'Pollo Entero Crudo', v_cat_carnes, v_unidad_un, 100, 20, 15.00),
    (v_insumo_papa, v_negocio_id, 'INS-002', 'Papa Amarilla', v_cat_verduras, v_unidad_kg, 200, 50, 2.50),
    (v_insumo_aceite, v_negocio_id, 'INS-003', 'Aceite Vegetal', v_cat_abarrotes, v_unidad_l, 50, 10, 8.00),
    (v_insumo_sal, v_negocio_id, 'INS-004', 'Sal Yodada', v_cat_abarrotes, v_unidad_kg, 20, 5, 1.20),
    (v_insumo_pimienta, v_negocio_id, 'INS-005', 'Pimienta Molida', v_cat_abarrotes, v_unidad_kg, 5, 1, 15.00),
    (v_insumo_comino, v_negocio_id, 'INS-006', 'Comino Molido', v_cat_abarrotes, v_unidad_kg, 5, 1, 18.00),
    (v_insumo_sillao, v_negocio_id, 'INS-007', 'Sillao (Salsa de Soya)', v_cat_abarrotes, v_unidad_l, 10, 2, 5.00),
    (v_insumo_vinagre, v_negocio_id, 'INS-008', 'Vinagre Tinto', v_cat_abarrotes, v_unidad_l, 10, 2, 3.50),
    (v_insumo_ajo, v_negocio_id, 'INS-009', 'Ajo Pelado', v_cat_verduras, v_unidad_kg, 15, 3, 10.00),
    (v_insumo_aji_panca, v_negocio_id, 'INS-010', 'Ají Panca Molido', v_cat_abarrotes, v_unidad_kg, 8, 2, 12.00),
    (v_insumo_tomate, v_negocio_id, 'INS-011', 'Tomate', v_cat_verduras, v_unidad_kg, 30, 10, 3.00),
    (v_insumo_lechuga, v_negocio_id, 'INS-012', 'Lechuga Americana', v_cat_verduras, v_unidad_un, 40, 10, 1.50),
    (v_insumo_limon, v_negocio_id, 'INS-013', 'Limón Sutil', v_cat_verduras, v_unidad_kg, 25, 5, 4.00),
    (v_insumo_coca_cola, v_negocio_id, 'INS-014', 'Coca Cola 1L', v_cat_bebidas, v_unidad_un, 120, 24, 3.50),
    (v_insumo_chicha, v_negocio_id, 'INS-015', 'Maíz Morado (Chicha)', v_cat_abarrotes, v_unidad_kg, 15, 5, 6.00);

    -- 5. PRODUCTOS FINALES (Para enlazar recetas)
    INSERT INTO public.productos (id, negocio_id, nombre, tipo, precio) VALUES
    (v_prod_pollo_brasa, v_negocio_id, 'Pollo a la Brasa Entero', 'pollo', 60.00),
    (v_prod_medio_pollo, v_negocio_id, '1/2 Pollo a la Brasa', 'pollo', 32.00),
    (v_prod_cuarto_pollo, v_negocio_id, '1/4 Pollo a la Brasa', 'pollo', 18.00),
    (v_prod_papas_fritas, v_negocio_id, 'Porción de Papas Fritas', 'complemento', 10.00),
    (v_prod_ensalada, v_negocio_id, 'Ensalada Clásica', 'complemento', 8.00),
    (v_prod_gaseosa_1l, v_negocio_id, 'Gaseosa 1L', 'bebida', 8.00),
    (v_prod_chicha_vaso, v_negocio_id, 'Vaso de Chicha', 'bebida', 4.00),
    (v_prod_combo_1, v_negocio_id, 'Combo 1 (1/4 Pollo + Papas + Gaseosa)', 'promocion', 22.00);

    -- 6. RECETAS (Fichas Técnicas)
    INSERT INTO public.recetas (id, negocio_id, producto_id, nombre, porcion_rendimiento, costo_total) VALUES
    (v_receta_pollo, v_negocio_id, v_prod_pollo_brasa, 'Receta Pollo Entero', 1, 25.00),
    (v_receta_medio, v_negocio_id, v_prod_medio_pollo, 'Receta Medio Pollo', 1, 12.50),
    (v_receta_cuarto, v_negocio_id, v_prod_cuarto_pollo, 'Receta Cuarto Pollo', 1, 6.25),
    (v_receta_papas, v_negocio_id, v_prod_papas_fritas, 'Receta Porción Papas', 1, 2.50),
    (v_receta_ensalada, v_negocio_id, v_prod_ensalada, 'Receta Ensalada Clásica', 1, 1.80);

    -- 7. INSUMOS DE RECETAS
    -- Pollo a la brasa entero (1 pollo, aderezos)
    INSERT INTO public.receta_insumos (negocio_id, receta_id, insumo_id, cantidad, unidad_medida_id) VALUES
    (v_negocio_id, v_receta_pollo, v_insumo_pollo, 1, v_unidad_un),
    (v_negocio_id, v_receta_pollo, v_insumo_sal, 0.05, v_unidad_kg),
    (v_negocio_id, v_receta_pollo, v_insumo_sillao, 0.05, v_unidad_l),
    (v_negocio_id, v_receta_pollo, v_insumo_aji_panca, 0.02, v_unidad_kg);

    -- Medio Pollo
    INSERT INTO public.receta_insumos (negocio_id, receta_id, insumo_id, cantidad, unidad_medida_id) VALUES
    (v_negocio_id, v_receta_medio, v_insumo_pollo, 0.5, v_unidad_un);

    -- Cuarto de Pollo
    INSERT INTO public.receta_insumos (negocio_id, receta_id, insumo_id, cantidad, unidad_medida_id) VALUES
    (v_negocio_id, v_receta_cuarto, v_insumo_pollo, 0.25, v_unidad_un);

    -- Papas Fritas (Considerando merma, 0.4kg de papa rinde 1 porcion)
    INSERT INTO public.receta_insumos (negocio_id, receta_id, insumo_id, cantidad, unidad_medida_id, merma_porcentaje) VALUES
    (v_negocio_id, v_receta_papas, v_insumo_papa, 0.40, v_unidad_kg, 10),
    (v_negocio_id, v_receta_papas, v_insumo_aceite, 0.05, v_unidad_l, 5);

    -- Ensalada Clásica
    INSERT INTO public.receta_insumos (negocio_id, receta_id, insumo_id, cantidad, unidad_medida_id) VALUES
    (v_negocio_id, v_receta_ensalada, v_insumo_lechuga, 0.1, v_unidad_un),
    (v_negocio_id, v_receta_ensalada, v_insumo_tomate, 0.1, v_unidad_kg),
    (v_negocio_id, v_receta_ensalada, v_insumo_limon, 0.05, v_unidad_kg);

    -- 8. MOVIMIENTOS DE INVENTARIO (Ejemplo de historial / Kardex inicial)
    INSERT INTO public.movimientos_inventario (negocio_id, insumo_id, almacen_id, tipo_movimiento, cantidad, stock_anterior, stock_actual, costo_unitario, usuario_id) VALUES
    (v_negocio_id, v_insumo_pollo, v_almacen_principal, 'compra', 100, 0, 100, 15.00, v_admin_id),
    (v_negocio_id, v_insumo_papa, v_almacen_principal, 'compra', 200, 0, 200, 2.50, v_admin_id),
    (v_negocio_id, v_insumo_aceite, v_almacen_principal, 'compra', 50, 0, 50, 8.00, v_admin_id);

END $$;
