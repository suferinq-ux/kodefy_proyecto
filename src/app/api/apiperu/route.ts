import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documento = searchParams.get('documento');
    const tipo = searchParams.get('tipo');

    if (!documento || !tipo || !['dni', 'ruc'].includes(tipo)) {
      return NextResponse.json(
        { success: false, message: 'Documento y tipo ("dni" o "ruc") son requeridos.' },
        { status: 400 }
      );
    }

    const API_TOKEN = process.env.APIPERU_TOKEN;
    const API_BASE_URL = process.env.APIPERU_URL || 'https://apiperu.dev/api';

    if (!API_TOKEN) {
      console.error('[API Peru Proxy] Token no configurado en el servidor.');
      return NextResponse.json(
        { success: false, message: 'Servicio no configurado correctamente en el servidor.' },
        { status: 500 }
      );
    }

    const apiUrl = `${API_BASE_URL}/${tipo}/${documento}?token=${API_TOKEN}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[API Peru Proxy] ApiPeru retornó status ${response.status}`);
      return NextResponse.json(
        { success: false, message: `Error al consultar el ${tipo.toUpperCase()} con el proveedor.` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The new API doesn't always wrap in `data: {}` and doesn't always have a `success` flag.
    // If we have an error message, treat as error.
    if (data.message && data.success === false) {
       return NextResponse.json({ success: false, message: data.message });
    }

    // Let's normalize it to match the old format expected by the frontend
    const normalizedData: any = {
      success: true,
      data: {}
    };

    // Normalizar razon social para RUC
    if (tipo === 'ruc' && data.ruc) {
      normalizedData.data = {
         numero: data.ruc,
         nombre_o_razon_social: data.razonSocial,
         nombre_completo: data.razonSocial,
         estado: data.estado,
         condicion: data.condicion,
         direccion: data.direccion
      };
    }

    // Normalizar nombre completo para DNI
    if (tipo === 'dni' && data.dni) {
      const nombres = data.nombres || '';
      const apellido_paterno = data.apellidoPaterno || '';
      const apellido_materno = data.apellidoMaterno || '';
      const nombreCompleto = `${nombres} ${apellido_paterno} ${apellido_materno}`.trim().replace(/\s+/g, ' ');
      
      normalizedData.data = {
         numero: data.dni,
         nombres: nombres,
         apellido_paterno: apellido_paterno,
         apellido_materno: apellido_materno,
         nombre_completo: nombreCompleto
      };
    }

    return NextResponse.json(normalizedData);
  } catch (error: any) {
    console.error('[API Peru Proxy] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno al consultar el documento.' },
      { status: 500 }
    );
  }
}
