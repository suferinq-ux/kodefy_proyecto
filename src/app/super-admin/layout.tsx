'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { name: 'Negocios', href: '/super-admin/negocios', icon: Building2 },
];

const STATS_QUICK = [
  { label: 'Plataforma', value: 'KODEFY', icon: Activity, href: '/super-admin' },
];

function SuperAdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.es_super_admin)) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.es_super_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldAlert size={22} className="text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const userInitial = user.nombre?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <Link
          href="/super-admin"
          className={cn(
            'flex items-center gap-3 h-16 px-4 border-b border-slate-100 dark:border-slate-800',
            collapsed && 'justify-center px-2'
          )}
        >
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={18} className="text-white" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <h1 className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-none">
                KODEFY
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Super Admin
              </p>
            </motion.div>
          )}
        </Link>

        {/* Navigation */}
        <nav className={cn('flex-1 py-4', collapsed ? 'px-2' : 'px-3')}>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-200 group relative',
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                  >
                    <item.icon size={collapsed ? 20 : 18} />
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-semibold text-sm"
                      >
                        {item.name}
                      </motion.span>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom controls */}
        <div className={cn('border-t border-slate-100 dark:border-slate-800', collapsed ? 'p-2' : 'p-3')}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 mb-2'
            )}
          >
            {isDark ? <Sun size={collapsed ? 20 : 18} /> : <Moon size={collapsed ? 20 : 18} />}
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-sm">
                {isDark ? 'Modo Claro' : 'Modo Oscuro'}
              </motion.span>
            )}
          </button>

          {/* User info */}
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.nombre}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  Super Admin
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className={cn(
                'p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all',
                collapsed && 'hidden'
              )}
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>

          {collapsed && (
            <button
              onClick={logout}
              className="w-full mt-2 flex justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.name || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistema Activo
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
    </ThemeProvider>
  );
}
