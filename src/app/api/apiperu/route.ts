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

    const apiUrl = `${API_BASE_URL}/${tipo}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ [tipo]: documento })
    });

    if (!response.ok) {
      console.error(`[API Peru Proxy] ApiPeru.dev retornó status ${response.status}`);
      return NextResponse.json(
        { success: false, message: `Error al consultar el ${tipo.toUpperCase()} con el proveedor.` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalizar razon social para RUC
    if (tipo === 'ruc' && data.success && data.data && !data.data.nombre_completo) {
      data.data.nombre_completo = data.data.nombre_o_razon_social || data.data.razon_social;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API Peru Proxy] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno al consultar el documento.' },
      { status: 500 }
    );
  }
}
