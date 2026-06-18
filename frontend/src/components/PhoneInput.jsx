// Inline-styled country-code + phone input. Original used the same look in two places (`ym`, `Cm`);
// kept identical here as instructed.
export function PhoneInput({ codeValue, phoneValue, onCodeChange, onPhoneChange, phonePlaceholder }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        background: '#fff',
        overflow: 'hidden',
        height: '36px',
        transition: 'border-color 0.15s',
      }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
    >
      <input
        type="text"
        maxLength={4}
        value={codeValue}
        onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
        style={{
          width: '48px',
          flexShrink: 0,
          border: 'none',
          borderRight: '1px solid #e5e7eb',
          background: '#f8fafc',
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
          padding: '0 0 0 8px',
          outline: 'none',
          height: '100%',
          textAlign: 'left',
        }}
        placeholder="91"
      />
      <input
        type="tel"
        maxLength={13}
        value={phoneValue}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={phonePlaceholder || 'Phone number'}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          fontSize: '13px',
          color: '#111827',
          padding: '0 10px',
          outline: 'none',
          height: '100%',
          minWidth: 0,
        }}
      />
    </div>
  );
}

// Small "label + optional asterisk" wrapper used inside modal forms
export function FormField({ label, req, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
        {req && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
