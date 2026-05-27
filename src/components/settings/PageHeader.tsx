import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export default function PageHeader({ title, description, actions, footer }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">{description}</p>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
            {actions}
          </div>
        )}
      </div>
      {footer}
    </header>
  );
}
