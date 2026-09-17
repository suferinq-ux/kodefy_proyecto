'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

export default function InventarioDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [stats, setStats] = useState({
    totalInsumos: 0,
    alertasStock: 0,
    valorInventario: 0,
    movimientosHoy: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { count: totalInsumos } = await supabase
          .from('insumos')
          .select('*', { count: 'exact', head: true });

        const { count: alertasStock } = await supabase
          .from('insumos')
          .select('*', { count: 'exact', head: true })
          .filter('stock_actual', 'lte', 'stock_minimo');

        const { data: insumosData } = await supabase
          .from('insumos')
          .select('stock_actual, costo_promedio');
          
        const valorTotal = insumosData?.reduce((acc, insumo) => acc + (insumo.stock_actual * insumo.costo_promedio), 0) || 0;

        setStats({
          totalInsumos: totalInsumos || 0,
          alertasStock: alertasStock || 0,
          valorInventario: valorTotal,
          movimientosHoy: 12
        });
      } catch (error) {
        console.error('Error cargando dashboard', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [slug]);

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard de Inventario</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Insumos" 
          value={stats.totalInsumos.toString()} 
          icon={Package} 
          color="bg-blue-500" 
        />
        <DashboardCard 
          title="Alertas de Stock" 
          value={stats.alertasStock.toString()} 
          icon={AlertTriangle} 
          color="bg-red-500" 
          textColor="text-red-600"
        />
        <DashboardCard 
          title="Valor Total" 
          value={`S/ ${stats.valorInventario.toFixed(2)}`} 
          icon={DollarSign} 
          color="bg-emerald-500" 
        />
        <DashboardCard 
          title="Movimientos Hoy" 
          value={stats.movimientosHoy.toString()} 
          icon={TrendingDown} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Stock Crítico (Próximo a agotar)
          </h2>
          <p className="text-slate-500 text-sm">
            Listado de insumos que están por debajo de su stock mínimo configurado.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-500" />
            Últimos Movimientos
          </h2>
          <p className="text-slate-500 text-sm">
            Actividad reciente en el almacén (compras, ventas, ajustes).
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon: Icon, color, textColor = 'text-slate-800' }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center">
      <div className={`p-4 rounded-full ${color} bg-opacity-10 mr-4`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}
