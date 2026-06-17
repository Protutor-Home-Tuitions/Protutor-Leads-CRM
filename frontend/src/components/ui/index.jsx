// src/components/ui/index.jsx
// All small reusable UI primitives — Button, Badge, Input, Select, Modal shell
import { BRAND, STATUS_COLORS } from '../../lib/constants'

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, type = 'button', className = '', style = {},
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontWeight: 600, borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'all 0.15s', opacity: disabled ? 0.6 : 1,
    fontSize: size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px',
    padding: size === 'sm' ? '5px 10px' : size === 'lg' ? '10px 20px' : '7px 14px',
  }
  const variants = {
    primary:   { background: BRAND.accent, color: '#fff' },
    secondary: { background: '#f3f4f6', color: BRAND.textMain, border: `1px solid ${BRAND.border}` },
    danger:    { background: '#fef2f2', color: BRAND.danger, border: '1px solid #fecaca' },
    ghost:     { background: 'transparent', color: BRAND.textSub },
    dark:      { background: BRAND.primary, color: '#fff' },
  }
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS[children] || {
    bg: '#f3f4f6', color: '#374151', border: '#e5e7eb',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
      background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
    }}>
      {children}
    </span>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub }}>{label}</label>}
      <input
        style={{
          border: `1px solid ${error ? '#fca5a5' : BRAND.border}`,
          borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          background: error ? '#fef2f2' : '#fff', color: BRAND.textMain,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '11px', color: BRAND.danger }}>{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, options = [], placeholder, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub }}>{label}</label>}
      <select
        style={{
          border: `1px solid ${error ? '#fca5a5' : BRAND.border}`,
          borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
          background: '#fff', color: BRAND.textMain, outline: 'none', width: '100%',
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '11px', color: BRAND.danger }}>{error}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, color: BRAND.textSub }}>{label}</label>}
      <textarea
        rows={3}
        style={{
          border: `1px solid ${BRAND.border}`, borderRadius: '8px',
          padding: '8px 12px', fontSize: '13px', resize: 'vertical',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          color: BRAND.textMain, fontFamily: 'inherit',
        }}
        {...props}
      />
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = '480px' }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px', width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {title && (
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${BRAND.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: BRAND.textMain }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: BRAND.textSub, lineHeight: 1 }}>×</button>
          </div>
        )}
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BRAND.border}`,
      borderRadius: '12px', padding: '20px', ...style,
    }}>
      {children}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 32, color = BRAND.accent }) {
  const initial = name?.[0]?.toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', gap: '12px', textAlign: 'center',
    }}>
      {icon && <div style={{ fontSize: '40px' }}>{icon}</div>}
      <div style={{ fontSize: '16px', fontWeight: 700, color: BRAND.textMain }}>{title}</div>
      {description && <div style={{ fontSize: '13px', color: BRAND.textSub, maxWidth: '300px' }}>{description}</div>}
      {action}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${BRAND.border}`,
      borderTopColor: BRAND.accent,
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
    }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: BRAND.textMain, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '13px', color: BRAND.textMuted, marginTop: '3px' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
