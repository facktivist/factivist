// Factivist — Promise tracking deep view (desktop)

const SOURCE_ICON = {
  rti:    { I:'FileText',  tone:'var(--color-warning-700)', bg:'var(--color-warning-50)',  label:'RTI' },
  parl:   { I:'Vote',      tone:'var(--color-brand-700)',   bg:'var(--color-brand-50)',    label:'Parl' },
  tender: { I:'FileText',  tone:'var(--color-gray-700)',    bg:'var(--color-muted)',       label:'Tender' },
  press:  { I:'Megaphone', tone:'var(--color-gray-700)',    bg:'var(--color-muted)',       label:'Press' },
  complaint:{ I:'Flash',   tone:'var(--color-danger-700)',  bg:'var(--color-danger-50)',   label:'Citizen' },
};

const PromiseDetail = ({ p }) => {
  const isBroken = p.status === 'broken';
  const isKept   = p.status === 'kept';
  return (
    <div style={{
      padding:'18px 20px', borderRadius:14,
      background:'var(--color-card)',
      border:'1px solid ' + (
        isBroken ? 'var(--color-danger-200)' :
        isKept   ? 'var(--color-success-200)' :
        'var(--color-border)'
      ),
      display:'flex', flexDirection:'column', gap:14,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        <PromiseChip status={p.status}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.4 }}>{p.text}</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', flexWrap:'wrap' }}>
            <span>{p.source}</span>
            <span>·</span>
            <span>DEADLINE {p.deadline}</span>
            {p.daysOverdue > 0 && <>
              <span>·</span>
              <span style={{ color:'var(--color-danger-700)', fontWeight:600 }}>OVERDUE {p.daysOverdue}d</span>
            </>}
            {p.daysOverdue < 0 && <>
              <span>·</span>
              <span style={{ color:'var(--color-success-700)', fontWeight:600 }}>{Math.abs(p.daysOverdue)}d EARLY</span>
            </>}
          </div>
        </div>
        <div style={{ textAlign:'right', minWidth:80 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>PROGRESS</div>
          <div style={{
            fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginTop:3, fontFamily:'var(--font-mono)',
            color: p.progress === 100 ? 'var(--color-success-700)'
                 : p.progress === 0 ? 'var(--color-danger-700)'
                 : 'var(--color-warning-700)',
          }}>{p.progress}%</div>
        </div>
      </div>

      <div style={{ height:5, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
        <div style={{
          width: p.progress + '%', height:'100%',
          background: p.progress === 100 ? 'var(--color-success-500)' : p.progress > 0 ? 'var(--color-warning-500)' : 'var(--color-danger-500)',
        }}/>
      </div>

      {/* Evidence list */}
      <div>
        <Overline style={{ marginBottom:6 }}>Evidence · {p.evidence.length}</Overline>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {p.evidence.map((e, i) => {
            const cfg = SOURCE_ICON[e.kind] || SOURCE_ICON.press;
            const IconC = I[cfg.I] || I.FileText;
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 10px', borderRadius:8,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
              }}>
                <div style={{
                  width:26, height:26, borderRadius:7, flexShrink:0,
                  background:cfg.bg, color:cfg.tone,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><IconC style={{ width:13, height:13 }}/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.45 }}>{e.label}</div>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{e.when}</span>
              </div>
            );
          })}
        </div>
      </div>

      {p.receipts > 0 && (
        <div style={{
          padding:'9px 12px', borderRadius:9,
          background:'var(--color-danger-50)', border:'1px solid var(--color-danger-200)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <I.Flash style={{ width:12, height:12, color:'var(--color-danger-600)' }}/>
          <span style={{ fontSize:11.5, color:'var(--color-danger-800)' }}>
            <strong>{p.receipts}</strong> citizens cite this promise as broken in their complaints
          </span>
        </div>
      )}
    </div>
  );
};

const PromiseTrackingDeep = () => {
  const d = window.fvDataExtra.promiseDeep;
  const [filter, setFilter] = React.useState('all');

  const filters = [
    { id:'all',     label:'All',         n:d.summary.total,   color:'var(--color-foreground)' },
    { id:'kept',    label:'Kept',        n:d.summary.kept,    color:'var(--color-success-500)' },
    { id:'partial', label:'Partial',     n:d.summary.partial, color:'var(--color-warning-500)' },
    { id:'broken',  label:'Broken',      n:d.summary.broken,  color:'var(--color-danger-500)'  },
    { id:'unknown', label:'Unverified',  n:d.summary.unknown, color:'var(--color-gray-400)'    },
  ];

  const shown = filter === 'all' ? d.promises : d.promises.filter(p => p.status === filter);

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Report cards</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>{d.leader.constituency}</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Promises</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export PDF</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Hero */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
          <Avatar handle="leader" size={56} tone="gray"/>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Chip tone="default" sm bordered>{d.leader.role}</Chip>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'var(--color-gray-800)' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:d.leader.partyColor }}/>{d.leader.party}
              </span>
            </div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.02em' }}>{d.leader.name}</div>
            <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:2 }}>{d.leader.constituency} · {d.leader.state} · {d.leader.term}</div>
          </div>
          <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}>Open full report card</Btn>
        </div>

        {/* Summary card */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <Overline>Manifesto delivery · this term</Overline>
              <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.02em', marginTop:5 }}>
                {d.summary.kept} of {d.summary.total} promises kept
              </div>
              <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>
                {Math.round((d.summary.kept / d.summary.total) * 100)}% delivery rate · {d.summary.broken} broken · {d.summary.partial} partial
              </div>
            </div>
            <div style={{ display:'flex', gap:14 }}>
              {filters.slice(1).map(f => (
                <div key={f.id} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.02em', color:f.color }}>{f.n}</div>
                  <div style={{ fontSize:10, color:'var(--color-muted-foreground)', textTransform:'uppercase', letterSpacing:'0.04em', marginTop:3 }}>{f.label}</div>
                </div>
              ))}
            </div>
          </div>
          <StackBar segments={filters.slice(1).map(f => ({ label:f.label, value:f.n, color:f.color }))} height={10}/>
        </Card>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:5, marginBottom:14, flexWrap:'wrap' }}>
          {filters.map(f => {
            const isA = filter === f.id;
            return (
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{
                padding:'7px 12px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
                background: isA ? 'var(--color-foreground)' : 'var(--color-card)',
                color: isA ? 'var(--color-background)' : 'var(--color-foreground)',
                border:'1px solid ' + (isA ? 'var(--color-foreground)' : 'var(--color-border)'),
                fontSize:12.5, fontWeight:600,
                display:'inline-flex', alignItems:'center', gap:7,
              }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:f.color }}/>
                {f.label}
                <span style={{
                  padding:'1px 6px', borderRadius:9999, fontSize:10, fontFamily:'var(--font-mono)',
                  background: isA ? 'rgba(255,255,255,0.18)' : 'var(--color-gray-200)',
                  color: isA ? 'var(--color-background)' : 'var(--color-gray-800)',
                }}>{f.n}</span>
              </button>
            );
          })}
        </div>

        {/* Promise list */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {shown.map(p => <PromiseDetail key={p.id} p={p}/>)}
        </div>

        {/* Method footer */}
        <div style={{
          marginTop:24, padding:'18px 20px', borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
          display:'flex', gap:14, alignItems:'flex-start',
        }}>
          <I.ShieldFill style={{ width:18, height:18, color:'var(--color-brand-600)', flexShrink:0, marginTop:2 }}/>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:'var(--color-brand-900)' }}>How we score promises</div>
            <div style={{ fontSize:12, color:'var(--color-brand-900)', marginTop:6, lineHeight:1.65 }}>
              Promises are pulled from the leader's manifesto, election rallies, and on-record interviews. Each promise has its own evidence chain — RTI replies, parliamentary records, citizen complaints, and credible press. <strong>Kept</strong> requires verifiable delivery. <strong>Broken</strong> requires the deadline to have passed with no progress. Citizens can challenge any classification via the appeal flow.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { PromiseTrackingDeep, PromiseDetail });
