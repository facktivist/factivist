// Factivist — Accused / Person-of-Interest profile screen
// Two-column receipt page on a politician/builder/officer:
//   Left  — identity, summary, accusation timeline, official responses
//   Right — KPIs, linked complaints, where they operate, related POIs
// Data: window.fvDataExtra.accused

const AccusedHeadshot = ({ name, size=88 }) => {
  // No real photo — show initials in a slightly menacing dark gradient
  // (placeholder; user can drop a real headshot).
  const initials = name.split(' ').filter(p=>p[0] && p[0]!=='"').slice(0,2).map(p=>p[0]).join('');
  return (
    <div style={{
      width:size, height:size, borderRadius:18,
      background:'linear-gradient(160deg, var(--color-gray-900) 0%, var(--color-gray-700) 100%)',
      color:'var(--color-gray-50)',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontWeight:700, fontSize: Math.round(size*0.36), letterSpacing:'-0.02em',
      flexShrink:0, position:'relative', overflow:'hidden',
    }}>
      {initials}
      <span style={{
        position:'absolute', bottom:0, right:0,
        background:'var(--color-danger-500)', color:'#fff',
        fontSize:9, fontWeight:700, fontFamily:'var(--font-mono)',
        padding:'2px 6px', borderTopLeftRadius:8, letterSpacing:'0.04em',
      }}>POI</span>
    </div>
  );
};

const TimelineDot = ({ tone }) => {
  const map = {
    default: { bg:'var(--color-gray-200)', fg:'var(--color-gray-700)' },
    warning: { bg:'var(--color-warning-200)', fg:'var(--color-warning-800)' },
    danger:  { bg:'var(--color-danger-100)',  fg:'var(--color-danger-700)' },
  };
  const t = map[tone] || map.default;
  return <span style={{
    width:14, height:14, borderRadius:'50%', background:t.bg,
    border:'3px solid var(--color-background)', boxSizing:'content-box',
    color:t.fg, display:'inline-flex', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}/>
  </span>;
};

const AccusedScreen = () => {
  const a = window.fvDataExtra.accused;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>POI registry</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{a.id}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{width:13,height:13}}/>}>Share</Btn>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.Plus style={{width:13,height:13}}/>}>Link a complaint</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Hero */}
        <Card pad={0} style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:24, display:'flex', gap:20, alignItems:'flex-start' }}>
            <AccusedHeadshot name={a.name} size={88}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  padding:'4px 10px', background:'var(--color-danger-500)', color:'#fff',
                  borderRadius:9999, fontSize:11, fontWeight:700, letterSpacing:'0.04em',
                }}>
                  <I.Flash style={{width:11,height:11}}/>
                  RISK · {a.risk.toUpperCase()}
                </span>
                <Chip tone="default" sm bordered>{a.role}</Chip>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
                  First flagged {a.firstFlagged}
                </span>
              </div>
              <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'var(--color-foreground)' }}>
                {a.name}
              </div>
              <div style={{ marginTop:6, fontSize:12, color:'var(--color-muted-foreground)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span>Also known as:</span>
                {a.aliases.map(al => (
                  <span key={al} style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{al}</span>
                ))}
              </div>
              <div style={{
                marginTop:14, fontSize:13, lineHeight:1.6, color:'var(--color-foreground)',
                textWrap:'pretty', maxWidth:720,
              }}>
                {a.summary}
              </div>
            </div>
          </div>
          {/* metric strip */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:0,
            background:'var(--color-muted)', borderTop:'1px solid var(--color-border)',
          }}>
            {[
              { value:a.metrics.complaints,     label:'Complaints',     tone:'foreground' },
              { value:a.metrics.verified,       label:'Verified',       tone:'success-700' },
              { value:a.metrics.resolved,       label:'Resolved',       tone:'foreground' },
              { value:a.metrics.open,           label:'Still open',     tone:'danger-700' },
              { value:a.metrics.endorsements.toLocaleString(), label:'Endorsements',   tone:'foreground' },
              { value:a.metrics.mediaCitations, label:'Media citations',tone:'foreground' },
            ].map((m,i) => (
              <div key={i} style={{
                padding:'14px 18px',
                borderLeft: i===0 ? 'none' : '1px solid var(--color-border)',
              }}>
                <div style={{
                  fontSize:22, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1,
                  color: m.tone==='success-700' ? 'var(--color-success-700)'
                       : m.tone==='danger-700'  ? 'var(--color-danger-700)'
                       : 'var(--color-foreground)',
                }}>{m.value}</div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Two-column body */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>
          {/* LEFT */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Timeline of accusations */}
            <Card>
              <SectionHead
                icon={<I.Calendar style={{width:16,height:16}}/>}
                title="Timeline of accusations"
                subtitle="Public, anchored events. Excludes private/sealed proceedings."
              />
              <ol style={{ listStyle:'none', padding:0, margin:0, position:'relative' }}>
                <span style={{
                  position:'absolute', left:7, top:8, bottom:8, width:2,
                  background:'var(--color-border)',
                }}/>
                {a.timeline.map((t,i) => (
                  <li key={i} style={{
                    position:'relative', paddingLeft:30, paddingBottom: i===a.timeline.length-1 ? 0 : 18,
                    display:'flex', gap:14, alignItems:'flex-start',
                  }}>
                    <span style={{ position:'absolute', left:0, top:2 }}>
                      <TimelineDot tone={t.tone}/>
                    </span>
                    <div style={{ flex:1, paddingTop:1 }}>
                      <div style={{
                        fontSize:11, fontFamily:'var(--font-mono)',
                        color:'var(--color-muted-foreground)', letterSpacing:'0.04em',
                      }}>{t.at.toUpperCase()}</div>
                      <div style={{ fontSize:14, color:'var(--color-foreground)', marginTop:4, lineHeight:1.45, fontWeight:500 }}>
                        {t.label}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Official responses */}
            <Card>
              <SectionHead
                icon={<I.Megaphone style={{width:16,height:16}}/>}
                title="On-record responses"
                subtitle="Statements attributed to the accused or their counsel."
              />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {a.responses.map((r,i) => (
                  <div key={i} style={{
                    display:'flex', gap:12, alignItems:'flex-start',
                    padding:'12px 14px', borderRadius:12,
                    background: r.tone==='danger' ? 'var(--color-danger-50)' : 'var(--color-muted)',
                    border:'1px solid ' + (r.tone==='danger' ? 'var(--color-danger-200)' : 'var(--color-border)'),
                  }}>
                    <span style={{
                      width:6, alignSelf:'stretch', borderRadius:3,
                      background: r.tone==='danger' ? 'var(--color-danger-500)' : 'var(--color-gray-400)',
                    }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>{r.at}</div>
                      <div style={{ fontSize:13, marginTop:4, color:'var(--color-foreground)', lineHeight:1.55 }}>{r.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop:14, padding:'10px 12px', borderRadius:10,
                background:'var(--color-muted)', border:'1px dashed var(--color-border)',
                fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.55,
              }}>
                Have you seen a response we missed? <a style={{ color:'var(--color-brand-700)', textDecoration:'underline', fontWeight:600, cursor:'pointer' }}>Submit a citation</a> — citizens with 2+ verified submissions can amend this section.
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card>
              <SectionHead
                icon={<I.MapPin style={{width:16,height:16}}/>}
                title="Operates in"
                dense
              />
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {a.operatesIn.map(p => (
                  <Chip key={p} tone="default" bordered sm>{p}</Chip>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHead
                icon={<I.FileText style={{width:16,height:16}}/>}
                title={"Linked complaints · " + a.linkedComplaints.length}
                subtitle="Anchored on Polygon. Tap to open the full record."
              />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {a.linkedComplaints.map(c => (
                  <button key={c.id} style={{
                    width:'100%', textAlign:'left', background:'transparent',
                    border:'1px solid var(--color-border)', borderRadius:12,
                    padding:'12px 14px', cursor:'pointer', fontFamily:'inherit',
                    display:'flex', flexDirection:'column', gap:8,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                      <StatusChip status={c.status}/>
                    </div>
                    <div style={{ fontSize:13, color:'var(--color-foreground)', fontWeight:500, lineHeight:1.45 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)', display:'flex', alignItems:'center', gap:6 }}>
                      <I.ArrowUp style={{width:11,height:11}}/>
                      <span style={{ fontFamily:'var(--font-mono)' }}>{c.endorsements}</span>
                      <span>endorsements</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card accent>
              <SectionHead
                icon={<I.Sparkles style={{width:16,height:16}}/>}
                title="AI summary"
                subtitle="Generated from anchored complaints. Reviewed weekly."
                dense
              />
              <div style={{ fontSize:12, lineHeight:1.6, color:'var(--color-brand-900)' }}>
                Across 21 complaints, the most consistent thread is <strong>FIR refusal at Powai station</strong> combined with <strong>RERA possession-delay filings</strong>. Two separate complaint clusters cite the same officer (sub-inspector on duty) — referenced in 7 verified records.
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { AccusedScreen });
