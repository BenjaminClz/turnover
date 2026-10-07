'use client';

// Style épuré inspiré de TradingView : traits fins, lime réservé à l'action principale
const C = { bg: '#0F241E', line: '#24423A', lineHover: '#3A5A4F', text: '#E8EEE9', muted: '#8FA096', lime: '#D4FF3F', ink: '#0B1F1A', red: '#FF6B6B' };

const inputStyle = {
  width: '100%', background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8,
  color: C.text, padding: '10px 12px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .12s ease, box-shadow .12s ease',
};
const onFocus = (e) => { e.target.style.borderColor = C.lime; e.target.style.boxShadow = '0 0 0 2px rgba(212,255,63,0.12)'; };
const onBlur = (e) => { e.target.style.borderColor = C.line; e.target.style.boxShadow = 'none'; };

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12.5, color: C.muted, marginTop: 6 }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} onFocus={onFocus} onBlur={onBlur} />;
}

export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.5, ...props.style }} onFocus={onFocus} onBlur={onBlur} />;
}

export function Select({ value, onChange, options, ...props }) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o === '' ? '—' : o } : o));
  return (
    <select value={value} onChange={onChange} {...props} onFocus={onFocus} onBlur={onBlur} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', paddingRight: 36, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%238FA096' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', ...props.style }}>
      {normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: 'transparent', color: '#C9D3CC', border: `1px solid ${C.line}` },
    lime: { bg: 'rgba(212,255,63,0.12)', color: C.lime, border: '1px solid transparent' },
    urgent: { bg: 'rgba(255,107,107,0.12)', color: C.red, border: '1px solid transparent' },
  };
  const t = tones[tone] || tones.default;
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: t.bg, color: t.color, border: t.border, whiteSpace: 'nowrap' }}>{children}</span>;
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.8 }}>{icon}</div>}
      <div style={{ fontWeight: 600, fontSize: 16, color: C.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14 }}>{sub}</div>
    </div>
  );
}

const press = (e) => { e.currentTarget.style.transform = 'scale(0.98)'; };
const release = (e) => { e.currentTarget.style.transform = 'scale(1)'; };

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: C.lime, color: C.ink, border: 'none', padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', width: '100%', transition: 'transform .1s ease, background .12s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#DEFF66'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.lime; release(e); }}
      onMouseDown={press}
      onMouseUp={release}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: 'transparent', color: C.text, border: `1px solid ${C.line}`, padding: '10px 18px', borderRadius: 8, fontWeight: 500, fontSize: 14.5, cursor: 'pointer', transition: 'border-color .12s ease, background .12s ease, transform .1s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.lineHover; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = 'transparent'; release(e); }}
      onMouseDown={press}
      onMouseUp={release}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: 'transparent', color: C.muted, border: 'none', padding: '4px 6px', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 500, transition: 'color .12s ease, background .12s ease', ...props.style }}
      onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}
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
      style={{ width: 40, height: 22, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 3, background: checked ? C.lime : C.line, position: 'relative', transition: 'background .15s ease', flexShrink: 0, ...props.style }}
    >
      <span style={{ display: 'block', width: 16, height: 16, borderRadius: '50%', background: checked ? C.ink : C.text, transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .15s ease' }} />
    </button>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, background: '#132A23', color: C.text, border: `1px solid ${C.line}`, padding: '11px 16px', borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', zIndex: 100, maxWidth: '90vw', animation: 'tv-toast-in .2s ease' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.lime, flexShrink: 0 }} />
      {message}
    </div>
  );
}

export function PageTitle({ children }) {
  return <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(1.5rem, 3.2vw, 1.9rem)', fontWeight: 600, letterSpacing: '-0.015em', color: C.text, marginBottom: 6 }}>{children}</h1>;
}

export function PageSubtitle({ children }) {
  return <p style={{ color: C.muted, marginBottom: 24, maxWidth: 560, fontSize: 15, lineHeight: 1.6 }}>{children}</p>;
}
