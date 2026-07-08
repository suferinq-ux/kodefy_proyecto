export type UserRole = 'admin' | 'cajero' | 'mozo' | 'cocinero' | 'repartidor' | 'invitado';

export interface Usuario {
    id: string;
    negocio_id?: string;
    nombre: string;
    email: string;
    rol: UserRole;
    activo: boolean;
    es_super_admin?: boolean;
    created_at: string;
}

export interface AuthUser {
    usuario: Usuario;
    token?: string;
}

// Configuración de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    admin: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion', 'delivery'],
    cajero: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion'],
    mozo: ['dashboard', 'pos', 'mesas', 'cocina', 'ventas', 'delivery'],
    cocinero: ['cocina'],
    repartidor: ['delivery'],
    invitado: ['dashboard', 'apertura', 'pos', 'mesas', 'cocina', 'ventas', 'inventario', 'reportes', 'cierre', 'gastos', 'configuracion', 'delivery']
};

// Nombres amigables de roles
export const ROLE_NAMES: Record<UserRole, string> = {
    admin: 'Administrador',
    cajero: 'Cajero',
    mozo: 'Mozo',
    cocinero: 'Cocina',
    repartidor: 'Repartidor',
    invitado: 'Invitado (Solo Lectura)'
};

// Verificar si un rol es de solo lectura
export function isReadOnly(rol?: UserRole | string | null): boolean {
    return rol === 'invitado';
}

// Verificar si un rol tiene permiso para acceder a una ruta
export function hasPermission(rol: UserRole, route: string): boolean {
    const permissions = ROLE_PERMISSIONS[rol] || [];
    return permissions.includes(route);
}

// Obtener rutas permitidas para un rol
export function getAllowedRoutes(rol: UserRole): string[] {
    return ROLE_PERMISSIONS[rol] || [];
}
