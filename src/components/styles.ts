/**
 * CLASSI CSS CONDIVISE (pulsanti e campi di testo)
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink',
  secondary: 'bg-surface-2 text-text',
  danger: 'bg-red-500/15 text-red-300',
  ghost: 'bg-transparent text-muted',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
};

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = ''): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold',
    'transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

export const inputClasses =
  'w-full min-h-12 rounded-2xl bg-surface-2 px-4 text-text placeholder:text-muted outline-none focus:ring-2 focus:ring-accent';
