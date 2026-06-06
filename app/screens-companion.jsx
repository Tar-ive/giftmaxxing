// Giftmaxxing — Maxi AI companion chat

function MaxiMsg({ m, onOpenGift }) {
  const { P, Maxi, ProductTile, Price, Btn, Icons, Chip } = window;
  const mine = m.from === 'you';
  if (mine) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{ maxWidth: '78%', background: 'var(--accent)', color: '#fff', padding: '10px 14px',
          borderRadius: '18px 18px 4px 18px', fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.4 }}>{m.text}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 9, marginBottom: 12, alignItems: 'flex-end' }}>
      <div style={{ flexShrink: 0 }}><Maxi size={32} mood={m.card ? 'happy' : 'think'} /></div>
      <div style={{ maxWidth: '82%' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)',
          padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontFamily: 'var(--font-ui)', fontSize: 14,
          lineHeight: 1.45, backdropFilter: 'blur(20px)' }}>{m.text}</div>
        {m.chips && (
          <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
            {m.chips.map(c => <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 700, color: 'var(--accent)',
              background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 999 }}>
              <Icons.link size={12} />{c}</span>)}
          </div>
        )}
        {m.card && (
          <div style={{ marginTop: 8, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
            overflow: 'hidden', width: 210, backdropFilter: 'blur(20px)' }}>
            <ProductTile product={m.card} height={130} radius="0" />
            <div style={{ padding: 11 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{P[m.card].name}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                <Price product={m.card} size={14} />
                <Btn kind="accent" size="sm" onClick={() => onOpenGift(m.card)}>View</Btn>
              </div>
            </div>
          </div>
        )}
        {m.bundle && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)',
            borderRadius: 'var(--radius)', padding: 10, width: 230 }}>
            {m.bundle.map((id, i) => (
              <React.Fragment key={id}>
                {i > 0 && <Icons.plus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}><ProductTile product={id} height={52} radius="var(--radius-sm)" tag={false} /></div>
              </React.Fragment>
            ))}
            <Btn kind="accent" size="sm" onClick={() => onOpenGift(m.bundle[0])} style={{ flexShrink: 0 }}>+</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function Companion({ onBack, onOpenGift }) {
  const { MAXI_CHAT, Maxi, Icons, IconBtn } = window;
  const [msgs, setMsgs] = React.useState(MAXI_CHAT);
  const [text, setText] = React.useState('');
  const scrollRef = React.useRef(null);
  const quick = ['Gift for Maya 🎈', 'Under $30', 'Surprise me', 'What\u2019s trending'];

  const replies = {
    default: { text: 'on it — pulling matches from your friends\u2019 linked vibes now. give me a sec ✨', card: 'matcha' },
    trend: { text: 'trending in your circle this week: instant cameras, matcha kits & projector lamps. cameras are +38% saves.', card: 'lamp' },
    budget: { text: 'nice picks under $30 that still hit:', card: 'candle' },
    surprise: { text: 'ok trust me on this one — it\u2019s 91% Maya\u2019s aesthetic and nobody\u2019s claimed it yet 🤫', card: 'vinyl' },
  };
  const send = (t) => {
    const q = t || text; if (!q.trim()) return;
    const lower = q.toLowerCase();
    const reply = lower.includes('trend') ? replies.trend : lower.includes('30') || lower.includes('budget') ? replies.budget
      : lower.includes('surprise') ? replies.surprise : replies.default;
    setMsgs(m => [...m, { from: 'you', text: q }]);
    setText('');
    setTimeout(() => setMsgs(m => [...m, { from: 'maxi', ...reply }]), 600);
  };
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <IconBtn icon={<Icons.back size={24} />} onClick={onBack} />
        <Maxi size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Maxi</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--accent)', display: 'flex',
            alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2E8B57' }} />
            your gifting companion</div>
        </div>
        <IconBtn icon={<Icons.sparkle size={22} />} active />
      </div>
      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Maxi size={64} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontStyle: 'var(--display-style)',
            fontSize: 20, color: 'var(--text)', marginTop: 6 }}>Hey, I’m Maxi</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-3)', maxWidth: 240, margin: '4px auto 0' }}>
            I read the room (and the feeds) so you never give a mid gift again.</div>
        </div>
        {msgs.map((m, i) => <MaxiMsg key={i} m={m} onOpenGift={onOpenGift} />)}
      </div>
      {/* quick chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '6px 14px 10px', scrollbarWidth: 'none', flexShrink: 0 }}>
        {quick.map(q => (
          <button key={q} onClick={() => send(q)} style={{ flexShrink: 0, padding: '8px 13px', borderRadius: 999,
            border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            fontWeight: 600, fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{q}</button>
        ))}
      </div>
      {/* input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 14px', flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 999, padding: '4px 6px 4px 16px' }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask Maxi anything…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text)', minWidth: 0 }} />
          <button onClick={() => send()} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icons.send size={18} /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MaxiMsg, Companion });
