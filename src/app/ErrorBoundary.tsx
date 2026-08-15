import { Component, type ErrorInfo, type ReactNode } from 'react'

import { t } from '@/i18n/index'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** UI 层统一异常拦截（CODING_STANDARDS §6）：组件渲染错误在此兜底 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-screen flex-col items-center justify-center gap-3 bg-app-bg p-8 text-center"
        >
          <h1 className="text-lg font-semibold text-app">{t('errorBoundary.title')}</h1>
          <p className="max-w-md text-sm text-app-muted">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => {
              window.location.reload()
            }}
            className="mt-2 rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            {t('errorBoundary.reload')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
