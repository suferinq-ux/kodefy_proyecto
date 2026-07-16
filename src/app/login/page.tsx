'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, Building2, Fingerprint, Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';
import { PatternLock } from '@/components/ui/PatternLock';

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [businessCode, setBusinessCode] = useState('');
  const [businessInfo, setBusinessInfo] = useState<{ id: string; nombre: string; logo_url: string | null; color_primario: string | null; slug: string } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [showUI, setShowUI] = useState(false);
  
  // Advanced security states
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);
  const [isPatternRegistered, setIsPatternRegistered] = useState(false);
  const [showPatternUnlock, setShowPatternUnlock] = useState(false);
  const [patternUnlockError, setPatternUnlockError] = useState(false);
  const [showPromptUnlock, setShowPromptUnlock] = useState(false);
  const [promptSessionId, setPromptSessionId] = useState('');
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  useEffect(() => {
    setShowUI(true);
    const saved = localStorage.getItem('kodefy-remember-email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }

    setIsBiometricRegistered(localStorage.getItem('kodefy-admin-biometric-registered') === 'true');
    setIsPatternRegistered(localStorage.getItem('kodefy-admin-pattern') !== null);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      
      tl.fromTo(
        '.kodefy-logo-img',
        { scale: 0, opacity: 0, rotationY: 180, transformPerspective: 1000 },
        { scale: 1, opacity: 1, rotationY: 0, duration: 1.8, ease: 'expo.out' }
      )
      .fromTo(
        '.kodefy-text-kodefy',
        { y: 50, opacity: 0, rotationX: -90, transformPerspective: 1000 },
        { y: 0, opacity: 1, rotationX: 0, duration: 1.2, ease: 'back.out(1.5)' },
        '-=1.2'
      )
      .fromTo(
        '.kodefy-text-tech',
        { x: -50, opacity: 0, scale: 0.5 },
        { x: 0, opacity: 1, scale: 1, duration: 1, ease: 'elastic.out(1, 0.4)' },
        '-=0.8'
      );
    });

    return () => ctx.revert();
  }, []);

  const handleBusinessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessCode.trim()) {
      setError('Por favor ingresa el código de tu negocio.');
      setShakeError(true);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/negocio/info?pin=${encodeURIComponent(businessCode.trim())}`);

      if (!res.ok) {
        setError('PIN incorrecto. Verifica el código de tu negocio e intenta nuevamente.');
        setShakeError(true);
        return;
      }

      const data = await res.json();
      setBusinessInfo(data);
      setStep(2);
    } catch (err: any) {
      setError('Error al verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    setError(null);
    setBusinessCode('');
    setBusinessInfo({
      id: 'admin',
      nombre: 'Administración',
      logo_url: null,
      color_primario: '#0f172a',
      slug: 'admin'
    });
    setStep(2);
  };

  const handleBiometricLogin = async () => {
    setError(null);
    try {
      if (typeof window !== 'undefined' && 'credentials' in navigator) {
        const cred = await navigator.credentials.get({ password: true } as any);
        if (cred && 'password' in (cred as any)) {
          setLoading(true);
          const emailVal = cred.id;
          const passwordVal = (cred as any).password;
          
          setEmail(emailVal);
          setPassword(passwordVal);

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailVal,
            password: passwordVal,
          });

          if (authError || !authData.user) {
            setError(authError?.message || 'Error de autenticación biométrica.');
            setShakeError(true);
            setLoading(false);
            return;
          }

          // Load profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError || !profile || !profile.es_super_admin) {
            await supabase.auth.signOut();
            setError('Acceso denegado. No eres super administrador.');
            setShakeError(true);
            setLoading(false);
            return;
          }

          // Check for pattern lock (2FA)
          const savedPattern = localStorage.getItem('kodefy-admin-pattern');
          if (savedPattern) {
            setShowPatternUnlock(true);
            setLoading(false);
            return;
          }

          toast.success('Acceso biométrico concedido.');
          router.push('/super-admin');
        }
      }
    } catch (err: any) {
      console.error('[Biometric Login] Error:', err);
      if (err.name !== 'NotAllowedError') {
        setError('Error al leer la biometría del equipo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePatternUnlockComplete = async (drawnPattern: number[]) => {
    const savedPatternStr = localStorage.getItem('kodefy-admin-pattern');
    if (!savedPatternStr) return;
    const savedPattern = JSON.parse(savedPatternStr) as number[];

    const isMatch = savedPattern.every((val, index) => val === drawnPattern[index]) && savedPattern.length === drawnPattern.length;

    if (isMatch) {
      toast.success('Patrón verificado de forma exitosa.');
      router.push('/super-admin');
    } else {
      setPatternUnlockError(true);
      setError('Patrón de seguridad incorrecto. Sesión cerrada.');
      setShakeError(true);
      await supabase.auth.signOut();
      setTimeout(() => {
        setPatternUnlockError(false);
        setShowPatternUnlock(false);
        setError(null);
      }, 1500);
    }
  };

  const startSessionPolling = (sessionId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        setError('Tiempo de espera agotado. Intenta de nuevo.');
        setShakeError(true);
        setShowPromptUnlock(false);
        await supabase.auth.signOut();
        return;
      }

      try {
        const res = await fetch(`/api/auth/session?id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'approved') {
            clearInterval(interval);
            
            // Check for pattern lock (second factor)
            const savedPattern = localStorage.getItem('kodefy-admin-pattern');
            if (savedPattern) {
              setShowPatternUnlock(true);
              setShowPromptUnlock(false);
              return;
            }

            toast.success('Acceso autorizado.');
            setShowPromptUnlock(false);
            router.push('/super-admin');
          } else if (data.status === 'rejected') {
            clearInterval(interval);
            setError('Acceso rechazado desde tu celular.');
            setShakeError(true);
            setShowPromptUnlock(false);
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('Error polling session:', err);
      }
    }, 2000);

    setPollIntervalId(interval);
  };

  const handleCancelPrompt = async () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }
    setShowPromptUnlock(false);
    setPromptSessionId('');
    await supabase.auth.signOut();
    setError('Autenticación cancelada.');
  };

  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) return 'El correo es obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
      return 'Ingresa un correo válido';
    return undefined;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) return 'La contraseña es obligatoria';
    return undefined;
  }, []);

  const isFormValid = useMemo(() => {
    if (step === 1) return businessCode.trim().length > 0;
    return email.trim().length > 0 && password.length > 0 && !validateEmail(email) && !validatePassword(password);
  }, [step, businessCode, email, password, validateEmail, validatePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShakeError(false);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr, password: passErr });
      setShakeError(true);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.user) {
        setError('Credenciales incorrectas. Revisa tu correo y contraseña.');
        setShakeError(true);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('kodefy-remember-email', email.trim());
      } else {
        localStorage.removeItem('kodefy-remember-email');
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError('No pudimos cargar tu perfil. Intenta nuevamente.');
        setShakeError(true);
        return;
      }

      if (profile.es_super_admin) {
        if (businessInfo?.id !== 'admin') {
          await supabase.auth.signOut();
          setError('Los administradores globales deben ingresar por el Acceso Administrativo.');
          setShakeError(true);
          return;
        }

        // Create mobile 2FA approval session
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authData.user.id,
              userAgent: navigator.userAgent
            })
          });

          if (!res.ok) throw new Error('Error al iniciar 2FA móvil.');

          const sessionData = await res.json();
          setPromptSessionId(sessionData.id);
          setShowPromptUnlock(true);
          
          startSessionPolling(sessionData.id);
        } catch (err: any) {
          console.error('[Session Create Error]', err);
          await supabase.auth.signOut();
          setError('Error al iniciar la verificación de seguridad en dos pasos móvil.');
          setShakeError(true);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (businessInfo?.id === 'admin') {
        await supabase.auth.signOut();
        setError('No tienes permisos de administrador.');
        setShakeError(true);
        return;
      }

      if (!profile.negocio_id) {
        await supabase.auth.signOut();
        setError('Tu usuario no está asignado a ningún negocio.');
        setShakeError(true);
        return;
      }

      if (!businessInfo || profile.negocio_id !== businessInfo.id) {
        await supabase.auth.signOut();
        setError('No tienes acceso a este negocio. Verifica tu código.');
        setShakeError(true);
        return;
      }

      router.push(`/${businessInfo.slug}/dashboard`);
    } catch (err: any) {
      console.error('[LoginPage] Error:', err);
      setError(err.message || 'Error al conectar con el servidor.');
      setShakeError(true);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '📊', label: 'POS Inteligente' },
    { icon: '📦', label: 'Inventario en tiempo real' },
    { icon: '🏪', label: 'Multi-sucursal' },
    { icon: '📈', label: 'Reportes automáticos' },
  ];

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950">
      {/* Left panel — brand & illustration */}
      <div className="relative hidden lg:flex w-1/2 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 transition-colors duration-500">
        {/* Dynamic primary color overlay based on businessInfo if in step 2 */}
        {step === 2 && businessInfo?.color_primario && (
           <div 
             className="absolute inset-0 opacity-40 mix-blend-color transition-all duration-1000 ease-in-out" 
             style={{ backgroundColor: businessInfo.color_primario }} 
           />
        )}
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-5">
            <img
              src="/images/KODEFY-LOGO.png"
              alt="KODEFYTECH"
              className="kodefy-logo-img h-24 w-auto object-contain brightness-0 invert drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]"
            />
            <div className="text-5xl xl:text-6xl font-black tracking-tight uppercase leading-none flex" style={{ perspective: '1000px' }}>
              <span className="kodefy-text-kodefy text-white origin-bottom inline-block">KODEFY</span>
              <span className="kodefy-text-tech text-black inline-block">TECH</span>
            </div>
          </div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="max-w-lg"
          >
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tight">
              {step === 1 ? 'Operación' : (businessInfo?.nombre || 'Operación')}
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                sin fricción.
              </span>
            </h1>
            <p className="mt-5 text-base text-slate-300/80 leading-relaxed max-w-md">
              Ventas, inventario y caja en un solo lugar. Diseñado para negocios que quieren crecer sin distracciones.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="space-y-2.5"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 group"
              >
                <span className="text-sm leading-none">{f.icon}</span>
                <span className="text-[13px] font-medium text-slate-300 group-hover:text-white transition-colors">
                  {f.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <ShieldCheck size={14} className="text-emerald-500/60" />
            <span>Encriptación end-to-end · Datos protegidos</span>
          </motion.div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        {/* Subtle background pattern for mobile */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="relative w-full max-w-[400px]"
          >
            {/* Mobile logo */}
            {step === 1 && (
              <div className="lg:hidden flex items-center mb-10 justify-center gap-3">
                <img
                  src="/images/KODEFY-LOGO.png"
                  alt="KODEFYTECH"
                  className="kodefy-logo-img h-16 w-auto object-contain dark:brightness-0 dark:invert"
                />
                <div className="text-3xl font-black tracking-tight uppercase flex" style={{ perspective: '1000px' }}>
                  <span className="kodefy-text-kodefy text-slate-900 dark:text-white origin-bottom inline-block">KODEFY</span>
                  <span className="kodefy-text-tech text-blue-400 inline-block">TECH</span>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="mb-8">
              {step === 1 ? (
                <>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Acceso a tu Negocio
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Ingresa el PIN de tu empresa para continuar
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center sm:items-start">
                  {businessInfo?.logo_url ? (
                    <img src={businessInfo.logo_url} alt={businessInfo.nombre} className="h-20 w-auto mb-6 object-contain drop-shadow-md rounded-xl" />
                  ) : (
                    <div className="h-16 w-16 mb-6 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 text-3xl font-black shadow-lg">
                      {businessInfo?.nombre?.charAt(0).toUpperCase() || 'N'}
                    </div>
                  )}
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Hola de nuevo
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Ingresa tus credenciales para acceder a <span className="font-bold text-slate-900 dark:text-white">{businessInfo?.nombre}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Success alert (post-registration) */}
            <AnimatePresence>
              {justRegistered && step === 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                >
                  <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Cuenta creada exitosamente</p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Ingresa el código de tu negocio para iniciar sesión.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Form */}
            {step === 1 ? (
              <form onSubmit={handleBusinessCodeSubmit} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="businessCode"
                    className={cn(
                      'mb-2 flex items-center justify-between'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-bold uppercase tracking-wider transition-colors',
                      focusedField === 'businessCode'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}>
                      PIN de Negocio (6 dígitos)
                    </span>
                  </label>
                  <div className={cn(
                    'relative rounded-xl border transition-all duration-200 flex items-center bg-white dark:bg-slate-900',
                    focusedField === 'businessCode'
                      ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}>
                    <div className="pl-4 text-slate-400">
                      <Building2 size={18} />
                    </div>
                    <input
                      id="businessCode"
                      type="text"
                      maxLength={6}
                      value={businessCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setBusinessCode(val);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocusedField('businessCode')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="123456"
                      className={cn(
                        'w-full h-12 bg-transparent px-3 text-sm font-bold rounded-xl outline-none tracking-widest font-mono',
                        'text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className={cn(
                    'group relative w-full h-12 rounded-xl font-bold text-sm transition-all duration-200 mt-6',
                    'flex items-center justify-center gap-2',
                    'focus:outline-none focus:ring-4',
                    isFormValid && !loading
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-white/5 focus:ring-slate-900/20 dark:focus:ring-white/20 active:scale-[0.98]'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>

                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleAdminAccess}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Acceso administrativo
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {showPromptUnlock ? (
                  <div className="space-y-6 py-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto animate-pulse">
                      <Shield size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        Autorización Requerida
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                        Abre el dashboard en tu celular y presiona <strong>"Aprobar"</strong> en la alerta flotante para autorizar este ingreso.
                      </p>
                    </div>
                    
                    <div className="flex justify-center items-center gap-1.5 py-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        Esperando aprobación de dispositivo...
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCancelPrompt}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                      >
                        Cancelar y salir
                      </button>
                    </div>
                  </div>
                ) : showPatternUnlock ? (
                  <div className="space-y-4 py-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Patrón de Seguridad Requerido
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Dibuja el patrón en este equipo para desbloquear
                      </p>
                    </div>
                    <PatternLock onComplete={handlePatternUnlockComplete} error={patternUnlockError} />
                    <button
                      type="button"
                      onClick={async () => {
                        setShowPatternUnlock(false);
                        await supabase.auth.signOut();
                        setError('Autenticación cancelada.');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors mt-2"
                    >
                      Cancelar y salir
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Biometric login shortcut */}
                    {businessInfo?.id === 'admin' && isBiometricRegistered && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Fingerprint size={16} className="text-blue-500" />
                          ¿Iniciar con huella/rostro?
                        </div>
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          disabled={loading}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <Fingerprint size={16} />
                          Escanear huella/rostro
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 w-full my-1" />
                        <span className="text-[10px] text-slate-400 font-medium">O ingresa con tu contraseña tradicional abajo:</span>
                      </div>
                    )}

                    {/* Email field */}
                    <div>
                      <label
                        htmlFor="email"
                        className={cn(
                          'mb-2 flex items-center justify-between'
                        )}
                      >
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-wider transition-colors',
                          fieldErrors.email
                            ? 'text-red-500 dark:text-red-400'
                            : focusedField === 'email'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500'
                        )}>
                          Correo electrónico
                        </span>
                      </label>
                      <div className={cn(
                        'relative rounded-xl border transition-all duration-200',
                        fieldErrors.email
                          ? 'border-red-300 dark:border-red-500/40 ring-4 ring-red-500/10'
                          : focusedField === 'email'
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
                            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                            if (error) setError(null);
                          }}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="tu@empresa.com"
                          className={cn(
                            'w-full h-12 bg-transparent px-4 text-sm font-semibold rounded-xl outline-none',
                            'text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
                            'disabled:opacity-60 disabled:cursor-not-allowed'
                          )}
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
                  </>
                )}

                {/* Password field */}
                {!showPatternUnlock && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className={cn(
                          'text-xs font-bold uppercase tracking-wider transition-colors',
                          fieldErrors.password
                            ? 'text-red-500 dark:text-red-400'
                            : focusedField === 'password'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500'
                        )}
                      >
                        Contraseña
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <div className={cn(
                      'relative rounded-xl border transition-all duration-200',
                      fieldErrors.password
                        ? 'border-red-300 dark:border-red-500/40 ring-4 ring-red-500/10'
                        : focusedField === 'password'
                        ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          if (error) setError(null);
                        }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="••••••••"
                        className={cn(
                          'w-full h-12 bg-transparent pl-4 pr-12 text-sm font-semibold rounded-xl outline-none',
                          'text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        disabled={loading}
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
                )}

                {/* Remember me & Submit button */}
                {!showPatternUnlock && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4.5 w-4.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 outline-none transition-all focus:ring-4 focus:ring-blue-500/10"
                          disabled={loading}
                        />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 select-none">
                          Recordar mi correo
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        backgroundColor: businessInfo?.color_primario || undefined,
                      }}
                      className={cn(
                        'group relative w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200',
                        'flex items-center justify-center gap-2',
                        'hover:brightness-105 active:scale-[0.98]',
                        'focus:outline-none focus:ring-4 focus:ring-blue-500/20',
                        'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none'
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          Iniciar sesión
                          <ArrowRight
                            size={16}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </>
                      )}
                    </button>
                  </>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Cambiar de negocio
                  </button>
                </div>
              </form>
            )}

            {/* Social login divider */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700/50">
              <p className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
                Seguridad empresarial · Datos encriptados · 99.9% uptime
              </p>
              <div className="flex items-center gap-4 justify-center">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={12} />
                  <span className="text-[11px] font-semibold">SSL/TLS</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={12} />
                  <span className="text-[11px] font-semibold">SOC 2</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={12} />
                  <span className="text-[11px] font-semibold">GDPR</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Kodefy Tech ·{' '}
              <span className="font-semibold">SaaS Platform</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Shake animation keyframes (injected once) */}
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