import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar los 5 MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `logo_${Date.now()}.${ext}`;
    const filePath = `negocios/${fileName}`;

    // Convertir el File a un Buffer para que funcione en Node.js runtime
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[upload-logo] Error storage:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/logos/${filePath}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[upload-logo] Error inesperado:', err);
    return NextResponse.json({ error: err.message ?? 'Error inesperado' }, { status: 500 });
  }
}
