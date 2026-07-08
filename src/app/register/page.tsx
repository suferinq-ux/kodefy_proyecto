'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { generateSlug } from '@/lib/admin-constants';

type FieldErrors = {
  nombre?: string;
  email?: string;
  password?: string;
  negocio?: string;
};

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [negocioNombre, setNegocioNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeError, setShakeError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!negocioNombre.trim()) errs.negocio = 'El nombre del negocio es obligatorio';
    if (!email.trim()) errs.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'Ingresa un correo válido';
    if (!password) errs.password = 'La contraseña es obligatoria';
    return errs;
  };

  const isFormValid = useMemo(() => {
    return (
      nombre.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      negocioNombre.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );
  }, [nombre, email, password, negocioNombre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShakeError(false);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setShakeError(true);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      // 1. Create auth user via Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { nombre: nombre.trim() },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
        },
      });

      if (authError || !authData.user) {
        setError(authError?.message || 'Error al crear la cuenta. Intenta con otro correo.');
        setShakeError(true);
        return;
      }

      // 2. Create business (negocio)
      const slug = generateSlug(negocioNombre);
      const { data: negocio, error: negocioError } = await supabase
        .from('negocios')
        .insert({
          nombre: negocioNombre.trim(),
          slug,
          color_primario: '#3b82f6',
          color_secundario: '#1e40af',
          estado: 'activo',
        })
        .select()
        .single();

      if (negocioError || !negocio) {
        // Rollback auth user if business creation fails
        await supabase.auth.signOut();
        setError('Error al crear el negocio. Verifica que el nombre no esté en uso.');
        setShakeError(true);
        return;
      }

      // 3. Create user profile with admin role
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: authData.user.id,
        email: email.trim(),
        nombre: nombre.trim(),
        rol: 'admin',
        negocio_id: negocio.id,
        activo: true,
        es_super_admin: false,
      });

      if (profileError) {
        await supabase.auth.signOut();
        setError('Error al configurar el perfil. Contacta a soporte.');
        setShakeError(true);
        return;
      }

      // 4. Redirect to login with success message
      router.push(`/login?registered=true`);
    } catch (err: any) {
      console.error('[RegisterPage] Error:', err);
      setError(err.message || 'Error al registrar. Intenta nuevamente.');
      setShakeError(true);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (fieldName: string) =>
    cn(
      'relative rounded-xl border transition-all duration-200',
      fieldErrors[fieldName as keyof FieldErrors]
        ? 'border-red-300 dark:border-red-500/40 ring-4 ring-red-500/10'
        : focusedField === fieldName
        ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/10'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    );

  const commonInputProps =
    'w-full h-12 bg-transparent px-4 text-sm font-semibold rounded-xl outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed';

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
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Building2 size={28} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">
              Crea tu cuenta gratis
            </h1>
            <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
              En menos de 2 minutos tendrás tu sistema POS listo para operar.
              Sin tarjeta de crédito.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 flex items-center gap-2 text-xs text-slate-500"
          >
            <ShieldCheck size={14} className="text-emerald-500/60" />
            <span>Tus datos están protegidos · Nunca los compartiremos</span>
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
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-8 justify-center">
            <img
              src="/images/kodefy_logoreal.png"
              alt="KODEFY"
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Crear cuenta
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Completa los datos para empezar con tu prueba gratuita de 14 días
            </p>
          </div>

          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3',
                  'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
                  shakeError && 'animate-[shake_0.5s_ease-in-out]'
                )}
              >
                <AlertCircle size={18} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nombre de negocio */}
            <div>
              <label
                htmlFor="negocio"
                className={cn(
                  'mb-2 block text-xs font-bold uppercase tracking-wider transition-colors',
                  fieldErrors.negocio
                    ? 'text-red-500 dark:text-red-400'
                    : focusedField === 'negocio'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                Nombre del negocio
              </label>
              <div className={inputClasses('negocio')}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 size={16} />
                </span>
                <input
                  id="negocio"
                  type="text"
                  value={negocioNombre}
                  onChange={(e) => {
                    setNegocioNombre(e.target.value);
                    if (fieldErrors.negocio) setFieldErrors((prev) => ({ ...prev, negocio: undefined }));
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('negocio')}
                  onBlur={() => setFocusedField(null)}
                  placeholder='Ej: "La Pollería de Juan"'
                  className={cn(commonInputProps, 'pl-11')}
                  aria-invalid={!!fieldErrors.negocio}
                  disabled={loading}
                />
              </div>
              <AnimatePresence>
                {fieldErrors.negocio && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400"
                  >
                    {fieldErrors.negocio}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Nombre */}
            <div>
              <label
                htmlFor="nombre"
                className={cn(
                  'mb-2 block text-xs font-bold uppercase tracking-wider transition-colors',
                  fieldErrors.nombre
                    ? 'text-red-500 dark:text-red-400'
                    : focusedField === 'nombre'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                Tu nombre completo
              </label>
              <div className={inputClasses('nombre')}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (fieldErrors.nombre) setFieldErrors((prev) => ({ ...prev, nombre: undefined }));
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('nombre')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Juan Pérez"
                  className={cn(commonInputProps, 'pl-11')}
                  aria-invalid={!!fieldErrors.nombre}
                  disabled={loading}
                />
              </div>
              <AnimatePresence>
                {fieldErrors.nombre && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400"
                  >
                    {fieldErrors.nombre}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className={cn(
                  'mb-2 block text-xs font-bold uppercase tracking-wider transition-colors',
                  fieldErrors.email
                    ? 'text-red-500 dark:text-red-400'
                    : focusedField === 'email'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                Correo electrónico
              </label>
              <div className={inputClasses('email')}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="tu@empresa.com"
                  className={cn(commonInputProps, 'pl-11')}
                  aria-invalid={!!fieldErrors.email}
                  disabled={loading}
                />
              </div>
              <AnimatePresence>
                {fieldErrors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400"
                  >
                    {fieldErrors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className={cn(
                  'mb-2 block text-xs font-bold uppercase tracking-wider transition-colors',
                  fieldErrors.password
                    ? 'text-red-500 dark:text-red-400'
                    : focusedField === 'password'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                Contraseña
              </label>
              <div className={inputClasses('password')}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className={cn(commonInputProps, 'pl-11 pr-12')}
                  aria-invalid={!!fieldErrors.password}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <AnimatePresence>
                {fieldErrors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400"
                  >
                    {fieldErrors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={cn(
                'group relative w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 mt-2',
                'flex items-center justify-center gap-2',
                'focus:outline-none focus:ring-4',
                isFormValid && !loading
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-lg shadow-emerald-600/20 focus:ring-emerald-500/20 active:scale-[0.98]'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Comenzar prueba gratuita
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Already have account */}
          <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Kodefy TECH · Prueba gratuita de 14 días
          </p>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
