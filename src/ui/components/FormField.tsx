import type { ReactNode } from 'react'

export interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-app-muted">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-app-danger-text">{error}</p> : null}
    </div>
  )
}
