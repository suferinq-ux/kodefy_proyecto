-- Trigger para inicializar configuración cuando se crea un nuevo negocio

CREATE OR REPLACE FUNCTION public.initialize_new_business()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear configuración por defecto para el nuevo negocio
    INSERT INTO public.configuracion_negocio (
        negocio_id,
        nombre_negocio,
        modo_impresion
    ) VALUES (
        NEW.id,
        NEW.nombre,
        'red'
    );

    -- Crear categorías básicas por defecto
    INSERT INTO public.categorias (nombre, negocio_id, orden) VALUES
    ('Pollos y Platos', NEW.id, 1),
    ('Combos', NEW.id, 2),
    ('Bebidas', NEW.id, 3),
    ('Complementos', NEW.id, 4);

    -- Crear mesas básicas por defecto
    INSERT INTO public.mesas (numero, estado, negocio_id) VALUES
    (1, 'libre', NEW.id),
    (2, 'libre', NEW.id),
    (3, 'libre', NEW.id),
    (4, 'libre', NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_business_created ON public.negocios;
CREATE TRIGGER on_business_created
    AFTER INSERT ON public.negocios
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_new_business();
