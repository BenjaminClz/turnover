'use client';

const inputStyle = {
  width: '100%', background: '#0B1F1A', border: '1.5px solid #2C4A3D', borderRadius: 10,
  color: '#F5F0E6', padding: '14px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s ease, box-shadow .15s ease',
};

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 20 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#A4B0A6', marginBottom: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12.5, color: '#7C8B7E', marginTop: 6 }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = '#D4FF3F'; e.target.style.boxShadow = '0 0 0 3px rgba(212,255,63,0.15)'; }}
      onBlur={(e) => { e.target.style.borderColor = '#2C4A3D'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: 110, resize: 'vertical', fontFamily: 'Inter, sans-serif', ...props.style }}
      onFocus={(e) => { e.target.style.borderColor = '#D4FF3F'; e.target.style.boxShadow = '0 0 0 3px rgba(212,255,63,0.15)'; }}
      onBlur={(e) => { e.target.style.borderColor = '#2C4A3D'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

export function Select({ value, onChange, options, ...props }) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o === '' ? '—' : o } : o));
  return (
    <select value={value} onChange={onChange} {...props} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%23A4B0A6' stroke-width='1.7' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
      {normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: 'rgba(245,240,230,0.08)', color: '#F5F0E6' },
    lime: { bg: 'rgba(212,255,63,0.16)', color: '#D4FF3F' },
    urgent: { bg: 'rgba(255,107,107,0.16)', color: '#FF6B6B' },
  };
  const t = tones[tone];
  return <span style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: t.bg, color: t.color, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px', color: '#A4B0A6' }}>
      <div style={{ fontSize: 38, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 17, color: '#F5F0E6', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 15 }}>{sub}</div>
    </div>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '15px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', width: '100%', transition: 'transform .12s ease, opacity .12s ease, background .12s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#e4ff70'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#D4FF3F'; }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: 'transparent', color: '#F5F0E6', border: '1.5px solid #2C4A3D', padding: '13px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', transition: 'border-color .12s ease, transform .12s ease, background .12s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D4FF3F'; e.currentTarget.style.background = 'rgba(212,255,63,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2C4A3D'; e.currentTarget.style.background = 'transparent'; }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: 'transparent', color: '#A4B0A6', border: 'none', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontWeight: 500, transition: 'color .12s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#D4FF3F'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#A4B0A6'; }}
    >
      {children}
    </button>
  );
}

export function ToggleSwitch({ checked, onChange, ...props }) {
  return (
    <button
      {...props}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 44, height: 24, borderRadius: 14, border: 'none', cursor: 'pointer', padding: 3,
        background: checked ? '#D4FF3F' : '#2C4A3D', position: 'relative', transition: 'background .15s ease',
        flexShrink: 0, ...props.style,
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: checked ? '#0B1F1A' : '#F5F0E6',
        transform: checked ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .15s ease',
      }} />
    </button>
  );
}
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#D4FF3F', color: '#0B1F1A', padding: '14px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14.5, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', zIndex: 100, maxWidth: '90vw', animation: 'tv-toast-in .25s ease' }}>
      {message}
    </div>
  );
}

export function PageTitle({ children }) {
  return <h1 className="turnover-anton" style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', marginBottom: 12 }}>{children}</h1>;
}

export function PageSubtitle({ children }) {
  return <p style={{ color: '#A4B0A6', marginBottom: 30, maxWidth: 560, fontSize: 16, lineHeight: 1.6 }}>{children}</p>;
}
