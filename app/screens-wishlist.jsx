// Giftmaxxing — Wishlist (personal list + collective collections)

function Segmented({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-2)', borderRadius: 999,
      border: '1px solid var(--line)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, padding: '9px 0', borderRadius: 999,
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5,
          background: value === t.id ? 'var(--accent)' : 'transparent',
          color: value === t.id ? '#fff' : 'var(--text-2)', transition: 'all .15s' }}>{t.label}</button>
      ))}
    </div>
  );
}

function MyListItem({ entry, onOpen }) {
  const { P, U, ProductTile, Price, Icons } = window;
  const p = P[entry.product];
  const prColor = { high: 'var(--accent)', mid: 'var(--text-2)', low: 'var(--text-3)' }[entry.priority];
  return (
    <div style={{ display: 'flex', gap: 12, padding: 10, background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 'var(--radius)', marginBottom: 10, backdropFilter: 'blur(20px)' }}>
      <button onClick={() => onOpen(entry.product)} style={{ width: 78, flexShrink: 0, padding: 0, border: 'none',
        background: 'none', cursor: 'pointer' }}>
        <ProductTile product={entry.product} height={78} radius="var(--radius-sm)" tag={false} /></button>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: prColor, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        </div>
        <div style={{ marginTop: 3 }}><Price product={entry.product} size={13.5} /></div>
        {entry.note && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-3)', marginTop: 3,
          fontStyle: 'italic' }}>"{entry.note}"</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}><Icons.more size={18} /></button>
        {entry.reserved ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-ui)', fontSize: 10.5,
            fontWeight: 700, color: 'var(--text-3)' }}><Icons.check size={12} />Claimed 🤫</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 700, color: 'var(--accent)' }}>Open</span>
        )}
      </div>
    </div>
  );
}

function CollectionCard({ c, onOpen }) {
  const { U, Avatar, Icons, Progress, grad } = window;
  return (
    <button onClick={() => onOpen(c)} style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 12,
      background: 'var(--surface)', backdropFilter: 'blur(20px)' }}>
      <div style={{ height: 84, background: grad(c.cover), position: 'relative' }}>
        {c.group && <span style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
          fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.28)',
          padding: '4px 9px', borderRadius: 999, backdropFilter: 'blur(4px)' }}><Icons.group size={12} />Group gift</span>}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontStyle: 'var(--display-style)',
            fontSize: 19, color: 'var(--text)' }}>{c.title}</div>
          <Icons.chevronR size={18} style={{ color: 'var(--text-3)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
          <div style={{ display: 'flex' }}>
            {c.members.slice(0, 4).map((m, i) => <div key={m} style={{ marginLeft: i ? -9 : 0, borderRadius: '50%', border: '2px solid var(--surface)' }}><Avatar user={m} size={24} /></div>)}
          </div>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)' }}>{c.members.length} members · {c.items} items</span>
        </div>
        {c.group && (
          <div style={{ marginTop: 11 }}>
            <Progress value={c.raised} goal={c.goal} height={7} />
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, marginTop: 5 }}>
              ${c.raised} of ${c.goal} pooled</div>
          </div>
        )}
      </div>
    </button>
  );
}

function ImportBar() {
  const { Icons } = window;
  const src = [
    { n: 'Pinterest', i: <Icons.pin size={15} /> },
    { n: 'Instagram', i: <Icons.camera size={15} /> },
    { n: 'Link', i: <Icons.link size={15} /> },
  ];
  return (
    <div style={{ background: 'var(--accent-soft)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <window.Maxi size={28} />
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)' }}>
          <b>Auto-fill your list</b> — Maxi pulls your saved vibes</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {src.map(s => (
          <button key={s.n} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 0', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)',
            cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>
            {s.i}{s.n}</button>
        ))}
      </div>
    </div>
  );
}

function Wishlist({ onOpenGift, onOpenGroup, onOpenCollection }) {
  const { MY_LIST, COLLECTIONS, Icons, IconBtn, Btn, Wordmark } = window;
  const [tab, setTab] = React.useState('mine');
  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 8, padding: '8px 16px 12px', background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)',
            fontStyle: 'var(--display-style)', fontSize: 28, color: 'var(--text)', letterSpacing: '-0.01em' }}>Wishlists</h1>
          <div style={{ display: 'flex', gap: 2 }}>
            <IconBtn icon={<Icons.link size={22} />} />
            <IconBtn icon={<Icons.plus size={24} />} active />
          </div>
        </div>
        <Segmented value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'My list' }, { id: 'collab', label: 'Collections' }]} />
      </div>

      <div style={{ padding: '16px 16px 8px' }}>
        {tab === 'mine' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)' }}>
                <b style={{ color: 'var(--text)' }}>{MY_LIST.length} items</b> · shared with 12 friends</div>
              <Btn kind="ghost" size="sm" icon={<Icons.share size={14} />}>Share</Btn>
            </div>
            <ImportBar />
            {MY_LIST.map((e, i) => <MyListItem key={i} entry={e} onOpen={onOpenGift} />)}
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
              Shared lists you're part of · <b style={{ color: 'var(--text)' }}>{COLLECTIONS.length}</b></div>
            {COLLECTIONS.map(c => (
              <CollectionCard key={c.id} c={c} onOpen={(col) => col.group ? onOpenGroup('g_sam') : onOpenCollection(col)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Segmented, MyListItem, CollectionCard, ImportBar, Wishlist });
