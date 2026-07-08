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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Beneficios', href: '#benefits' },
  { label: 'Contacto', href: '#contact' },
];

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Dashboard Inteligente',
    description:
      'Visualiza ventas, inventario y métricas clave en tiempo real desde un solo panel.',
  },
  {
    icon: Zap,
    title: 'POS Ultra-rápido',
    description:
      'Registra ventas en segundos. Interfaz optimizada para alta velocidad con teclas rápidas.',
  },
  {
    icon: Cloud,
    title: 'Inventario Sincronizado',
    description:
      'Stock actualizado al instante entre sucursales. Control total de mermas y reposiciones.',
  },
  {
    icon: Smartphone,
    title: 'Multi-dispositivo',
    description:
      'Accede desde cualquier dispositivo. Compatible con tablets, laptops y desktop. Sin instalación.',
  },
  {
    icon: Globe,
    title: 'Multi-sucursal',
    description:
      'Administra todas tus sucursales desde un solo lugar. Datos centralizados en la nube.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad Empresarial',
    description:
      'Encriptación de extremo a extremo, backups automáticos y cumplimiento de estándares de seguridad.',
  },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Aumenta tus ventas',
    description: 'Nuestros clientes reportan un incremento promedio del 30% en ventas tras el primer mes.',
  },
  {
    icon: Zap,
    title: 'Reduce tiempos de operación',
    description: 'Automatiza tareas repetitivas. Personal más enfocado en atender, menos en papeleo.',
  },
  {
    icon: Users,
    title: 'Controla tu equipo',
    description: 'Roles y permisos por usuario. Cada empleado ve solo lo que necesita para su trabajo.',
  },
  {
    icon: BarChart3,
    title: 'Toma decisiones inteligentes',
    description: 'Reportes automáticos con insights procesables. Deja de adivinar y empieza a medir.',
  },
];

const LOGOS = [
  { src: '/images/logo-rodrigos.jpeg', name: "Rodrigo's Pollería" },
  { src: '/images/logo-pocholos.png', name: 'Pocholos' },
  { src: '', name: 'Tu negocio aquí' },
  { src: '/images/logo-rodrigos.jpeg', name: "Rodrigo's Pollería" },
  { src: '/images/logo-pocholos.png', name: 'Pocholos' },
  { src: '', name: 'Tu negocio aquí' },
];

const STATS = [
  { value: '500+', label: 'Negocios activos' },
  { value: 'S/ 2M+', label: 'Transacciones mensuales' },
  { value: '99.9%', label: 'Uptime garantizado' },
  { value: '24/7', label: 'Soporte disponible' },
];

function TrustedByCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!trackRef.current) return;

    const track = trackRef.current;
    const clones = track.querySelectorAll('.logo-card');
    const totalWidth = track.scrollWidth / 2; // middle set width

    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
    tl.to(track, { x: -totalWidth, duration: 20, ease: 'linear' });
    tl.set(track, { x: 0 });

    // Pause on hover
    track.addEventListener('mouseenter', () => tl.pause());
    track.addEventListener('mouseleave', () => tl.play());

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden mask-gradient">
      <div ref={trackRef} className="flex items-center gap-12 w-max">
        {/* Double set for seamless loop */}
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <div key={i} className="logo-card group flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-36 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 group-hover:border-blue-300 dark:group-hover:border-blue-500/30 group-hover:shadow-lg dark:group-hover:shadow-blue-500/5 transition-all duration-300">
              {logo.src ? (
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-14 max-w-[85%] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M16 8h.01" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      {/* ───── Navbar ───── */}
      <header
        id="hero"
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm'
            : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              <img
                src="/images/kodefy_logoreal.png"
                alt="Kodefy"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-white/5 transition-all active:scale-[0.98] inline-flex items-center gap-2"
              >
                Comenzar gratis
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
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
              className="lg:hidden border-t border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => {
                      scrollTo(link.href);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-3 space-y-2">
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full text-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Comenzar gratis
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ───── Hero Section ───── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold mb-8">
              <Zap size={12} />
              NUEVO: Plan Starter desde S/ 49 al mes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
              Digitaliza y escala{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                tu negocio
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              El sistema POS multi-inquilino que centraliza ventas, inventario y
              operaciones. Diseñado para negocios que quieren crecer sin perder
              el control.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-xl shadow-slate-900/10 dark:shadow-white/5 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                Empieza ahora
                <ArrowRight size={18} />
              </Link>
              <button
                onClick={() => scrollTo('#features')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Ver funcionalidades
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── Trusted By ───── */}
      <section className="py-16 lg:py-20 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10"
        >
          Negocios que confían en nosotros
        </motion.p>

        <TrustedByCarousel />
      </section>

      {/* ───── Features Section ───── */}
      <section id="features" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
              Funcionalidades
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Todo lo que necesitas en{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                un solo lugar
              </span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto font-medium">
              Desde el punto de venta hasta los reportes financieros. Kodefy TECH
              cubre cada aspecto de la operación de tu negocio.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/20 hover:shadow-lg dark:hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon size={22} />
                </div>
                <h3 className="text-base font-black tracking-tight mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Benefits Section ───── */}
      <section
        id="benefits"
        className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900/50 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
              Beneficios
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Hecho para{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                resultados reales
              </span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto font-medium">
              No es otra herramienta más. Es la plataforma que tu negocio
              necesita para operar con eficiencia profesional.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex gap-4 p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <benefit.icon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight mb-1.5">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section id="contact" className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-[120px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              ¿Listo para transformar{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                tu negocio
              </span>
              ?
            </h2>
            <p className="mt-5 text-lg text-slate-300/80 max-w-xl mx-auto leading-relaxed font-medium">
              Escríbenos por WhatsApp y recibe una cotización personalizada en minutos.
              Sin compromisos, sin letras chiquitas.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://wa.me/51989227176?text=Hola%20Kodefy%20TECH%2C%20quiero%20informaci%C3%B3n%20sobre%20sus%20planes"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-3"
              >
                <MessageCircle size={22} />
                Cotizar por WhatsApp
                <ArrowRight size={18} />
              </a>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white border-2 border-white/20 hover:bg-white/10 hover:border-white/30 transition-all inline-flex items-center justify-center gap-2"
              >
                Probar gratis 14 días
              </Link>
            </div>

            <p className="mt-8 text-sm text-slate-500">
              También disponible:{' '}
              <span className="font-bold text-slate-400">+51 989 227 176</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="py-14 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center">
              <img
                src="/images/kodefy_logoreal.png"
                alt="Kodefy"
                className="h-12 w-auto object-contain"
              />
              <span className="font-black text-base tracking-tight">
                Kodefy<span className="text-blue-600 dark:text-blue-400">TECH</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <button onClick={() => scrollTo('#features')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollTo('#benefits')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Beneficios
              </button>
              <button onClick={() => scrollTo('#contact')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Contacto
              </button>
              <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Iniciar sesión
              </Link>
              <Link href="/register" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Registrarse
              </Link>
            </div>

            <p className="text-xs font-medium text-slate-400 dark:text-slate-600">
              &copy; {new Date().getFullYear()} Kodefy TECH. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
