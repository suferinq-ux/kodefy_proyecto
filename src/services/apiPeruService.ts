export interface DocumentResponse {
    success: boolean;
    data?: {
        numero: string;
        nombre_completo: string;
        nombres?: string;
        apellido_paterno?: string;
        apellido_materno?: string;
        codigo_verificacion?: string;
        // RUC specific fields
        razon_social?: string;
        estado?: string;
        condicion?: string;
        direccion?: string;
        ubigeo?: string[];
        via_tipo?: string;
        via_nombre?: string;
        zona_codigo?: string;
        zona_tipo?: string;
        numero_direccion?: string;
        interior?: string;
        lote?: string;
        derecha?: string;
        kilometro?: string;
    };
    message?: string;
}

export const consultarDocumento = async (documento: string, tipo: 'dni' | 'ruc'): Promise<DocumentResponse> => {
    try {
        const response = await fetch(`/api/apiperu?documento=${encodeURIComponent(documento)}&tipo=${tipo}`);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return { success: false, message: errData.message || `Error al consultar el ${tipo.toUpperCase()}` };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error in ${tipo.toUpperCase()} lookup:`, error);
        return { success: false, message: `Error de conexión con el servicio de ${tipo.toUpperCase()}` };
    }
};

// Mantener compatibilidad (opcional, mejor actualizar referencias)
export const consultarDNI = (dni: string) => consultarDocumento(dni, 'dni');
export const consultarRUC = (ruc: string) => consultarDocumento(ruc, 'ruc');
