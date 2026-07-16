'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Menu, X, Settings, RotateCcw, Navigation, Navigation2, LogOut, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { hasPermission } from '@/lib/roles';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const menuSections = [
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
            { icon: Navigation2, label: 'Radar Live', href: '/radar', permission: 'pos' },
        ]
    },
    {
        title: 'Caja y Control',
        items: [
            { icon: ClipboardList, label: 'Apertura', href: '/apertura', permission: 'apertura' },
            { icon: Package, label: 'Caja y Ventas', href: '/ventas', permission: 'ventas' },
            { icon: Lock, label: 'Cierre', href: '/cierre', permission: 'cierre' },
        ]
    },
    {
        title: 'Administración',
        items: [
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: RotateCcw, label: 'Restablecer', href: '/mantenimiento', permission: 'configuracion' },
            { icon: Settings, label: 'Configuración', href: '/configuracion', permission: 'configuracion' },
        ]
    }
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();
    const { business } = useBusiness();
    const [isMounted, setIsMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    if (loading || !user || !isMounted) return null;

    const slug = business?.slug || '';
    const buildHref = (href: string) => slug ? `/${slug}${href}` : href;
    const isActive = (href: string) => {
        const fullHref = buildHref(href);
        return pathname === fullHref || pathname?.startsWith(`${fullHref}/`);
    };

    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(user.rol, item.permission))
    })).filter(section => section.items.length > 0);

    const primaryColor = business?.color_primario || '#3b82f6';

    // Branding section component
    const BrandingHeader = ({ size = 'normal' }: { size?: 'normal' | 'small' }) => (
        <div className="flex items-center gap-3">
            <div className={`relative ${size === 'small' ? 'w-9 h-9' : 'w-10 h-10'} rounded-none overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center bg-slate-50`}>
                {business?.logo_url ? (
                    <img src={business.logo_url} alt={business.nombre} className="w-full h-full object-cover" />
                ) : (
                    <Building size={18} className="text-slate-400" />
                )}
            </div>
            <div>
                <h1 className={`${size === 'small' ? 'text-sm' : 'text-sm'} font-black text-slate-900 leading-none tracking-tight`}>
                    {business?.nombre || 'KODEFY'}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: primaryColor }}>
                    Sistema POS
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* SIDEBAR (Desktop) - siempre visible */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-50 bg-white border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-50">
                    <BrandingHeader />
                </div>

                <nav className="flex-1 py-4 px-3 overflow-y-auto no-scrollbar">
                    {filteredSections.map((section, sectionIndex) => (
                        <div key={section.title} className="mb-4">
                            {sectionIndex > 0 && (
                                <div className="mx-2 mb-4 h-px bg-slate-100" />
                            )}
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] px-4 mb-2">
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.href} href={buildHref(item.href)}>
                                            <div
                                                className={`flex items-center gap-3 px-4 py-2.5 rounded-none text-[13px] transition-all duration-200 group ${active
                                                    ? 'text-white font-bold shadow-md'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                                                    }`}
                                                style={active ? { backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` } : {}}
                                            >
                                                <item.icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-slate-50 p-4 bg-slate-50/30">
                    <div className="flex items-center gap-3 mb-3 p-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: primaryColor }}>
                            {user.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user.nombre}</p>
                            <p className="text-[10px] text-slate-400 capitalize font-bold">{user.rol}</p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-none text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-none bg-slate-50 border border-slate-100 text-slate-600 active:scale-95 transition-all"
                    >
                        <Menu size={22} />
                    </button>
                    <BrandingHeader size="small" />
                </div>
                <button
                    onClick={() => {
                        if (confirm("¿Deseas cerrar sesión?")) {
                            logout();
                        }
                    }}
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black shadow-md border-2 border-white active:scale-95 transition-all"
                    style={{ backgroundColor: primaryColor }}
                >
                    {user.nombre.charAt(0)}
                </button>
            </header>

            {/* BOTTOM NAV (Mobile Only) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-around h-20 px-4">
                    {[
                        { icon: Home, label: 'Inicio', href: '/dashboard', permission: 'dashboard' },
                        { icon: ShoppingCart, label: 'Pedidos', href: '/pos', permission: 'pos' },
                        { icon: Package, label: 'Ventas', href: '/ventas', permission: 'ventas' },
                        { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
                        { icon: Navigation, label: 'Entregas', href: '/delivery', permission: 'delivery' },
                    ].filter(item => hasPermission(user.rol, item.permission)).map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link key={item.href} href={buildHref(item.href)} className="flex-1 max-w-[80px]">
                                <div className={`flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-300 ${active ? '' : 'text-slate-400'}`}
                                    style={active ? { color: primaryColor } : {}}
                                >
                                    <div className={`p-2 rounded-none transition-all ${active ? 'scale-110' : 'active:scale-90'}`}
                                        style={active ? { backgroundColor: `${primaryColor}15` } : {}}
                                    >
                                        <Icon size={active ? 20 : 18} strokeWidth={active ? 3 : 2} />
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>
                                        {item.label}
                                    </span>
                                    {active && (
                                        <motion.div layoutId="bottom-dot" className="w-1 h-1 rounded-full absolute bottom-2" style={{ backgroundColor: primaryColor }} />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* MOBILE SIDEBAR - Overlay drawer */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden fixed inset-0 bg-black/50 z-[70]"
                            onClick={() => setSidebarOpen(false)}
                        />
                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 max-w-[85vw] z-[80] bg-white shadow-2xl flex flex-col"
                        >
                            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
                                <BrandingHeader />
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <nav className="flex-1 py-6 px-4 overflow-y-auto no-scrollbar">
                                {filteredSections.map((section) => (
                                    <div key={section.title} className="mb-8">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-3 italic">
                                            {section.title}
                                        </p>
                                        <div className="space-y-1">
                                            {section.items.map((item) => {
                                                const Icon = item.icon;
                                                const active = isActive(item.href);
                                                return (
                                                    <Link key={item.href} href={buildHref(item.href)} onClick={() => setSidebarOpen(false)}>
                                                        <div
                                                            className={`flex items-center gap-4 px-5 py-4 rounded-none text-sm transition-all active:scale-[0.98] ${active
                                                                ? 'text-white font-black shadow-lg'
                                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
                                                                }`}
                                                            style={active ? { backgroundColor: primaryColor, boxShadow: `0 6px 20px ${primaryColor}33` } : {}}
                                                        >
                                                            <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
                                                            <span className="tracking-tight">{item.label}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </nav>

                            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ backgroundColor: primaryColor }}>
                                        {user.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-900">{user.nombre}</p>
                                        <p className="text-[10px] text-slate-400 capitalize">{user.rol}</p>
                                    </div>
                                </div>
                                <button onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-none text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <LogOut size={14} />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
