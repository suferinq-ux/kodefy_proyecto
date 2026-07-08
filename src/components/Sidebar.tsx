'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Users, Boxes, LucideIcon, X, Wine, Settings, RotateCcw, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { hasPermission } from '@/lib/roles';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    href: string;
    permission: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const menuSections: MenuSection[] = [
    {
        title: 'Tablero',
        items: [
            { icon: Home, label: 'Inicio', href: '/dashboard', permission: 'dashboard' },
        ]
    },
    {
        title: 'Operaciones',
        items: [
            { icon: ShoppingCart, label: 'Pedidos', href: '/pos', permission: 'pos' },
            { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
            { icon: Navigation, label: 'Entregas', href: '/delivery', permission: 'delivery' },
        ]
    },
    {
        title: 'Caja y Control',
        items: [
            { icon: ClipboardList, label: 'Apertura de Día', href: '/apertura', permission: 'apertura' },
            { icon: Package, label: 'Caja y Ventas', href: '/ventas', permission: 'ventas' },
            { icon: Lock, label: 'Cierre de Caja', href: '/cierre', permission: 'cierre' },
        ]
    },
    {
        title: 'Administración',
        items: [
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: RotateCcw, label: 'Restablecer Sistema', href: '/mantenimiento', permission: 'configuracion' },
            { icon: Settings, label: 'Configuración', href: '/configuracion', permission: 'configuracion' },
        ]
    }
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { business } = useBusiness();

    // Esperar a que termine de cargar el usuario 
    if (loading) {
        return (
            <>
                {/* Desktop sidebar loading */}
                <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 glass-panel z-50 items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Cargando menú...</p>
                    </div>
                </aside>
                {/* Mobile sidebar loading */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                                onClick={onClose}
                            />
                            <motion.aside
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="lg:hidden fixed left-0 top-0 h-screen w-72 glass-panel z-50 flex items-center justify-center"
                            >
                                <div className="text-white text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-2"></div>
                                    <p className="text-sm">Cargando menú...</p>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </>
        );
    }

    // Si no hay usuario después de cargar, no mostrar nada
    if (!user) {
        return null;
    }

    // Filtrar secciones según el rol del usuario
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(user.rol, item.permission))
    })).filter(section => section.items.length > 0);

    const handleLinkClick = () => {
        // Cerrar sidebar en móvil al hacer clic en un enlace
        if (onClose) {
            onClose();
        }
    };

    const SidebarContent = () => (
        <>
            {/* Efecto de brillo animado en el fondo */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-white/20 via-transparent to-transparent shine-effect" />
            </div>

            {/* Botón cerrar (solo móvil) */}
            <button
                onClick={onClose}
                className="lg:hidden absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
                <X size={20} />
            </button>

            {/* Logo/Header */}
            <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                }}
                className="relative p-3 border-b border-slate-100"
            >
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-200/20 blur-2xl rounded-full" />
                    <div className="relative">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center justify-center"
                        >
                            <div className="relative w-28 h-28 lg:w-36 lg:h-36">
                                {business?.logo_url ? (
                                    <img
                                        src={business.logo_url}
                                        alt={business.nombre}
                                        className="object-contain w-full h-full drop-shadow-md"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-full">
                                        <span className="text-slate-400 font-bold text-xl">{business?.nombre?.charAt(0) || 'K'}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                        <motion.p
                            className="text-slate-900 text-md text-center font-bold mt-2 drop-shadow-md uppercase italic tracking-tighter"
                        >
                            {business?.nombre || 'KODEFY TECH SAAS'}
                        </motion.p>
                    </div>
                </div>
            </motion.div>

            {/* Navigation Menu con secciones */}
            <nav className="flex-1 p-3 overflow-y-auto">
                {filteredSections.map((section, sectionIndex) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sectionIndex * 0.1 }}
                        className="mb-8"
                    >
                        {/* Divisor Visual si no es la primera sección */}
                        {sectionIndex > 0 && (
                            <div className="mx-3 mb-6 h-px bg-slate-100" />
                        )}

                        {/* Título de sección */}
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-4 italic">
                            {section.title}
                        </p>

                        {/* Items de la sección */}
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const fullHref = business ? `/${business.slug}${item.href}` : item.href;
                                const isActive = pathname === fullHref || pathname?.startsWith(`${fullHref}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={fullHref}
                                        onClick={handleLinkClick}
                                        className="block"
                                    >
                                        <motion.div
                                            whileHover={{ x: 4, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-none
                                                transition-all duration-200 relative
                                            `}
                                            style={isActive ? { backgroundColor: 'var(--theme-primary)', color: 'white' } : {}}
                                        >
                                            <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                                            <span className={`font-medium text-sm ${!isActive ? 'text-slate-600' : ''}`}>
                                                {item.label}
                                            </span>

                                            {/* Indicador de activo */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeIndicator"
                                                    className="absolute right-2 w-1.5 h-1.5 bg-white rounded-none"
                                                />
                                            )}
                                        </motion.div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                ))}
            </nav>

            {/* Footer con slogan */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-3 border-t border-slate-100 relative"
            >
                <div className="absolute inset-0 bg-linear-to-t from-slate-50 to-transparent" />
                <p className="text-slate-400 text-[10px] text-center font-bold relative z-10 italic uppercase tracking-wider">
                    &quot;La Pasión Hecha Sazón&quot;
                </p>
            </motion.div>

            {/* Efecto de borde derecho sutil */}
            <div className="absolute top-0 right-0 w-px h-full bg-slate-100" />
        </>
    );

    return (
        <>
            {/* Desktop Sidebar - siempre visible */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 glass-panel z-50 overflow-hidden flex-col">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar - overlay drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden fixed inset-0 bg-black/50 z-40"
                            onClick={onClose}
                        />
                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 max-w-[85vw] glass-panel z-50 overflow-hidden flex flex-col"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
