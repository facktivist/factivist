// Factivist UI kit — layout chrome: Header, Sidebar, RightRail

const Logo = ({ size=22, mono=false }) => {
  // Mark: solid square in brand color (or black in mono), chunky italic F
  // in Inter Black, with a white period dot as the brand "stamp".
  const sq = size + 18;
  const bg = mono ? 'var(--color-foreground)' : 'var(--color-brand-500)';
  const fg = mono ? 'var(--color-background)' : '#ffffff';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{
        position:'relative',
        width: sq, height: sq, borderRadius: 9,
        background: bg, overflow:'hidden',
      }}>
        <span style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-sans)',
          fontWeight: 900, fontStyle:'italic',
          fontSize: Math.round(sq * 0.78),
          lineHeight: 1, color: fg,
          letterSpacing: '-0.04em',
          transform: 'translateY(-2%) translateX(-4%)',
          userSelect:'none',
        }}>F</span>
        {/* white period stamp in bottom-right — the "punctuation" */}
        <span style={{
          position:'absolute', right: Math.max(3, sq*0.13), bottom: Math.max(3, sq*0.13),
          width: Math.max(3, sq*0.14), height: Math.max(3, sq*0.14),
          borderRadius:'50%', background: fg,
        }}/>
      </div>
      <div style={{
        fontFamily:'var(--font-sans)', fontWeight:700, fontSize:20,
        letterSpacing:'-0.025em',
        color: mono ? 'var(--color-foreground)' : 'var(--color-foreground)',
      }}>
        factivist
      </div>
    </div>
  );
};

const Header = ({ active, onNav, me }) => {
  const nav = [
    { id:'feed',         label:'Feed' },
    { id:'constituency', label:'Constituencies' },
    { id:'reports',      label:'Report cards' },
    { id:'chat',         label:'Ask AI' },
  ];
  return (
    <header style={{
      position:'sticky', top:0, zIndex:50,
      background:'rgba(255,255,255,0.85)',
      backdropFilter:'saturate(180%) blur(8px)',
      WebkitBackdropFilter:'saturate(180%) blur(8px)',
      borderBottom:'1px solid var(--color-border)',
    }}>
      <div style={{
        maxWidth:1280, margin:'0 auto', padding:'12px 24px',
        display:'flex', alignItems:'center', gap:24,
      }}>
        <Logo/>
        <nav style={{ display:'flex', gap:4, marginLeft:8 }}>
          {nav.map(n => (
            <button key={n.id} onClick={()=>onNav(n.id)} style={{
              padding:'8px 12px', borderRadius:8, border:0,
              background: active===n.id ? 'var(--color-brand-50)' : 'transparent',
              color: active===n.id ? 'var(--color-brand-700)' : 'var(--color-gray-700)',
              fontFamily:'inherit', fontWeight: active===n.id ? 600 : 500, fontSize:14,
              cursor:'pointer',
            }}>{n.label}</button>
          ))}
        </nav>
        <div style={{ flex:1 }}>
          <div style={{
            maxWidth:380, display:'flex', alignItems:'center', gap:8,
            height:38, padding:'0 12px', background:'var(--color-muted)',
            border:'1px solid transparent', borderRadius:10, fontSize:13,
          }}>
            <I.Search style={{ width:15, height:15, color:'var(--color-muted-foreground)'}}/>
            <input placeholder="Search complaints, constituencies, officials…" style={{
              flex:1, border:0, background:'transparent', outline:'none',
              fontFamily:'inherit', fontSize:13, color:'var(--color-foreground)',
            }}/>
            <kbd style={{
              fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 5px',
              background:'var(--color-card)', border:'1px solid var(--color-border)',
              borderRadius:4, color:'var(--color-muted-foreground)',
            }}>⌘K</kbd>
          </div>
        </div>
        <Btn variant="solid" tone="primary" icon={<I.Plus style={{width:16,height:16}}/>} onClick={()=>onNav('submit')}>
          New complaint
        </Btn>
        <button aria-label="Notifications" style={{
          width:38, height:38, borderRadius:10, border:'1px solid var(--color-border)',
          background:'var(--color-card)', display:'inline-flex',
          alignItems:'center', justifyContent:'center', cursor:'pointer',
          position:'relative',
        }}>
          <I.Bell style={{width:16,height:16,color:'var(--color-gray-700)'}}/>
          <span style={{
            position:'absolute', top:6, right:6, width:8, height:8,
            borderRadius:'50%', background:'var(--color-danger-500)',
            border:'2px solid var(--color-card)',
          }}/>
        </button>
        <button onClick={()=>onNav('profile')} style={{
          display:'flex', alignItems:'center', gap:8, padding:'4px 10px 4px 4px',
          background: 'var(--color-card)', border:'1px solid var(--color-border)',
          borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
        }}>
          <Avatar handle={me.handle} size={28}/>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <I.ShieldFill style={{ width:13, height:13, color:'var(--color-brand-500)'}}/>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)'}}>{me.handle}</span>
          </div>
        </button>
      </div>
    </header>
  );
};

const Sidebar = ({ categories, activeCat, onCat }) => (
  <aside style={{ display:'flex', flexDirection:'column', gap:20, position:'sticky', top:80, alignSelf:'flex-start' }}>
    <div>
      <div className="fv-overline" style={{ marginBottom:10 }}>Filter by category</div>
      <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:2 }}>
        <li>
          <button onClick={()=>onCat(null)} style={catBtnStyle(activeCat===null)}>
            <span>All categories</span>
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>11,256</span>
          </button>
        </li>
        {categories.map(c => (
          <li key={c.id}>
            <button onClick={()=>onCat(c.id)} style={catBtnStyle(activeCat===c.id)}>
              <span>{c.label}</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>{c.count.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <div className="fv-overline" style={{ marginBottom:10 }}>Severity</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        <SeverityPill level="Low"/>
        <SeverityPill level="Medium"/>
        <SeverityPill level="High"/>
        <SeverityPill level="Critical"/>
      </div>
    </div>
  </aside>
);

function catBtnStyle(active) {
  return {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    width:'100%', padding:'8px 10px', border:0,
    background: active ? 'var(--color-brand-50)' : 'transparent',
    color: active ? 'var(--color-brand-700)' : 'var(--color-foreground)',
    borderRadius:8, fontSize:13, fontWeight: active ? 600 : 500,
    cursor:'pointer', fontFamily:'inherit',
    textAlign:'left',
  };
}

const RightRail = ({ trending, me }) => (
  <aside style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:80, alignSelf:'flex-start' }}>
    <div style={{
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      borderRadius:16, padding:16,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <I.ShieldFill style={{ width:18, height:18, color:'var(--color-brand-500)'}}/>
        <span style={{ fontWeight:600, fontSize:13 }}>You are verified</span>
      </div>
      <div style={{ fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.55, marginBottom:12 }}>
        Anonymous citizen of <strong style={{color:'var(--color-foreground)'}}>{me.constituency}</strong>.
        No PII left your device.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:11, color:'var(--color-muted-foreground)' }}>
        <div><div style={{ fontSize:18, fontWeight:700, color:'var(--color-foreground)'}}>{me.submissions}</div>Complaints</div>
        <div><div style={{ fontSize:18, fontWeight:700, color:'var(--color-foreground)'}}>{me.endorsements}</div>Endorsements</div>
      </div>
    </div>

    <div style={{
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      borderRadius:16, padding:16,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <I.TrendingUp style={{ width:16, height:16, color:'var(--color-warning-700)'}}/>
        <span style={{ fontWeight:600, fontSize:13 }}>Trending constituencies</span>
      </div>
      <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:2 }}>
        {trending.map(t => (
          <li key={t.id}>
            <button style={{
              width:'100%', display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'8px 10px', border:0,
              background:'transparent', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', textAlign:'left',
            }}>
              <span style={{ fontSize:13, color:'var(--color-foreground)'}}>{t.name}</span>
              <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--color-success-700)', fontWeight:600 }}>{t.delta}</span>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>{t.count}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>

    <div style={{
      background:'linear-gradient(140deg, var(--color-brand-50) 0%, var(--color-card) 100%)',
      border:'1px solid var(--color-brand-200)',
      borderRadius:16, padding:16,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <I.Sparkles style={{ width:16, height:16, color:'var(--color-brand-600)'}}/>
        <span style={{ fontWeight:600, fontSize:13, color:'var(--color-brand-900)'}}>Ask the corpus</span>
      </div>
      <div style={{ fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55, marginBottom:12, fontStyle:'italic' }}>
        "Which Maharashtra MP has the worst RTI response record this term?"
      </div>
      <Btn variant="flat" tone="primary" size="sm" fullWidth>Open AI Chat</Btn>
    </div>
  </aside>
);

Object.assign(window, { Logo, Header, Sidebar, RightRail });
