import React from 'react';

// Form Field Component
interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  horizontal?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  required, 
  hint, 
  error,
  children, 
  horizontal = true 
}) => {
  if (horizontal) {
    return (
      <div className="flex items-start gap-5">
        <label className="w-48 flex-shrink-0 text-sm text-[var(--erp-text-muted)] font-medium pt-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex-1">
          {children}
          {hint && !error && <p className="text-[12px] text-[var(--erp-text-muted)] mt-1">{hint}</p>}
          {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[var(--erp-text-muted)] font-medium block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-[var(--erp-text-muted)]">{hint}</p>}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
};

// Text Input Component
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ fullWidth = true, error, className = '', ...props }) => (
  <div>
    <input 
      className={`text-sm border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[var(--erp-border)] focus:ring-[var(--erp-accent)] focus:border-[var(--erp-accent)]'} focus:ring-1 outline-none py-2 px-3 rounded ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
  </div>
);

// Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  fullWidth?: boolean;
  error?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({ options, fullWidth = true, error, className = '', ...props }) => (
  <div>
    <select 
      className={`text-sm border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[var(--erp-border)] focus:ring-[var(--erp-accent)] focus:border-[var(--erp-accent)]'} focus:ring-1 outline-none py-2 px-3 rounded bg-white ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
  </div>
);

// Toggle/Checkbox Component
interface ToggleProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  error?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, required, error }) => (
  <div>
    <label className="flex items-center gap-3 cursor-pointer text-sm text-[var(--erp-text)]">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className={`rounded ${error ? 'border-red-500 text-red-500' : 'border-[var(--erp-border)] text-[var(--erp-accent)]'} focus:ring-[var(--erp-accent)] w-4 h-4`}
      />
      <span>{label} {required && <span className="text-red-500">*</span>}</span>
    </label>
    {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
  </div>
);

// Section Header Component
interface SectionHeaderProps {
  title: string;
  description?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => (
  <div className="border-b border-slate-200 pb-3 mb-5">
    <h3 className="text-sm font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">{title}</h3>
    {description && <p className="text-[12px] text-[var(--erp-text-muted)] mt-1">{description}</p>}
  </div>
);

// Action Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  icon,
  children, 
  className = '',
  ...props 
}) => {
  const baseStyles = 'font-bold uppercase tracking-wide transition-all flex items-center gap-2 justify-center';
  const variantStyles = {
    primary: 'bg-[var(--erp-accent)] text-white hover:bg-opacity-90 shadow-sm',
    secondary: 'bg-white border border-[var(--erp-border)] text-[var(--erp-text)] hover:bg-slate-50',
    ghost: 'text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeStyles = {
    sm: 'text-[11px] px-3 py-1.5 rounded',
    md: 'text-[13px] px-4 py-2 rounded',
    lg: 'text-sm px-6 py-2.5 rounded',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined !text-[16px]">{icon}</span>}
      {children}
    </button>
  );
};

// Card Component
interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, actions, className = '' }) => (
  <div className={`bg-white border border-[var(--erp-border)] rounded ${className}`}>
    {(title || actions) && (
      <div className="px-4 py-3 border-b border-[var(--erp-border)] bg-slate-50 flex items-center justify-between">
        {title && <h3 className="text-sm font-bold text-[var(--erp-text-muted)] uppercase tracking-widest">{title}</h3>}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 border uppercase font-bold rounded ${variants[variant]}`}>
      {children}
    </span>
  );
};

// Empty State Component
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">{icon}</span>
    <h3 className="text-lg font-semibold text-[var(--erp-text)]">{title}</h3>
    {description && <p className="text-sm text-[var(--erp-text-muted)] mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// Info Banner Component
interface InfoBannerProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
}

export const InfoBanner: React.FC<InfoBannerProps> = ({ variant = 'info', title, children }) => {
  const variants = {
    info: { bg: 'bg-blue-50 border-blue-100', icon: 'info', iconColor: 'text-blue-600', text: 'text-blue-800' },
    warning: { bg: 'bg-amber-50 border-amber-100', icon: 'warning', iconColor: 'text-amber-600', text: 'text-amber-800' },
    success: { bg: 'bg-green-50 border-green-100', icon: 'check_circle', iconColor: 'text-green-600', text: 'text-green-800' },
    error: { bg: 'bg-red-50 border-red-100', icon: 'error', iconColor: 'text-red-600', text: 'text-red-800' },
  };

  const v = variants[variant];

  return (
    <div className={`${v.bg} border p-4 rounded flex gap-3`}>
      <span className={`material-symbols-outlined ${v.iconColor}`}>{v.icon}</span>
      <div className={`text-sm ${v.text} leading-relaxed`}>
        {title && <strong>{title}: </strong>}
        {children}
      </div>
    </div>
  );
};
