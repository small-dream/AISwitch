import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-app-accent text-app-accent-text shadow-sm shadow-app-accent/25 hover:bg-app-accent-hover',
  secondary:
    'border border-app-border bg-app-card text-app hover:border-app-border-strong hover:bg-app-hover',
  danger: 'bg-app-danger text-white shadow-sm shadow-app-danger/25 hover:bg-app-danger-hover',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    />
  )
}
