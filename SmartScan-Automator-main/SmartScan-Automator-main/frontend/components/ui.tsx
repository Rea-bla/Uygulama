'use client'

interface ToastContainerProps {
  toasts: Array<{
    id: number
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
  }>
  onRemove: (id: number) => void
}

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: '✅',
    progressColor: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: '❌',
    progressColor: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: '⚠️',
    progressColor: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: 'ℹ️',
    progressColor: 'bg-blue-500',
  },
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const style = TOAST_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto ${style.bg} ${style.border} border rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-right fade-in duration-300 flex items-start gap-3`}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${style.text}`}>{toast.title}</p>
              {toast.message && (
                <p className={`text-xs ${style.text} opacity-80 mt-0.5`}>{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className={`text-xs ${style.text} opacity-50 hover:opacity-100 transition flex-shrink-0 mt-0.5`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}


interface StatCardProps {
  icon: string
  label: string
  value: string | number
  subtitle?: string
  color?: string
}

export function StatCard({ icon, label, value, subtitle, color = 'blue' }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-xl flex items-center justify-center text-white text-lg shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  )
}


interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-5 border border-gray-200">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mt-2">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition active:scale-95 shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}


interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-500/10',
    warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10',
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${buttonColors[variant]} text-white text-sm font-semibold rounded-lg transition shadow-md active:scale-95`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}


interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-blue-200 border-t-blue-600 rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-gray-400 font-medium">{label}</p>}
    </div>
  )
}


interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {label}
    </span>
  )
}


interface ProgressBarProps {
  value: number
  max: number
  label?: string
  color?: string
  showPercentage?: boolean
}

export function ProgressBar({ value, max, label, color = 'blue', showPercentage = true }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-gray-500 font-medium">{label}</span>}
          {showPercentage && <span className="text-xs text-gray-400 font-bold">{percentage}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorMap[color] || colorMap.blue} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}


interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: string; count?: number }>
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'underline' | 'pill'
}

export function Tabs({ tabs, activeTab, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}


interface SkeletonProps {
  width?: string
  height?: string
  rounded?: string
  className?: string
}

export function Skeleton({ width = 'w-full', height = 'h-4', rounded = 'rounded', className = '' }: SkeletonProps) {
  return (
    <div className={`${width} ${height} ${rounded} bg-gray-150 animate-pulse ${className}`} />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border border-gray-150 rounded-2xl bg-white">
      <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton width="w-3/4" height="h-4" rounded="rounded" />
        <Skeleton width="w-1/3" height="h-3" rounded="rounded" />
        <Skeleton width="w-1/4" height="h-3" rounded="rounded" />
      </div>
      <div className="space-y-2 flex-shrink-0">
        <Skeleton width="w-24" height="h-6" rounded="rounded" />
        <Skeleton width="w-20" height="h-8" rounded="rounded-xl" />
      </div>
    </div>
  )
}


interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  loading?: boolean
  suggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Ürün ara...',
  loading = false,
  suggestions = [],
  onSelectSuggestion,
}: SearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  return (
    <div className="relative flex-1 w-full">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-900 placeholder-gray-400 bg-white transition shadow-inner"
            placeholder={placeholder}
            value={value}
            onChange={e => {
              onChange(e.target.value)
              setShowSuggestions(e.target.value.length >= 2)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSearch()
                setShowSuggestions(false)
              }
              if (e.key === 'Escape') setShowSuggestions(false)
            }}
            onFocus={() => value.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
          {value && (
            <button
              onClick={() => { onChange(''); setShowSuggestions(false) }}
              className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-semibold"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => { onSearch(); setShowSuggestions(false) }}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-7 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 transition active:scale-95 whitespace-nowrap"
        >
          {loading ? 'Aranıyor...' : 'Ara'}
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2"
              onMouseDown={() => {
                if (onSelectSuggestion) onSelectSuggestion(suggestion)
                setShowSuggestions(false)
              }}
            >
              <span className="text-gray-300">🔍</span>
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
