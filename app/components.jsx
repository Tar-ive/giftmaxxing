// Giftmaxxing — shared UI atoms

const grad = (key, angle = 145) => {
  const g = (window.GRADS[key] || window.GRADS.peach);
  return `linear-gradient(${angle}deg, ${g[0]}, ${g[1]})`;
};

const cardStyle = (extra = {}) => ({
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  ...extra,
});

function Avatar({ user, size = 44, ring = false, ringColor, dim = false }) {
  const u = typeof user === 'string' ? window.U[user] : user;
  const initials = (u?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('');
  const inner = (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: grad(u?.grad || 'peach'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.95)', fontWeight: 700,
      fontFamily: 'var(--font-ui)', fontSize: size * 0.36,
      letterSpacing: '-0.02em', flexShrink: 0,
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.12)',
      opacity: dim ? 0.5 : 1,
    }}>{initials}</div>
  );
  if (!ring) return inner;
  return (
    <div style={{
      padding: 2.5, borderRadius: '50%', flexShrink: 0,
      background: ringColor || `linear-gradient(135deg, var(--accent), #FFC24B)`,
    }}>
      <div style={{ padding: 2, borderRadius: '50%', background: 'var(--bg)' }}>{inner}</div>
    </div>
  );
}

// gradient placeholder tile standing in for a product photo
function ProductTile({ product, height = 200, radius = 'var(--radius)', tag = true, fit = 'cover', children }) {
  const p = typeof product === 'string' ? window.P[product] : product;
  return (
    <div style={{
      position: 'relative', width: '100%', height, borderRadius: radius,
      background: grad(p?.grad || 'peach'), overflow: 'hidden', flexShrink: 0,
    }}>
      {/* soft highlight blobs to give the placeholder depth */}
      <div style={{ position: 'absolute', width: '60%', height: '60%', right: '-12%', top: '-14%',
        borderRadius: '50%', background: 'rgba(255,255,255,0.28)', filter: 'blur(8px)' }} />
      <div style={{ position: 'absolute', width: '40%', height: '40%', left: '-8%', bottom: '-10%',
        borderRadius: '50%', background: 'rgba(0,0,0,0.06)', filter: 'blur(10px)' }} />
      {tag && (
        <div style={{ position: 'absolute', top: 10, left: 10,
          fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 9.5, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
          background: 'rgba(0,0,0,0.18)', padding: '3px 7px', borderRadius: 6,
          backdropFilter: 'blur(4px)' }}>{p?.cat || 'gift'}</div>
      )}
      {/* product-name plate (placeholder for a real photo) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)',
          fontStyle: 'var(--display-style)', color: '#fff', fontSize: 20, lineHeight: 1.1,
          textShadow: '0 1px 8px rgba(0,0,0,0.18)' }}>{p?.name}</div>
      </div>
      {children}
    </div>
  );
}

function Price({ product, size = 15 }) {
  const p = typeof product === 'string' ? window.P[product] : product;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--font-ui)' }}>
      <span style={{ fontWeight: 700, fontSize: size, color: 'var(--text)' }}>${p?.price}</span>
      {p?.was && <span style={{ fontSize: size * 0.82, color: 'var(--text-3)', textDecoration: 'line-through' }}>${p.was}</span>}
      {p?.was && <span style={{ fontSize: size * 0.7, fontWeight: 700, color: 'var(--accent)',
        background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 999 }}>
        -{Math.round((1 - p.price / p.was) * 100)}%</span>}
    </span>
  );
}

function Chip({ children, active = false, accent = false, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
      border: '1px solid ' + (active || accent ? 'transparent' : 'var(--line)'),
      background: accent ? 'var(--accent)' : active ? 'var(--text)' : 'var(--surface)',
      color: accent ? '#fff' : active ? 'var(--bg)' : 'var(--text-2)',
      transition: 'all .15s ease', ...style,
    }}>{children}</button>
  );
}

function Btn({ children, kind = 'accent', size = 'md', onClick, full = false, icon, style }) {
  const pad = size === 'sm' ? '8px 14px' : size === 'lg' ? '15px 22px' : '12px 18px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 14.5;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: pad, fontSize: fs, fontWeight: 700, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
    borderRadius: 999, cursor: 'pointer', border: '1px solid transparent',
    width: full ? '100%' : undefined, transition: 'transform .12s ease, opacity .15s', ...style,
  };
  const kinds = {
    accent: { background: 'var(--accent)', color: '#fff', boxShadow: '0 6px 18px var(--accent-glow)' },
    solid:  { background: 'var(--text)', color: 'var(--bg)' },
    ghost:  { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' },
    quiet:  { background: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...kinds[kind] }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      {icon}{children}
    </button>
  );
}

function IconBtn({ icon, onClick, size = 38, active = false, badge = false, style }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      background: active ? 'var(--accent-soft)' : 'transparent', border: 'none', cursor: 'pointer',
      color: active ? 'var(--accent)' : 'var(--text)', ...style,
    }}>
      {icon}
      {badge && <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8,
        borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--bg)' }} />}
    </button>
  );
}

function Progress({ value, goal, height = 8 }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height, borderRadius: 999, background: 'var(--accent-soft)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, var(--accent), #FFC24B)` }} />
      </div>
    </div>
  );
}

function CountdownPill({ children, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--accent)',
      background: 'var(--accent-soft)', padding: '4px 9px', borderRadius: 999 }}>
      {icon}{children}
    </span>
  );
}

// Section header used across screens
function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)',
        fontStyle: 'var(--display-style)', fontSize: 22, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h2>
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{action}</button>}
    </div>
  );
}

Object.assign(window, { grad, cardStyle, Avatar, ProductTile, Price, Chip, Btn, IconBtn, Progress, CountdownPill, SectionHead });
