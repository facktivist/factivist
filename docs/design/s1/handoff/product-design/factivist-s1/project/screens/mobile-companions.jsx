// Factivist — Mobile companion screens (leader card + notifications)
// These are smaller artboards that sit alongside the desktop kit.

const MobileLeaderCard = () => {
  const l = window.fvDataExtra.leaders[0];
  const promiseSegments = [
    { label:'Kept',    value:l.promisesKept,    color:'var(--color-success-500)' },
    { label:'Partial', value:l.promisesPartial, color:'var(--color-warning-500)' },
    { label:'Broken',  value:l.promisesBroken,  color:'var(--color-danger-500)' },
    { label:'Unverified', value:l.promisesUnknown, color:'var(--color-gray-300)' },
  ];

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{
        padding:'14px 16px 12px', borderBottom:'1px solid var(--color-border)',
        background:'var(--color-card)',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
          background:'var(--color-card)', cursor:'pointer',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
            <I.ChevronR style={{width:14,height:14}}/>
          </span>
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>REPORT CARD</div>
          <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3 }}>{l.constituency}</div>
        </div>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
          background:'var(--color-card)', cursor:'pointer',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <I.Link style={{width:14,height:14}}/>
        </button>
      </div>

      {/* Hero */}
      <div style={{
        padding:'18px 16px',
        background:'var(--color-muted)',
        borderBottom:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Chip tone="default" sm bordered>{l.role}</Chip>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:6, height:22, padding:'0 8px',
            background:'var(--color-gray-100)', border:'1px solid var(--color-border)', borderRadius:9999,
            fontSize:11, fontWeight:600, color:'var(--color-gray-800)',
          }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:l.partyColor }}/>
            {l.party}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <GradeBadge grade={l.grade} tone={l.gradeTone}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.15 }}>{l.name}</div>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>{l.term}</div>
          </div>
        </div>
        <div style={{
          marginTop:12, padding:'10px 12px', background:'var(--color-card)',
          border:'1px solid var(--color-border)', borderRadius:10,
          fontSize:12, lineHeight:1.5, color:'var(--color-foreground)',
        }}>
          <strong style={{ fontWeight:600 }}>Score:</strong> {l.score}/100. Attendance {l.attendance}% against the {l.attendanceAvg}% Lok Sabha average. 6 of 17 promises broken.
        </div>
      </div>

      {/* KPI tiles 2x2 */}
      <div style={{ padding:'16px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Kpi value={l.attendance + '%'} label="Attendance" tone="danger"/>
        <Kpi value={l.questions} label="Questions raised"/>
        <Kpi value={l.responseTimeDays + 'd'} label="Response time" tone="warning"/>
        <Kpi value={'+' + l.assetGrowth + '%'} label="Asset growth" tone="danger"/>
      </div>

      {/* Promises */}
      <div style={{ padding:'4px 14px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <Overline>Promises</Overline>
          <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{l.promisesTotal} tracked</span>
        </div>
        <StackBar segments={promiseSegments} height={8}/>
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginTop:10,
        }}>
          {promiseSegments.map(s => (
            <div key={s.label} style={{
              padding:'8px 6px', background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:8, textAlign:'center',
            }}>
              <div style={{ fontSize:16, fontWeight:700, color: s.color, letterSpacing:'-0.02em' }}>{s.value}</div>
              <div style={{ fontSize:9, color:'var(--color-muted-foreground)', marginTop:2, letterSpacing:'0.04em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance grid */}
      <div style={{ padding:'4px 14px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <Overline>Last 24 sessions</Overline>
          <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{l.attended.filter(Boolean).length} attended</span>
        </div>
        <AttendanceGrid attended={l.attended}/>
      </div>

      {/* Sticky CTA */}
      <div style={{ padding:'4px 14px 18px', marginTop:'auto' }}>
        <Btn variant="solid" tone="primary" size="md" fullWidth iconRight={<I.ChevronR style={{width:14,height:14}}/>}>
          See all 17 promises
        </Btn>
      </div>
    </div>
  );
};

const MobileNotifications = () => {
  const ns = window.fvDataExtra.notifications.slice(0,5);
  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{
        padding:'16px 16px 12px', borderBottom:'1px solid var(--color-border)',
        background:'var(--color-card)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:'-0.02em' }}>Inbox</div>
          <button style={{
            padding:'5px 10px', borderRadius:8, border:'1px solid var(--color-border)',
            background:'var(--color-card)', cursor:'pointer', fontFamily:'inherit',
            fontSize:11, fontWeight:600, color:'var(--color-foreground)',
          }}>Mark all read</button>
        </div>
        <div style={{ marginTop:10, display:'flex', gap:6, overflowX:'auto' }}>
          {['All','Area','Responses','Anchored'].map((f,i) => (
            <span key={f} style={{
              flexShrink:0,
              padding:'5px 10px', borderRadius:9999,
              background: i===0 ? 'var(--color-foreground)' : 'var(--color-card)',
              color: i===0 ? 'var(--color-background)' : 'var(--color-foreground)',
              border:'1px solid ' + (i===0 ? 'var(--color-foreground)' : 'var(--color-border)'),
              fontSize:11, fontWeight:600,
            }}>{f}</span>
          ))}
        </div>
      </div>
      <div style={{ flex:1, padding:'10px 12px 12px', display:'flex', flexDirection:'column', gap:6 }}>
        {ns.map(n => {
          const cfg = NOTIF_ICON[n.kind] || NOTIF_ICON.milestone;
          const IconC = I[cfg.I];
          return (
            <div key={n.id} style={{
              display:'flex', gap:10, alignItems:'flex-start',
              padding:'10px 12px',
              background:'var(--color-card)',
              border:'1px solid ' + (n.read ? 'var(--color-border)' : 'var(--color-brand-200)'),
              borderRadius:12,
              position:'relative',
            }}>
              {!n.read && <span style={{
                position:'absolute', left:-2, top:14, width:5, height:18,
                borderRadius:99, background:'var(--color-brand-500)',
              }}/>}
              <div style={{
                width:30, height:30, borderRadius:8,
                background:cfg.bg, color:cfg.tone,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <IconC style={{width:14,height:14}}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.4 }}>{n.head}</div>
                <div style={{ fontSize:11, color:'var(--color-gray-600)', marginTop:3, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.sub}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, fontSize:10, color:'var(--color-muted-foreground)' }}>
                  <span style={{ fontFamily:'var(--font-mono)' }}>{n.meta}</span>
                  <span>·</span>
                  <span>{n.when}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { MobileLeaderCard, MobileNotifications });
