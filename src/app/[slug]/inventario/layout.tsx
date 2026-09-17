'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, BookOpen, ArrowRightLeft, Settings, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { use } from 'react';

export default function InventarioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const pathname = usePathname();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const navItems = [
    { href: `/${slug}/inventario`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/${slug}/inventario/insumos`, label: 'Insumos', icon: Package, exact: false },
    { href: `/${slug}/inventario/recetas`, label: 'Recetas (BOM)', icon: BookOpen, exact: false },
    { href: `/${slug}/inventario/movimientos`, label: 'Movimientos', icon: ArrowRightLeft, exact: false },
    { href: `/${slug}/inventario/alertas`, label: 'Alertas', icon: AlertTriangle, exact: false },
    { href: `/${slug}/inventario/configuracion`, label: 'Configuración', icon: Settings, exact: false },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Sub-navegación limpia (Pills/Tabs) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Módulo de Inventario</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Control de Almacén</p>
            </div>
          </div>
        </div>
        
        <div className="px-2 sm:px-6 pt-2 pb-0 overflow-x-auto no-scrollbar bg-white">
          <nav className="flex space-x-1 sm:space-x-4 min-w-max">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative ${
                    isActive 
                      ? 'text-blue-600' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                  
                  {/* Indicador activo inferior */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.4)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Área de contenido principal */}
      <div className="pb-12">
        {children}
      </div>
    </div>
  );
}
