// Factivist — Notifications inbox
// Centered single-column inbox with filter chips at the top.
// Inbox-zero feel; each row shows what changed and why.

const NOTIF_ICON = {
  milestone:  { I: 'TrendingUp', tone: 'var(--color-success-600)', bg:'var(--color-success-50)' },
  anchor:     { I: 'ShieldFill', tone: 'var(--color-brand-600)',   bg:'var(--color-brand-50)' },
  area:       { I: 'MapPin',     tone: 'var(--color-warning-700)', bg:'var(--color-warning-50)' },
  response:   { I: 'Megaphone',  tone: 'var(--color-foreground)',  bg:'var(--color-muted)' },
  moderation: { I: 'ShieldFill', tone: 'var(--color-danger-600)',  bg:'var(--color-danger-50)' },
  consensus:  { I: 'Flash',      tone: 'var(--color-danger-700)',  bg:'var(--color-danger-50)' },
  report:     { I: 'Ranking',    tone: 'var(--color-warning-700)', bg:'var(--color-warning-50)' },
};

const NotificationsScreen = () => {
  const ns = window.fvDataExtra.notifications;
  const [filter, setFilter] = React.useState('all');

  const filters = [
    { id:'all',         label:'All',           n:ns.length },
    { id:'milestone',   label:'Milestones',    n:ns.filter(x=>x.kind==='milestone').length },
    { id:'area',        label:'Your area',     n:ns.filter(x=>x.kind==='area').length },
    { id:'response',    label:'Responses',     n:ns.filter(x=>x.kind==='response').length },
    { id:'anchor',      label:'On-chain',      n:ns.filter(x=>x.kind==='anchor').length },
    { id:'moderation',  label:'Moderation',    n:ns.filter(x=>x.kind==='moderation' || x.kind==='consensus').length },
  ];
  const shown = filter === 'all' ? ns
    : filter === 'moderation' ? ns.filter(n => n.kind==='moderation' || n.kind==='consensus')
    : ns.filter(n => n.kind === filter);

  const unread = ns.filter(n => !n.read).length;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Inbox</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Notifications</span>
      </>} right={
        <Btn variant="ghost" size="sm" icon={<I.Check style={{width:13,height:13}}/>}>Mark all read</Btn>
      }/>

      <main style={{ maxWidth:760, margin:'0 auto', padding:'28px 24px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
          <div style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.02em' }}>Inbox</div>
          {unread > 0 && (
            <span style={{
              padding:'4px 10px', background:'var(--color-brand-500)', color:'#fff',
              borderRadius:9999, fontSize:11, fontWeight:700, letterSpacing:'0.04em',
            }}>{unread} new</span>
          )}
        </div>
        <div style={{
          display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4,
        }}>
          {filters.map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'7px 11px', borderRadius:9999,
              background: filter===f.id ? 'var(--color-foreground)' : 'var(--color-card)',
              color: filter===f.id ? 'var(--color-background)' : 'var(--color-foreground)',
              border: '1px solid ' + (filter===f.id ? 'var(--color-foreground)' : 'var(--color-border)'),
              fontFamily:'inherit', fontSize:12, fontWeight:600, cursor:'pointer',
              flexShrink:0,
            }}>
              {f.label}
              <span style={{
                padding:'2px 6px', borderRadius:9999,
                background: filter===f.id ? 'rgba(255,255,255,0.18)' : 'var(--color-gray-200)',
                color: filter===f.id ? 'var(--color-background)' : 'var(--color-gray-700)',
                fontSize:10, fontFamily:'var(--font-mono)', fontWeight:600,
              }}>{f.n}</span>
            </button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {shown.map(n => {
            const cfg = NOTIF_ICON[n.kind] || NOTIF_ICON.milestone;
            const IconC = I[cfg.I];
            return (
              <button key={n.id} style={{
                width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                background: n.read ? 'var(--color-card)' : 'var(--color-card)',
                border:'1px solid ' + (n.read ? 'var(--color-border)' : 'var(--color-brand-200)'),
                borderRadius:14, padding:'14px 16px',
                display:'flex', gap:14, alignItems:'flex-start',
                position:'relative',
                boxShadow: n.read ? 'none' : 'var(--shadow-xs)',
              }}>
                {!n.read && <span style={{
                  position:'absolute', left:-2, top:18,
                  width:6, height:24, borderRadius:99,
                  background:'var(--color-brand-500)',
                }}/>}
                <div style={{
                  width:36, height:36, borderRadius:10,
                  background: cfg.bg, color: cfg.tone,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <IconC style={{width:16,height:16}}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.4 }}>{n.head}</div>
                  <div style={{ fontSize:12.5, color:'var(--color-gray-600)', marginTop:4, lineHeight:1.5 }}>{n.sub}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, fontSize:11, color:'var(--color-muted-foreground)' }}>
                    <span style={{ fontFamily:'var(--font-mono)' }}>{n.meta}</span>
                    <span>·</span>
                    <span>{n.when}</span>
                  </div>
                </div>
                <I.ChevronR style={{width:14,height:14, color:'var(--color-gray-400)', flexShrink:0, marginTop:10}}/>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop:24, padding:'18px 20px',
          background:'var(--color-brand-50)',
          border:'1px solid var(--color-brand-200)', borderRadius:16,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <I.Bell style={{width:16,height:16, color:'var(--color-brand-600)'}}/>
            <span style={{ fontWeight:600, fontSize:13 }}>Notification preferences</span>
          </div>
          <div style={{ fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55 }}>
            You receive alerts for: <strong>Mumbai South</strong>, <strong>Police misconduct</strong>, <strong>RTI obstruction</strong>. Anonymous push uses a rotating token, never your handle.
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { NotificationsScreen });
