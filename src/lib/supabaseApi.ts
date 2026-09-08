import { supabase } from './supabase';

async function fetchDbApi(method: string, body: any) {
    const sessionData = await supabase.auth.getSession();
    const token = sessionData.data.session?.access_token;

    const response = await fetch('/api/db', {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    });

    const resData = await response.json();
    if (!response.ok) {
        throw new Error(resData.error || 'Error en operación de base de datos');
    }

    return resData;
}

export async function dbInsert(table: string, data: any, options?: { select?: string, single?: boolean }) {
    return fetchDbApi('POST', { table, data, options });
}

export async function dbUpdate(table: string, data: any, filters?: Record<string, any>, options?: { select?: string, single?: boolean }) {
    return fetchDbApi('PUT', { table, data, filters, options });
}

export async function dbDelete(table: string, filters?: Record<string, any>, options?: { select?: string, single?: boolean }) {
    return fetchDbApi('DELETE', { table, filters, options });
}

export async function dbUpsert(table: string, data: any, options?: { onConflict?: string, select?: string, single?: boolean }) {
    return fetchDbApi('PATCH', { table, data, options });
}
