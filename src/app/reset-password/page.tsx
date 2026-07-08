'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    setShowUI(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setHasSession(Boolean(data.session));
      })
      .catch(() => {
        if (!mounted) return;
        setHasSession(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const inputBaseClass = useMemo(() => {
    return [
      'h-11 w-full rounded-xl px-3',
      'bg-[#111827] text-slate-100 placeholder:text-slate-500',
      'border border-white/10',
      'outline-none transition duration-200 motion-reduce:transition-none',
      'focus-visible:border-[#3B82F6]/40 focus-visible:ring-2 focus-visible:ring-[#3B82F6]/20',
      'disabled:opacity-60 disabled:cursor-not-allowed',
    ].join(' ');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      setError('Tu nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'No pudimos actualizar la contraseña.');
        return;
      }

      setDone(true);
      // Limpieza conservadora: dejar la sesión en un estado claro.
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login'), 600);
    } catch (err: any) {
      console.error('[ResetPasswordPage] Error:', err);
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F14] text-slate-100 font-[var(--font-inter)] flex items-center justify-center px-6 py-12">
      <div
        className={[
          'w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-8',
          'transition duration-250 ease-out motion-reduce:transition-none',
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
        ].join(' ')}
      >
        <header className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-slate-400">Elige una contraseña segura para tu cuenta.</p>
        </header>

        {error && (
          <div
            className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-sm text-rose-200"
            role="status"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {hasSession === false && !done && (
          <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-slate-200">
            Este enlace es inválido o expiró. Solicita uno nuevo.
            <div className="mt-3">
              <Link
                href="/forgot-password"
                className="text-xs text-slate-400 transition-colors duration-200 hover:text-slate-200"
              >
                Recuperar acceso
              </Link>
            </div>
          </div>
        )}

        {done ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-slate-200">
            Contraseña actualizada. Redirigiendo al login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300" htmlFor="password">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className={inputBaseClass}
                disabled={loading || hasSession === false}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300" htmlFor="confirm">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className={inputBaseClass}
                disabled={loading || hasSession === false}
              />
            </div>

            <button
              type="submit"
              disabled={loading || hasSession === false}
              className={[
                'mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4',
                'bg-[#3B82F6] text-sm font-semibold text-white',
                'transition duration-200 motion-reduce:transition-none',
                'hover:bg-[#3376E6] active:bg-[#2F6BD3]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/30',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </button>

            <div className="pt-2">
              <Link
                href="/login"
                className="text-xs text-slate-400 transition-colors duration-200 hover:text-slate-200"
              >
                Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

