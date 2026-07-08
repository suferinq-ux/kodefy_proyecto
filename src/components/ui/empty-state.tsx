'use client';

import { LucideIcon, FolderOpen, ShoppingBag, Users, Package } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 40, container: 'p-6' },
  md: { icon: 56, container: 'p-10' },
  lg: { icon: 72, container: 'p-16' },
};

const emptyIcons: Record<string, LucideIcon> = {
  negocios: ShoppingBag,
  usuarios: Users,
  productos: Package,
  default: FolderOpen,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const Icon = icon || emptyIcons.default;
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700',
        s.container,
        className
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
        <Icon size={s.icon} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mb-5">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold text-sm transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function NotFoundState({
  title = 'No encontrado',
  description = 'El recurso que buscas no existe o ha sido eliminado.',
}: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title={title}
      description={description}
      size="lg"
      className="min-h-[400px]"
    />
  );
}
