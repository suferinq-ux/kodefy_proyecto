'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Smartphone,
  Cloud,
  Check,
  TrendingUp,
  Users,
  Globe,
  MessageCircle,
  ChevronRight,
  Star,
  Package,
  CreditCard,
  Printer,
  LayoutDashboard,
  ClipboardList,
  Bell,
  Lock,
  RefreshCw,
  PieChart,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Beneficios', href: '#benefits' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Contacto', href: '#contact' },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    tag: 'Dashboard',
    title: 'Panel de control en tiempo real',
    description:
      'Visualiza el estado de tu negocio al instante. Ventas del día, productos más vendidos, caja abierta y métricas clave en un solo vistazo.',
    details: [
      'Gráficas de ventas por hora, día y mes',
      'Ranking de productos más vendidos',
      'Estado de caja en tiempo real',
      'Alertas de stock mínimo',
    ],
    color: 'blue',
  },
  {
    icon: Zap,
    tag: 'Punto de Venta',
    title: 'POS ultra-rápido y sin fricción',
    description:
      'Registra ventas en segundos con una interfaz diseñada para la velocidad. Teclas rápidas, búsqueda instantánea y flujo optimizado.',
    details: [
      'Búsqueda de productos por nombre o código',
      'Comandas y pedidos por mesa',
      'Múltiples métodos de pago (efectivo, Yape, Plin, tarjeta)',
      'Impresión de tickets y comandas automática',
    ],
    color: 'indigo',
  },
  {
    icon: Package,
    tag: 'Inventario',
    title: 'Control de inventario inteligente',
    description:
      'Mantén el stock siempre actualizado. Cada venta descuenta automáticamente del inventario. Reposición proactiva para nunca quedarte sin producto.',
    details: [
      'Descuento automático por venta',
      'Alertas de stock mínimo configurable',
      'Control de mermas y ajustes',
      'Historial de movimientos completo',
    ],
    color: 'emerald',
  },
  {
    icon: Globe,
    tag: 'Multi-sucursal',
    title: 'Administra todas tus sedes',
    description:
      'Un solo sistema para todas tus ubicaciones. Datos centralizados en la nube, cada sucursal opera de forma independiente pero tú ves todo.',
    details: [
      'Vista unificada de todas las sedes',
      'Inventario independiente por sucursal',
      'Reportes consolidados y por sede',
      'Transferencia de stock entre sucursales',
    ],
    color: 'violet',
  },
  {
    icon: PieChart,
    tag: 'Reportes',
    title: 'Reportes y análisis profundo',
    description:
      'Toma decisiones basadas en datos reales. Exporta reportes, analiza tendencias y conoce exactamente qué productos son los más rentables.',
    details: [
      'Reporte de ventas por período, cajero y producto',
      'Cierre de caja detallado',
      'Exportación a Excel y PDF',
      'Comparativas de rendimiento por sucursal',
    ],
    color: 'amber',
  },
  {
    icon: Users,
    tag: 'Equipo',
    title: 'Roles y permisos por usuario',
    description:
      'Asigna accesos específicos a cada miembro de tu equipo. Cajeros, administradores, supervisores: cada uno ve solo lo que necesita.',
    details: [
      'Roles predefinidos y personalizables',
      'Registro de actividad por usuario',
      'Control de descuentos y anulaciones',
      'Múltiples cajeros simultáneos',
    ],
    color: 'rose',
  },
  {
    icon: CreditCard,
    tag: 'Pagos',
    title: 'Todos los medios de pago',
    description:
      'Acepta cualquier método de pago que tu cliente prefiera. Integración con las apps más usadas en Perú.',
    details: [
      'Efectivo con cálculo de vuelto',
      'Yape y Plin con QR dinámico',
      'Tarjeta de crédito y débito',
      'Pago dividido entre varios métodos',
    ],
    color: 'cyan',
  },
  {
    icon: ShieldCheck,
    tag: 'Seguridad',
    title: 'Seguridad empresarial',
    description:
      'Tus datos están protegidos con los más altos estándares. Backups automáticos, encriptación y acceso controlado.',
    details: [
      'Encriptación end-to-end',
      'Backups automáticos diarios',
      'Acceso con 2FA opcional',
      '99.9% de uptime garantizado',
    ],
    color: 'slate',
  },
];

const PILLARS = [
  { icon: Zap,         title: 'Listo en minutos',         desc: 'Sin instalaciones ni configuraciones complejas. Tu equipo opera desde el primer día.' },
  { icon: Cloud,       title: 'Siempre en la nube',        desc: 'Accede desde cualquier dispositivo. Tus datos siempre seguros y disponibles.' },
  { icon: RefreshCw,   title: 'Actualizaciones incluidas', desc: 'Nuevas funciones sin costo adicional. El sistema mejora solo, tú no haces nada.' },
  { icon: Lock,        title: 'Datos solo tuyos',          desc: 'Información encriptada y aislada por negocio. Nadie más accede a tus datos.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '49',
    description: 'Para negocios que recién comienzan su digitalización.',
    features: [
      'Hasta 1 sucursal',
      'Hasta 3 usuarios',
      'POS completo',
      'Control de inventario',
      'Reportes básicos',
      'Soporte por WhatsApp',
    ],
    cta: 'Comenzar gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '99',
    description: 'Para negocios en crecimiento con mayor volumen.',
    features: [
      'Hasta 3 sucursales',
      'Usuarios ilimitados',
      'POS ultra-rápido',
      'Inventario multi-sede',
      'Reportes avanzados + Excel',
      'Gestión de mesas',
      'Soporte prioritario 24/7',
    ],
    cta: 'Empezar con Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'A consulta',
    description: 'Solución a medida para cadenas y franquicias.',
    features: [
      'Sucursales ilimitadas',
      'Usuarios ilimitados',
      'Integraciones a medida',
      'Onboarding dedicado',
      'SLA garantizado',
      'API acceso completo',
    ],
    cta: 'Hablar con ventas',
    highlighted: false,
  },
];

const colorMap: Record<string, { bg: string; text: string; badge: string; border: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-100',   dot: 'bg-blue-500'   },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500' },
  emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-100',dot: 'bg-emerald-500'},
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700', border: 'border-violet-100', dot: 'bg-violet-500' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-100',  dot: 'bg-amber-500'  },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   badge: 'bg-rose-100 text-rose-700',   border: 'border-rose-100',   dot: 'bg-rose-500'   },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700',   border: 'border-cyan-100',   dot: 'bg-cyan-500'   },
  slate:  { bg: 'bg-slate-100', text: 'text-slate-600',  badge: 'bg-slate-200 text-slate-700', border: 'border-slate-200',  dot: 'bg-slate-500'  },
};

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const c = colorMap[feature.color];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 2) * 0.1 }}
      className="group bg-white rounded-3xl border border-stone-200/80 p-8 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/60 transition-all duration-500 flex flex-col gap-6"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', c.bg)}>
          <feature.icon className={cn('w-6 h-6', c.text)} strokeWidth={1.75} />
        </div>
        <span className={cn('text-xs font-bold px-3 py-1 rounded-full tracking-wide', c.badge)}>
          {feature.tag}
        </span>
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-2 leading-snug">
          {feature.title}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Details list */}
      <ul className={cn('space-y-2.5 pt-4 border-t', c.border)}>
        {feature.details.map((d) => (
          <li key={d} className="flex items-start gap-2.5">
            <span className={cn('w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0', c.dot)} />
            <span className="text-sm text-stone-600 font-medium leading-snug">{d}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const WA_LINK =
    'https://wa.me/51989227176?text=Hola%20Kodefy%20TECH%2C%20quiero%20informaci%C3%B3n%20sobre%20sus%20planes';

  return (
    <div
      className="min-h-screen text-stone-900 overflow-x-hidden"
      style={{ backgroundColor: '#FAFAF8', fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
    >
      {/* ───── Navbar ───── */}
      <header
        id="hero"
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-white/85 backdrop-blur-2xl border-b border-stone-200/60 shadow-sm shadow-stone-900/[0.04]'
            : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img
                src="/images/KODEFY-LOGO.png"
                alt="KodifyTech"
                className="h-8 w-auto object-contain"
                style={{ filter: 'brightness(0)' }}
              />
              <div className="text-[1.15rem] font-black tracking-tight uppercase flex leading-none">
                <span className="text-stone-900">KODEFY</span>
                <span className="text-blue-600">TECH</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100/80 transition-all duration-200"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                Iniciar sesión
              </Link>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 transition-all duration-200 shadow-lg shadow-stone-900/15 active:scale-[0.98]"
              >
                <MessageCircle size={15} strokeWidth={2} />
                Cotizar ahora
              </a>
            </div>

            {/* Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-stone-600"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-stone-200 bg-white/95 backdrop-blur-xl"
            >
              <div className="px-5 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => { scrollTo(link.href); setMobileMenuOpen(false); }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-all"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-3 space-y-2">
                  <Link href="/login" className="block w-full text-center px-4 py-3 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-100 transition-all" onClick={() => setMobileMenuOpen(false)}>
                    Iniciar sesión
                  </Link>
                  <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-white bg-stone-900 transition-all">
                    <MessageCircle size={16} />
                    Cotizar por WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───── Hero ───── */}
      <section className="relative pt-36 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Subtle radial background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.05) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm text-xs font-bold text-stone-500 tracking-widest uppercase mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema POS Multi-inquilino · Perú
            </div>

            <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-black tracking-[-0.03em] leading-[1.04] text-stone-900 max-w-4xl mx-auto">
              El sistema que hace{' '}
              <span
                className="relative inline-block"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                crecer
              </span>{' '}
              tu negocio
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed font-[450]">
              Ventas, inventario, caja y reportes en un solo lugar. Diseñado para restaurantes,
              pollerías y negocios que quieren operar con eficiencia profesional.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 active:scale-[0.98] shadow-xl"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 8px 32px rgba(22,163,74,0.25)' }}
              >
                <MessageCircle size={20} strokeWidth={2} />
                Cotizar por WhatsApp
                <ArrowRight size={16} />
              </a>
              <button
                onClick={() => scrollTo('#features')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-stone-700 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all duration-200 shadow-sm"
              >
                Ver funcionalidades
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>

          {/* Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-2xl border border-stone-200/80 p-5 text-left shadow-sm flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-stone-600" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900 leading-snug">{p.title}</p>
                  <p className="text-xs text-stone-400 font-medium mt-1 leading-snug">{p.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───── Social Proof band ───── */}
      <section className="py-10 border-y border-stone-200/80 bg-white/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <p className="text-center text-xs font-bold text-stone-400 uppercase tracking-widest mb-8">
            Negocios que confían en KodifyTech
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 opacity-70">
            <img src="/images/logo-rodrigos.jpeg" alt="Rodrigo's" className="h-10 object-contain grayscale" />
            <img src="/images/logo-pocholos.png" alt="Pocholos" className="h-10 object-contain grayscale" />
            <div className="flex items-center gap-2 text-stone-400">
              <span className="text-sm font-bold">Tu negocio aquí</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Features Section ───── */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-16"
          >
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">
              Funcionalidades
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-stone-900 leading-tight">
              Todo lo que necesitas,{' '}
              <span className="text-stone-400">sin lo que no necesitas.</span>
            </h2>
            <p className="mt-5 text-lg text-stone-500 font-[450] leading-relaxed">
              Cada función fue construida pensando en negocios reales. Nada de tecnología innecesaria,
              solo herramientas que generan resultados desde el primer día.
            </p>
          </motion.div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section
        id="benefits"
        className="py-24 lg:py-32 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F5F5F0 0%, #FAFAF8 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">Beneficios reales</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-stone-900">
              Resultados desde el primer día
            </h2>
            <p className="mt-5 text-lg text-stone-500 max-w-xl mx-auto font-[450]">
              No es otra herramienta más. Es el sistema que tus competidores ya deberían tener.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                metric: '+30%',
                title: 'Incremento en ventas',
                desc: 'Nuestros clientes reportan un incremento promedio del 30% en ventas durante el primer trimestre, gracias a la velocidad del POS y mejor control del stock.',
                color: 'emerald',
              },
              {
                icon: Zap,
                metric: '-60%',
                title: 'Menos tiempo operativo',
                desc: 'Automatiza cierres de caja, reportes y control de inventario. Tus empleados dedican más tiempo a atender clientes y menos a papeleo manual.',
                color: 'blue',
              },
              {
                icon: ShieldCheck,
                metric: '0',
                title: 'Errores en caja',
                desc: 'El sistema calcula todo automáticamente. Vuelto exacto, descuentos, impuestos y cierre de caja sin errores humanos ni diferencias.',
                color: 'violet',
              },
            ].map((b, i) => {
              const c = colorMap[b.color];
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="bg-white rounded-3xl border border-stone-200/80 p-8 shadow-sm hover:shadow-lg transition-all duration-400"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-6', c.bg)}>
                    <b.icon className={cn('w-6 h-6', c.text)} strokeWidth={1.75} />
                  </div>
                  <p className={cn('text-5xl font-black mb-3 tracking-tight', c.text)}>{b.metric}</p>
                  <h3 className="text-lg font-bold text-stone-900 mb-3">{b.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed font-[450]">{b.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-4">Planes y precios</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] text-stone-900">
              Precio justo,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                valor máximo.
              </span>
            </h2>
            <p className="mt-5 text-lg text-stone-500 max-w-lg mx-auto font-[450]">
              Sin contratos anuales. Sin letras pequeñas. Cancela cuando quieras.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={cn(
                  'rounded-3xl p-7 flex flex-col gap-6 transition-all duration-300',
                  plan.highlighted
                    ? 'bg-stone-900 text-white shadow-2xl shadow-stone-900/30 scale-[1.03]'
                    : 'bg-white border border-stone-200/80 shadow-sm hover:shadow-md'
                )}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full w-fit">
                    <Star size={11} fill="currentColor" />
                    Más popular
                  </div>
                )}
                <div>
                  <p className={cn('text-sm font-bold uppercase tracking-widest mb-1', plan.highlighted ? 'text-stone-400' : 'text-stone-400')}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1">
                    {plan.price !== 'A consulta' && <span className={cn('text-sm font-semibold', plan.highlighted ? 'text-stone-400' : 'text-stone-400')}>S/</span>}
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                    {plan.price !== 'A consulta' && <span className={cn('text-sm mb-1 font-medium', plan.highlighted ? 'text-stone-400' : 'text-stone-500')}>/mes</span>}
                  </div>
                  <p className={cn('text-sm mt-2 font-[450]', plan.highlighted ? 'text-stone-400' : 'text-stone-500')}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <Check size={15} className={plan.highlighted ? 'text-emerald-400' : 'text-emerald-500'} strokeWidth={2.5} />
                      <span className={cn('text-sm font-medium', plan.highlighted ? 'text-stone-300' : 'text-stone-600')}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.98]',
                    plan.highlighted
                      ? 'bg-white text-stone-900 hover:bg-stone-100 shadow-lg'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  )}
                >
                  <MessageCircle size={15} />
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Final ───── */}
      <section id="contact" className="py-24 lg:py-32 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
        />
        {/* Orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-6">Empieza hoy</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-[-0.03em] leading-tight">
              Tu negocio merece{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #34d399 0%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                tecnología real.
              </span>
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto leading-relaxed font-[450]">
              Escríbenos ahora y recibe una cotización personalizada en menos de 10 minutos.
              Sin compromiso, sin letra chica.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-9 py-4.5 py-[18px] rounded-2xl text-base font-bold text-white transition-all duration-200 active:scale-[0.98] shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  boxShadow: '0 8px 40px rgba(22,163,74,0.35)',
                }}
              >
                <MessageCircle size={22} strokeWidth={2} />
                Escribir por WhatsApp
                <ArrowRight size={18} />
              </a>
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-[18px] rounded-2xl text-base font-bold text-white/80 border border-white/15 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                Probar 14 días gratis
              </Link>
            </div>

            <p className="mt-8 text-sm text-white/30">
              También puedes llamarnos: <span className="text-white/60 font-semibold">+51 989 227 176</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer
        className="py-12 border-t border-stone-200"
        style={{ backgroundColor: '#FAFAF8' }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/images/KODEFY-LOGO.png"
                alt="KodifyTech"
                className="h-7 w-auto object-contain"
                style={{ filter: 'brightness(0)' }}
              />
              <div className="text-base font-black tracking-tight uppercase flex">
                <span className="text-stone-900">KODEFY</span>
                <span className="text-blue-600">TECH</span>
              </div>
            </Link>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-stone-400">
              <button onClick={() => scrollTo('#features')} className="hover:text-stone-900 transition-colors">Funcionalidades</button>
              <button onClick={() => scrollTo('#benefits')} className="hover:text-stone-900 transition-colors">Beneficios</button>
              <button onClick={() => scrollTo('#pricing')} className="hover:text-stone-900 transition-colors">Precios</button>
              <Link href="/login" className="hover:text-stone-900 transition-colors">Iniciar sesión</Link>
            </div>

            <p className="text-xs font-medium text-stone-400">
              © {new Date().getFullYear()} Kodefy TECH. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
