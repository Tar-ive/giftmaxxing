// Giftmaxxing — app shell, router, theming controls

const NAV = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'calendar', icon: 'calendar', label: 'Events' },
  { id: 'add', icon: 'plus', label: '', center: true },
  { id: 'wishlist', icon: 'gift', label: 'Lists' },
  { id: 'profile', icon: 'user', label: 'You' },
];

function BottomNav({ tab, onTab, onAdd }) {
  const { Icons } = window;
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '10px 14px 24px', background: 'var(--nav-bg)', backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: '1px solid var(--line)' }}>
      {NAV.map(n => {
        if (n.center) return (
          <button key={n.id} onClick={onAdd} style={{ width: 50, height: 38, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px var(--accent-glow)' }}><Icons.plus size={24} /></button>
        );
        const active = tab === n.id;
        const Ico = Icons[n.icon + (active ? 'Fill' : '')] || Icons[n.icon];
        return (
          <button key={n.id} onClick={() => onTab(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 54,
            color: active ? 'var(--accent)' : 'var(--text-2)' }}>
            <Ico size={26} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: active ? 700 : 600 }}>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MaxiFab({ onClick }) {
  const { Maxi } = window;
  return (
    <button onClick={onClick} style={{ position: 'absolute', right: 16, bottom: 96, zIndex: 30, width: 60, height: 60,
      borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--surface)',
      boxShadow: '0 8px 24px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)' }}>
      <Maxi size={48} mood="wink" />
      <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%',
        background: '#2E8B57', border: '2px solid var(--surface)' }} />
    </button>
  );
}

function Sheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end',
      background: 'rgba(0,0,0,0.4)', animation: 'gmFade .2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)', backgroundImage: 'var(--bg-image)',
        borderRadius: '28px 28px 0 0', padding: '10px 16px 30px', animation: 'gmSlideUp .28s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: 'var(--line)', margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
}

function AddSheet({ open, onClose, onGroup, onMaxi }) {
  const { Icons } = window;
  const opts = [
    { i: <Icons.gift size={22} />, t: 'Post a find', s: 'Share a gift-worthy thing you spotted', a: onClose },
    { i: <Icons.group size={22} />, t: 'Start a group gift', s: 'Pool money with friends for one big gift', a: onGroup },
    { i: <Icons.heart size={22} />, t: 'New wishlist', s: 'Build a list for an event or yourself', a: onClose },
    { i: <Icons.sparkle size={22} />, t: 'Ask Maxi for ideas', s: 'Let your companion do the work', a: onMaxi },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontStyle: 'var(--display-style)',
        fontSize: 24, color: 'var(--text)', marginBottom: 14, padding: '0 4px' }}>Create</div>
      {opts.map((o, i) => (
        <button key={i} onClick={o.a} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
          padding: 14, marginBottom: 8, borderRadius: 'var(--radius)', border: '1px solid var(--line)', cursor: 'pointer',
          background: 'var(--surface)', backdropFilter: 'blur(20px)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{o.i}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{o.t}</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)' }}>{o.s}</div>
          </div>
          <Icons.chevronR size={18} style={{ color: 'var(--text-3)' }} />
        </button>
      ))}
    </Sheet>
  );
}

function Discover({ onBack, onOpenGift }) {
  const { P, Icons, ProductTile, Price, ScreenHeader, Chip } = window;
  const [q, setQ] = React.useState('');
  const tags = ['Trending', 'Under $30', 'For her', 'Cozy', 'Tech', 'Preloved'];
  const ids = Object.keys(P).filter(id => P[id].name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 8, padding: '8px 12px 12px', background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px) saturate(160%)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <window.IconBtn icon={<Icons.back size={24} />} onClick={onBack} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)',
            border: '1px solid var(--line)', borderRadius: 999, padding: '9px 14px' }}>
            <Icons.search size={18} style={{ color: 'var(--text-3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search gifts, brands, vibes…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-ui)',
              fontSize: 14, color: 'var(--text)', minWidth: 0 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 10, scrollbarWidth: 'none' }}>
          {tags.map((t, i) => <Chip key={t} active={i === 0}>{t}</Chip>)}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {ids.map(id => (
            <button key={id} onClick={() => onOpenGift(id)} style={{ padding: 0, border: 'none', background: 'none',
              cursor: 'pointer', textAlign: 'left' }}>
              <ProductTile product={id} height={150} radius="var(--radius-sm)" />
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginTop: 7 }}>{P[id].name}</div>
              <div style={{ marginTop: 2 }}><Price product={id} size={13} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Notifications({ onBack, onOpenGroup, onOpenGift }) {
  const { U, Avatar, Maxi, Icons } = window;
  const items = [
    { type: 'maxi', text: 'Maya\u2019s birthday is in 4 days — I lined up 7 ideas in your budget.', time: 'now', a: 'maxi' },
    { type: 'drop', user: null, text: 'Perfume on your radar just dropped 20%. Snag it before it\u2019s gone.', time: '2h', icon: 'trend', a: 'gift', pid: 'perfume' },
    { type: 'group', user: 'jules', text: 'chipped in $25 to Sam\u2019s farewell gift. 6 of 9 in!', time: '3h', a: 'group' },
    { type: 'like', user: 'theo', text: 'and 12 others liked your find.', time: '5h' },
    { type: 'claim', user: 'noor', text: 'claimed something from your wishlist 🤫', time: '1d' },
    { type: 'follow', user: 'ivy', text: 'started following your lists.', time: '2d' },
  ];
  return (
    <div>
      <window.ScreenHeader title="Activity" onBack={onBack} />
      <div style={{ padding: '6px 16px' }}>
        {items.map((it, i) => (
          <button key={i} onClick={() => it.a === 'group' ? onOpenGroup('g_sam') : it.a === 'gift' ? onOpenGift(it.pid) : null}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 0',
            borderBottom: '1px solid var(--line)', background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid',
            cursor: it.a ? 'pointer' : 'default' }}>
            {it.type === 'maxi' ? <Maxi size={40} /> : it.type === 'drop' ? (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icons.trend size={20} /></div>
            ) : <Avatar user={it.user} size={40} />}
            <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.4 }}>
              {it.user && <b>{U[it.user].name.split(' ')[0]} </b>}{it.text}
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{it.time}</div>
            </div>
            {it.a && <Icons.chevronR size={16} style={{ color: 'var(--text-3)' }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── controls above the device for live comparison ──
function ControlBar({ t, setTweak }) {
  const { GM_LOOKS, GM_ACCENTS, Icons } = window;
  const lookKeys = Object.keys(GM_LOOKS);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
      padding: '10px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 30px rgba(60,40,20,0.10)' }}>
      <span style={{ fontFamily: '"Hanken Grotesk", system-ui', fontWeight: 800, fontSize: 13, color: '#3a2a1e' }}>Look</span>
      <div style={{ display: 'flex', gap: 3, padding: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 999 }}>
        {lookKeys.map(k => (
          <button key={k} onClick={() => setTweak('look', k)} style={{ padding: '6px 12px', borderRadius: 999, border: 'none',
            cursor: 'pointer', fontFamily: '"Hanken Grotesk", system-ui', fontWeight: 700, fontSize: 12.5,
            background: t.look === k ? '#2a1d14' : 'transparent', color: t.look === k ? '#fff' : '#6b5a4a' }}>
            {GM_LOOKS[k].label}</button>
        ))}
      </div>
      <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.1)' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {Object.keys(GM_ACCENTS).map(k => (
          <button key={k} onClick={() => setTweak('accent', k)} title={GM_ACCENTS[k].name} style={{ width: 24, height: 24,
            borderRadius: '50%', cursor: 'pointer', background: GM_ACCENTS[k].hex,
            border: t.accent === k ? '2.5px solid #2a1d14' : '2.5px solid transparent', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
        ))}
      </div>
      <div style={{ width: 1, height: 22, background: 'rgba(0,0,0,0.1)' }} />
      <button onClick={() => setTweak('dark', !t.dark)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px',
        borderRadius: 999, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: t.dark ? '#2a1d14' : '#fff',
        color: t.dark ? '#fff' : '#3a2a1e', fontFamily: '"Hanken Grotesk", system-ui', fontWeight: 700, fontSize: 12.5 }}>
        {t.dark ? '🌙' : '☀️'}{t.dark ? 'Dark' : 'Light'}</button>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "look": "editorial",
  "accent": "coral",
  "dark": false,
  "radiusScale": 1
}/*EDITMODE-END*/;

function App() {
  const { useTweaks, gmTheme, IOSDevice, GM_LOOKS, GM_ACCENTS } = window;
  const { TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle, TweakSlider } = window;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = React.useState('home');
  const [overlay, setOverlay] = React.useState(null); // {name, params}
  const [addOpen, setAddOpen] = React.useState(false);

  const vars = gmTheme(t.look, t.dark, t.accent);
  if (t.radiusScale && t.radiusScale !== 1) {
    ['--radius', '--radius-lg', '--radius-sm'].forEach(k => { vars[k] = (parseFloat(vars[k]) * t.radiusScale) + 'px'; });
  }

  const push = (name, params) => setOverlay({ name, params });
  const pop = () => setOverlay(null);
  const openGift = (pid, post) => push('gift', { pid, post });
  const openGroup = (gid) => push('group', { gid });
  const openMaxi = () => push('maxi', {});

  const tabScreen = () => {
    switch (tab) {
      case 'home': return <window.HomeFeed onOpenGift={openGift} onOpenGroup={openGroup}
        onOpenList={() => setTab('wishlist')} onSearch={() => push('discover', {})} onNotif={() => push('notif', {})}
        onStory={(s) => s.drop ? push('discover', {}) : s.add ? setTab('wishlist') : push('gift', { pid: 'camera' })} />;
      case 'calendar': return <window.Calendar onOpenEvent={() => openGift('matcha')} onOpenGroup={openGroup} onIdeas={openMaxi} />;
      case 'wishlist': return <window.Wishlist onOpenGift={openGift} onOpenGroup={openGroup} onOpenCollection={() => {}} />;
      case 'profile': return <window.Profile onOpenMaxi={openMaxi} onOpenCollection={() => {}} onOpenGroup={openGroup} />;
      default: return null;
    }
  };

  const overlayScreen = () => {
    if (!overlay) return null;
    const o = overlay;
    if (o.name === 'gift') return <window.GiftDetail productId={o.params.pid} post={o.params.post} onBack={pop}
      onAddToList={pop} onOpenGift={openGift} />;
    if (o.name === 'group') return <window.GroupDetail onBack={pop} onChipIn={pop} />;
    if (o.name === 'maxi') return <window.Companion onBack={pop} onOpenGift={(pid) => { pop(); openGift(pid); }} />;
    if (o.name === 'discover') return <window.Discover onBack={pop} onOpenGift={openGift} />;
    if (o.name === 'notif') return <window.Notifications onBack={pop} onOpenGroup={openGroup} onOpenGift={openGift} />;
    return null;
  };

  const showFab = !overlay && tab !== 'profile';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      padding: '20px 16px 36px' }}>
      <ControlBar t={t} setTweak={setTweak} />
      <div style={{ position: 'relative' }}>
        <IOSDevice dark={t.dark}>
          <div data-screen-label="Giftmaxxing" style={{ ...vars, height: '100%', display: 'flex', flexDirection: 'column',
            background: 'var(--bg)', backgroundImage: 'var(--bg-image)', fontFamily: 'var(--font-ui)', color: 'var(--text)',
            position: 'relative' }}>
            {/* status-bar safe area */}
            <div style={{ height: 54, flexShrink: 0 }} />
            <div key={(overlay ? overlay.name : tab)} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
              position: 'relative' }}>
              {overlay ? overlayScreen() : tabScreen()}
            </div>
            {!overlay && <BottomNav tab={tab} onTab={setTab} onAdd={() => setAddOpen(true)} />}
            {showFab && <MaxiFab onClick={openMaxi} />}
            <AddSheet open={addOpen} onClose={() => setAddOpen(false)}
              onGroup={() => { setAddOpen(false); openGroup('g_sam'); }}
              onMaxi={() => { setAddOpen(false); openMaxi(); }} />
          </div>
        </IOSDevice>
      </div>

      <TweaksPanel>
        <TweakSection label="Look" />
        <TweakRadio label="Direction" value={t.look} options={Object.keys(GM_LOOKS).map(k => GM_LOOKS[k].label)}
          onChange={(label) => setTweak('look', Object.keys(GM_LOOKS).find(k => GM_LOOKS[k].label === label))} />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Accent" />
        <TweakColor label="Palette" value={GM_ACCENTS[t.accent].hex}
          options={Object.keys(GM_ACCENTS).map(k => GM_ACCENTS[k].hex)}
          onChange={(hex) => setTweak('accent', Object.keys(GM_ACCENTS).find(k => GM_ACCENTS[k].hex === hex))} />
        <TweakSection label="Shape" />
        <TweakSlider label="Roundness" value={t.radiusScale} min={0.4} max={1.6} step={0.1} unit="×"
          onChange={(v) => setTweak('radiusScale', v)} />
      </TweaksPanel>
    </div>
  );
}

window.GiftmaxxingApp = App;
