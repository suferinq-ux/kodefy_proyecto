'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo válido para continuar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || 'No pudimos enviar el correo. Intenta nuevamente.');
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950">
      {/* Left panel */}
      <div className="relative hidden lg:flex w-1/2 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-md text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail size={28} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">
              Restablece tu acceso
            </h1>
            <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
              Te enviaremos un enlace seguro para crear una nueva contraseña. Sin complicaciones.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 flex items-center gap-2 text-xs text-slate-500"
          >
            <ShieldCheck size={14} className="text-emerald-500/60" />
            <span>Enlace temporal · Caduca en 24 horas</span>
          </motion.div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-[400px]"
        >
          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            Volver al login
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-10 justify-center">
            <img src="/images/kodefy_logoreal.png" alt="KODEFY" className="h-14 w-auto object-contain" />
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <Mail size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Revisa tu correo
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Enviamos un enlace de recuperación a{' '}
                <span className="font-bold text-slate-700 dark:text-slate-200">{email.trim()}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Revisa también la carpeta de spam si no lo encuentras.
              </p>
              <div className="mt-8 space-y-3">
                <button
                  onClick={handleSubmit}
                  className="w-full h-12 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
                >
                  Reenviar enlace
                </button>
                <Link
                  href="/login"
                  className="block w-full h-12 rounded-xl font-bold text-sm text-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all leading-[48px]"
                >
                  Volver al login
                </Link>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Recuperar acceso
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 rounded-xl border px-4 py-3 mb-5 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                  >
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className={cn(
                      'mb-2 block text-xs font-bold uppercase tracking-wider transition-colors',
                      focused ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    Correo electrónico
                  </label>
                  <div className={cn(
                    'relative rounded-xl border transition-all duration-200',
                    focused
                      ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="tu@empresa.com"
                      className="w-full h-12 bg-transparent px-4 text-sm font-semibold rounded-xl outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className={cn(
                    'w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2',
                    email.trim() && !loading
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-white/5 active:scale-[0.98]'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </button>
              </form>
            </>
          )}

          {!sent && (
            <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              ¿Recuerdas tu contraseña?{' '}
              <Link
                href="/login"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}