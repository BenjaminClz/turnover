'use client';

// Style épuré inspiré de TradingView : traits fins, lime réservé à l'action principale
const C = { bg: 'var(--surface)', line: 'var(--line)', lineHover: 'var(--line-strong)', text: 'var(--text)', muted: 'var(--muted)', lime: 'var(--lime)', ink: 'var(--on-lime)', red: 'var(--danger)' };

// Les styles vivent dans globals.css (.tv-input, .tv-b…) : survol, focus et
// désactivation sont gérés en CSS, plus besoin de handlers JS.
const cx = (...c) => c.filter(Boolean).join(' ');

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 6 }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 13, color: C.muted, marginTop: 6 }}>{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input {...props} className={cx('tv-input', className)} />;
}

export function TextArea({ className, ...props }) {
  return <textarea {...props} className={cx('tv-input', className)} style={{ minHeight: 100, resize: 'vertical', lineHeight: 1.5, ...props.style }} />;
}

export function Select({ value, onChange, options, ...props }) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o === '' ? '—' : o } : o));
  return (
    <select value={value} onChange={onChange} {...props} className={cx('tv-input', props.className)} style={{ cursor: 'pointer', appearance: 'none', paddingRight: 36, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%238FA096' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', ...props.style }}>
      {normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: 'transparent', color: 'var(--text-2)', border: `1px solid ${C.line}` },
    lime: { bg: 'rgba(212,255,63,0.12)', color: C.lime, border: '1px solid transparent' },
    urgent: { bg: 'rgba(255,107,107,0.12)', color: C.red, border: '1px solid transparent' },
  };
  const t = tones[tone] || tones.default;
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 6, background: t.bg, color: t.color, border: t.border, whiteSpace: 'nowrap' }}>{children}</span>;
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

export function PrimaryButton({ children, className, block = true, size, ...props }) {
  return <button {...props} className={cx('tv-b tv-b-primary', block && 'tv-b-block', size && `tv-b-${size}`, className)}>{children}</button>;
}

export function SecondaryButton({ children, className, size, ...props }) {
  return <button {...props} className={cx('tv-b tv-b-secondary', size && `tv-b-${size}`, className)}>{children}</button>;
}

export function GhostButton({ children, className, ...props }) {
  return <button {...props} className={cx('tv-b tv-b-ghost', className)}>{children}</button>;
}

export function DangerButton({ children, className, size, ...props }) {
  return <button {...props} className={cx('tv-b tv-b-danger', size && `tv-b-${size}`, className)}>{children}</button>;
}

export function Panel({ children, className, ...props }) {
  return <div {...props} className={cx('tv-panel', className)}>{children}</div>;
}

export function SectionLabel({ children, style }) {
  return <div className="tv-section-label" style={style}>{children}</div>;
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
    <div role="status" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', color: C.text, border: `1px solid ${C.line}`, padding: '11px 16px', borderRadius: 8, fontWeight: 500, fontSize: 14, boxShadow: 'var(--shadow-pop)', zIndex: 100, maxWidth: '90vw', animation: 'tv-toast-in .2s ease' }}>
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
