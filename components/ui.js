'use client';

const inputStyle = {
  width: '100%', background: '#0B1F1A', border: '1px solid #274238', borderRadius: 8,
  color: '#F5F0E6', padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
};

export function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 18 }}>
      <span style={{ display: 'block', fontSize: 12, color: '#8C9A8E', marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} onFocus={(e) => e.target.style.borderColor = '#D4FF3F'} onBlur={(e) => e.target.style.borderColor = '#274238'} />;
}

export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 90, resize: 'vertical', ...props.style }} onFocus={(e) => e.target.style.borderColor = '#D4FF3F'} onBlur={(e) => e.target.style.borderColor = '#274238'} />;
}

export function Select({ value, onChange, options, ...props }) {
  return (
    <select value={value} onChange={onChange} {...props} style={{ ...inputStyle, cursor: 'pointer' }}>
      {options.map((o) => <option key={o} value={o}>{o === '' ? '—' : o}</option>)}
    </select>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: 'rgba(245,240,230,0.08)', color: '#F5F0E6' },
    lime: { bg: 'rgba(212,255,63,0.14)', color: '#D4FF3F' },
    urgent: { bg: 'rgba(255,92,92,0.14)', color: '#FF5C5C' },
  };
  const t = tones[tone];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: t.bg, color: t.color, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8C9A8E' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: '#F5F0E6', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14 }}>{sub}</div>
    </div>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} style={{ background: '#D4FF3F', color: '#0B1F1A', border: 'none', padding: '14px 26px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', ...props.style }}>
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button {...props} style={{ background: 'transparent', color: '#8C9A8E', border: 'none', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', ...props.style }}>
      {children}
    </button>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#D4FF3F', color: '#0B1F1A', padding: '12px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 100 }}>
      {message}
    </div>
  );
}
