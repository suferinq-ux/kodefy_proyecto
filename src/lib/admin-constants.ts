export const ADMIN_NAV = [
  { name: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard', section: 'overview' },
  { name: 'Negocios', href: '/super-admin/negocios', icon: 'Building2', section: 'management' },
] as const;

export const ADMIN_COLORS = {
  primary: {
    light: 'bg-blue-600',
    text: 'text-blue-600',
    darkText: 'dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
  },
  slate: {
    sidebar: 'bg-slate-900 dark:bg-slate-950',
    hover: 'hover:bg-slate-800 dark:hover:bg-slate-800',
    border: 'border-slate-800 dark:border-slate-800',
  },
} as const;

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  tertiary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  slate: '#64748b',
} as const;

export const ANIMATIONS = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  },
  stagger: (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.06, duration: 0.3 },
  }),
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2 },
  },
} as const;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PE').format(value);
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora mismo';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(date);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
