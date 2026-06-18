import { X } from 'lucide-react';

export function Modal({ open, onClose, title, subtitle, width, children, footer }) {
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: '12px', width: '100%', maxWidth: width || '480px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
      }}>
        <button type="button" onClick={onClose}
          style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: '#9ca3af', zIndex: 1 }}>
          <X size={16} />
        </button>
        {(title || subtitle) && (
          <div style={{ padding: '20px 24px 12px' }}>
            {title && <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>{title}</h2>}
            {subtitle && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{subtitle}</p>}
          </div>
        )}
        <div style={{ padding: '0 24px 16px' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalBtn({ onClick, children, variant = 'primary' }) {
  const styles = variant === 'primary'
    ? { background: '#16a34a', color: '#fff', border: 'none' }
    : { background: '#fff', color: '#374151', border: '1px solid #e5e7eb' };
  return (
    <button type="button" onClick={onClick}
      style={{ height: '36px', padding: '0 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', ...styles }}>
      {children}
    </button>
  );
}
