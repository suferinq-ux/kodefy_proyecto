'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Menu, X, Settings, RotateCcw, LogOut, Building, MessageSquare, Trash2, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { hasPermission } from '@/lib/roles';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const menuSections = [
    {
        title: 'Principal',
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
        title: 'Gestión',
        items: [
            { icon: ClipboardList, label: 'Apertura de Día', href: '/apertura', permission: 'apertura' },
            { icon: Package, label: 'Caja', href: '/ventas', permission: 'ventas' },
            { icon: Lock, label: 'Cierre de Caja', href: '/cierre', permission: 'cierre' },
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

// ── Helpers de color ──
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function darkenHex(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex);
    const dr = Math.max(0, r - amount);
    const dg = Math.max(0, g - amount);
    const db = Math.max(0, b - amount);
    return `#${((dr << 16) | (dg << 8) | db).toString(16).padStart(6, '0')}`;
}

function lightenHex(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.min(255, r + amount);
    const lg = Math.min(255, g + amount);
    const lb = Math.min(255, b + amount);
    return `#${((lr << 16) | (lg << 8) | lb).toString(16).padStart(6, '0')}`;
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

    // ── Paleta derivada del tema ──
    const colorLight = lightenHex(primaryColor, 30);
    const colorDark = darkenHex(primaryColor, 50);
    const colorVeryDark = darkenHex(primaryColor, 80);

    const sidebarStyle: React.CSSProperties = theme === 'brand'
        ? { background: `linear-gradient(175deg, ${colorLight} 0%, ${primaryColor} 35%, ${colorDark} 100%)` }
        : theme === 'dark'
            ? { background: `linear-gradient(175deg, #1e293b 0%, #0f172a 100%)` }
            : {};

    // ── Logo / Header ──
    const LogoSection = ({ compact = false }: { compact?: boolean }) => {
        if (compact) {
            return (
                <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-slate-50 border border-slate-100">
                        {business?.logo_url ? (
                            <img src={business.logo_url} alt={business.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <Building size={16} className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-none tracking-tight">
                            {business?.nombre || 'KODEFY'}
                        </h1>
                        <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: primaryColor }}>
                            Sistema POS
                        </p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center text-center py-6 px-4">
                <div className={`relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center mb-3 ${
                    isDarkSidebar ? 'bg-white/15 ring-2 ring-white/20' : 'bg-slate-50 border-2 border-slate-100'
                }`}>
                    {business?.logo_url ? (
                        <img src={business.logo_url} alt={business.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <Building size={28} className={isDarkSidebar ? 'text-white/60' : 'text-slate-400'} />
                    )}
                </div>
                <h1 className={`text-sm font-black leading-tight tracking-tight ${isDarkSidebar ? 'text-white' : 'text-slate-900'}`}>
                    {business?.nombre || 'KODEFY'}
                </h1>
            </div>
        );
    };

    // ── Menú del sidebar ──
    const SidebarMenu = ({ mobile = false }: { mobile?: boolean }) => (
        <nav className={`flex-1 ${mobile ? 'py-4 px-3' : 'py-2 px-3'} overflow-y-auto no-scrollbar`}>
            {filteredSections.map((section, idx) => (
                <div key={section.title} className={`${idx > 0 ? 'mt-5' : ''}`}>
                    <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] px-4 mb-2 ${
                        isDarkSidebar ? 'text-white/35' : 'text-slate-400'
                    }`}>
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
                                        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-all duration-200 group ${
                                            active
                                                ? isDarkSidebar
                                                    ? 'text-white font-bold bg-white/15 shadow-sm'
                                                    : 'text-white font-bold shadow-md'
                                                : isDarkSidebar
                                                    ? 'text-white/70 hover:text-white hover:bg-white/8 font-medium'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                                        }`}
                                        style={active && !isDarkSidebar ? { backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` } : {}}
                                    >
                                        <Icon size={18} strokeWidth={active ? 2.5 : 2} className={
                                            active
                                                ? 'text-white'
                                                : isDarkSidebar
                                                    ? 'text-white/50 group-hover:text-white transition-colors'
                                                    : 'text-slate-400 group-hover:text-slate-600 transition-colors'
                                        } />
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {active && (
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                isDarkSidebar ? 'bg-white' : 'bg-white/80'
                                            }`} />
                                        )}
                                        {item.href === '/whatsapp' && !active && (
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                                isDarkSidebar
                                                    ? 'bg-amber-400/20 text-amber-300'
                                                    : 'bg-amber-100 text-amber-800'
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

    return (
        <>
            {/* ═══════════════ DESKTOP SIDEBAR ═══════════════ */}
            <aside
                className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-50 ${
                    isDarkSidebar ? 'shadow-xl' : 'bg-white border-r border-slate-100 shadow-[2px_0_12px_rgba(0,0,0,0.04)]'
                }`}
                style={isDarkSidebar ? sidebarStyle : {}}
            >
                <LogoSection />

                <SidebarMenu />

                <ThemeSwitcher variant={isDarkSidebar ? 'branded' : 'default'} />

                {/* User footer */}
                <div className={`border-t p-3 ${isDarkSidebar ? 'border-white/10' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-2 px-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isDarkSidebar ? 'bg-white/15 text-white' : 'text-white'
                        }`} style={isDarkSidebar ? {} : { backgroundColor: primaryColor }}>
                            {user.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isDarkSidebar ? 'text-white' : 'text-slate-900'}`}>
                                {user.nombre}
                            </p>
                            <p className={`text-[10px] capitalize ${isDarkSidebar ? 'text-white/40' : 'text-slate-400'}`}>
                                {user.rol}
                            </p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                            isDarkSidebar
                                ? 'text-white/30 hover:text-red-300 hover:bg-white/5'
                                : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                        }`}>
                        <LogOut size={13} />
                        <span>Salir</span>
                    </button>
                </div>
            </aside>

            {/* ═══════════════ MOBILE HEADER ═══════════════ */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] backdrop-blur-xl border-b px-4 py-3 flex items-center justify-between shadow-sm"
                style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl border active:scale-95 transition-all"
                        style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}20`, color: primaryColor }}
                    >
                        <Menu size={22} />
                    </button>
                    <LogoSection compact />
                </div>
                <button
                    onClick={() => { if (confirm("¿Deseas cerrar sesión?")) logout(); }}
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black shadow-md border-2 border-white/50 active:scale-95 transition-all"
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
                                    <div className="p-2 rounded-xl transition-all"
                                        style={active ? { backgroundColor: `${primaryColor}12` } : {}}
                                    >
                                        <Icon size={active ? 20 : 18} strokeWidth={active ? 2.5 : 2} />
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
                            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="lg:hidden fixed left-0 top-0 h-screen w-72 max-w-[85vw] z-[80] shadow-2xl flex flex-col"
                            style={isDarkSidebar ? sidebarStyle : { background: '#ffffff' }}
                        >
                            {/* Close + Logo */}
                            <div className="relative">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl z-10 transition-colors ${
                                        isDarkSidebar
                                            ? 'bg-white/10 text-white/60 hover:bg-white/20'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    <X size={18} />
                                </button>
                                <LogoSection />
                            </div>

                            <SidebarMenu mobile />

                            <ThemeSwitcher variant={isDarkSidebar ? 'branded' : 'default'} />

                            {/* Mobile user footer */}
                            <div className={`border-t p-4 ${isDarkSidebar ? 'border-white/10' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                                        isDarkSidebar ? 'bg-white/15 text-white' : 'text-white'
                                    }`} style={isDarkSidebar ? {} : { backgroundColor: primaryColor }}>
                                        {user.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isDarkSidebar ? 'text-white' : 'text-slate-900'}`}>
                                            {user.nombre}
                                        </p>
                                        <p className={`text-[10px] capitalize ${isDarkSidebar ? 'text-white/40' : 'text-slate-400'}`}>
                                            {user.rol}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={logout}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                                        isDarkSidebar
                                            ? 'text-white/30 hover:text-red-300 hover:bg-white/5'
                                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                    }`}>
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
