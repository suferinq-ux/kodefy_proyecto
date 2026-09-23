'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Menu, X, Settings, RotateCcw, Navigation, Navigation2, LogOut, Building, MessageSquare, Trash2, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hasPermission } from '@/lib/roles';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitcher from '@/components/ThemeSwitcher';

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
            { icon: MessageSquare, label: 'WhatsApp IA', href: '/whatsapp', permission: 'pos' },
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
            { icon: Archive, label: 'Inventario', href: '/inventario', permission: 'reportes' },
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: Trash2, label: 'Anulaciones', href: '/anulaciones', permission: 'anulaciones' },
            { icon: RotateCcw, label: 'Restablecer', href: '/mantenimiento', permission: 'configuracion' },
            { icon: Settings, label: 'Configuración', href: '/configuracion', permission: 'configuracion' },
        ]
    }
];

// ────────────────────────────────────────────────────────────────────
// Helper: genera un color ligeramente más oscuro para gradientes
// ────────────────────────────────────────────────────────────────────
function darkenHex(hex: string, amount: number): string {
    const h = hex.replace('#', '');
    const num = parseInt(h, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export default function Navbar() {
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();
    const { business } = useBusiness();
    const { theme } = useTheme();
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
    const isDarkSidebar = theme === 'dark' || theme === 'brand';

    // ── Estilos derivados del tema para el sidebar ──
    const sidebarBg = theme === 'brand'
        ? { background: `linear-gradient(180deg, ${primaryColor}, ${darkenHex(primaryColor, 40)})` }
        : theme === 'dark'
            ? { background: '#0f172a' }
            : { background: '#ffffff' };

    const sidebarBorder = isDarkSidebar ? 'border-white/10' : 'border-slate-100';

    const sectionTitleClass = isDarkSidebar
        ? 'text-white/40'
        : 'text-slate-400';

    const menuItemBase = isDarkSidebar
        ? 'text-white/70 hover:text-white hover:bg-white/10 font-semibold'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-semibold';

    const menuItemIconBase = isDarkSidebar
        ? 'text-white/50 group-hover:text-white'
        : 'text-slate-400 group-hover:text-slate-600';

    const menuItemActive = 'text-white font-bold';
    const menuItemActiveBg = isDarkSidebar
        ? { backgroundColor: 'rgba(255,255,255,0.15)', boxShadow: 'none' }
        : { backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` };

    const userNameClass = isDarkSidebar ? 'text-white' : 'text-slate-900';
    const userRoleClass = isDarkSidebar ? 'text-white/50' : 'text-slate-400';
    const logoutClass = isDarkSidebar
        ? 'text-white/40 hover:text-red-300 hover:bg-white/5'
        : 'text-slate-400 hover:text-red-500 hover:bg-red-50';
    const dividerClass = isDarkSidebar ? 'bg-white/10' : 'bg-slate-100';
    const footerBg = isDarkSidebar ? 'bg-black/10' : 'bg-slate-50/30';
    const footerBorder = isDarkSidebar ? 'border-white/10' : 'border-slate-50';

    // Branding section component
    const BrandingHeader = ({ size = 'normal', forceDark = false }: { size?: 'normal' | 'small'; forceDark?: boolean }) => {
        const dark = forceDark || isDarkSidebar;
        return (
            <div className="flex items-center gap-3">
                <div className={`relative ${size === 'small' ? 'w-9 h-9' : 'w-10 h-10'} rounded-lg overflow-hidden shadow-sm flex items-center justify-center ${
                    dark ? 'bg-white/20 border border-white/20' : 'bg-slate-50 border border-slate-100'
                }`}>
                    {business?.logo_url ? (
                        <img src={business.logo_url} alt={business.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <Building size={18} className={dark ? 'text-white/70' : 'text-slate-400'} />
                    )}
                </div>
                <div>
                    <h1 className={`text-sm font-black leading-none tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {business?.nombre || 'KODEFY'}
                    </h1>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${dark ? 'text-white/50' : ''}`}
                       style={dark ? {} : { color: primaryColor }}>
                        Sistema POS
                    </p>
                </div>
            </div>
        );
    };

    // ── Componente reutilizable para el menú del sidebar ──
    const SidebarMenu = ({ mobile = false }: { mobile?: boolean }) => (
        <nav className={`flex-1 ${mobile ? 'py-6 px-4' : 'py-4 px-3'} overflow-y-auto no-scrollbar`}>
            {filteredSections.map((section, sectionIndex) => (
                <div key={section.title} className={mobile ? 'mb-6' : 'mb-4'}>
                    {sectionIndex > 0 && (
                        <div className={`mx-2 ${mobile ? 'mb-4' : 'mb-3'} h-px ${dividerClass}`} />
                    )}
                    <p className={`text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 mb-2 ${sectionTitleClass}`}>
                        {section.title}
                    </p>
                    <div className="space-y-0.5">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link key={item.href} href={buildHref(item.href)}
                                    onClick={mobile ? () => setSidebarOpen(false) : undefined}>
                                    <div
                                        className={`flex items-center gap-3 ${mobile ? 'px-5 py-3.5' : 'px-4 py-2.5'} rounded-lg text-[13px] transition-all duration-200 group ${
                                            active ? menuItemActive : menuItemBase
                                        }`}
                                        style={active ? menuItemActiveBg : {}}
                                    >
                                        <Icon size={mobile ? 20 : 18} className={active
                                            ? 'text-white'
                                            : `${menuItemIconBase} transition-colors`
                                        } />
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {item.href === '/whatsapp' && (
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                                active
                                                    ? 'bg-amber-400 text-slate-950'
                                                    : isDarkSidebar
                                                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                            }`}>
                                                BETA
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );

    // ── Componente de perfil del usuario ──
    const UserProfile = () => (
        <div className={`border-t ${footerBorder} p-4 ${footerBg}`}>
            <div className="flex items-center gap-3 mb-3 p-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black"
                    style={{ backgroundColor: isDarkSidebar ? 'rgba(255,255,255,0.2)' : primaryColor }}>
                    {user.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black truncate tracking-tight ${userNameClass}`}>{user.nombre}</p>
                    <p className={`text-[10px] capitalize font-bold ${userRoleClass}`}>{user.rol}</p>
                </div>
            </div>
            <button onClick={logout}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${logoutClass}`}>
                <LogOut size={14} />
                <span>Cerrar Sesión</span>
            </button>
        </div>
    );

    return (
        <>
            {/* ═══════════════ SIDEBAR (Desktop) ═══════════════ */}
            <aside
                className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-50 ${
                    isDarkSidebar ? '' : 'border-r border-slate-100'
                } shadow-[2px_0_15px_rgba(0,0,0,0.06)]`}
                style={sidebarBg}
            >
                <div className={`flex items-center gap-3 px-5 py-6 border-b ${sidebarBorder}`}>
                    <BrandingHeader />
                </div>

                <SidebarMenu />

                <ThemeSwitcher variant={isDarkSidebar ? 'branded' : 'default'} />

                <UserProfile />
            </aside>

            {/* ═══════════════ MOBILE HEADER ═══════════════ */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-none bg-slate-50 border border-slate-100 text-slate-600 active:scale-95 transition-all"
                    >
                        <Menu size={22} />
                    </button>
                    <BrandingHeader size="small" forceDark={false} />
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

            {/* ═══════════════ BOTTOM NAV (Mobile) ═══════════════ */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-around h-20 px-4">
                    {[
                        { icon: Home, label: 'Inicio', href: '/dashboard', permission: 'dashboard' },
                        { icon: ShoppingCart, label: 'Pedidos', href: '/pos', permission: 'pos' },
                        { icon: Package, label: 'Ventas', href: '/ventas', permission: 'ventas' },
                        { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
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

            {/* ═══════════════ MOBILE SIDEBAR DRAWER ═══════════════ */}
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
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 max-w-[85vw] z-[80] shadow-2xl flex flex-col"
                            style={sidebarBg}
                        >
                            <div className={`flex items-center justify-between px-4 py-4 border-b ${sidebarBorder}`}>
                                <BrandingHeader />
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                        isDarkSidebar
                                            ? 'bg-white/10 text-white/60 hover:bg-white/20'
                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <SidebarMenu mobile />

                            <ThemeSwitcher variant={isDarkSidebar ? 'branded' : 'default'} />

                            <UserProfile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
