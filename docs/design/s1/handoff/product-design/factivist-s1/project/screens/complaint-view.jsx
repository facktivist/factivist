// Factivist — Complaint View / detail screen (desktop)
// Public view of complaint #4820. Anchored, under review, with full
// workflow timeline + evidence carousel + linked POI + linked court case.

const StatusPill = ({ status, severity }) => {
  const statusStyle = {
    'Submitted':    { bg:'var(--color-gray-200)',    fg:'var(--color-gray-800)' },
    'Under review': { bg:'var(--color-warning-100)', fg:'var(--color-warning-900)' },
    'Verified':     { bg:'var(--color-brand-100)',   fg:'var(--color-brand-800)' },
    'Published':    { bg:'var(--color-success-100)', fg:'var(--color-success-800)' },
    'Resolved':     { bg:'var(--color-success-500)', fg:'#fff' },
  }[status] || { bg:'var(--color-gray-200)', fg:'var(--color-gray-800)' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6, height:24, padding:'0 11px',
      background:statusStyle.bg, color:statusStyle.fg, borderRadius:9999,
      fontSize:11, fontWeight:700, letterSpacing:'0.02em',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', opacity:0.7 }}/>
      {status.toUpperCase()}
    </span>
  );
};

const WorkflowRail = ({ workflow }) => (
  <ol style={{ listStyle:'none', padding:0, margin:0, position:'relative' }}>
    <span style={{
      position:'absolute', left:11, top:14, bottom:14, width:2,
      background:'var(--color-border)',
    }}/>
    {workflow.map((w, i) => {
      const isDone = w.state === 'done';
      const isCurr = w.state === 'current';
      const isPart = w.state === 'partial';
      return (
        <li key={w.id} style={{
          position:'relative', paddingLeft:34,
          paddingBottom: i === workflow.length-1 ? 0 : 16,
          display:'flex', gap:14, alignItems:'flex-start',
        }}>
          <span style={{
            position:'absolute', left:0, top:2,
            width:24, height:24, borderRadius:'50%',
            background:'var(--color-background)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{
              width: isCurr ? 20 : 14,
              height: isCurr ? 20 : 14,
              borderRadius:'50%',
              background: isDone ? 'var(--color-success-500)'
                        : isCurr ? 'var(--color-brand-500)'
                        : isPart ? 'var(--color-warning-500)'
                        : 'var(--color-gray-300)',
              color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              boxShadow: isCurr ? '0 0 0 4px var(--color-brand-100)' : 'none',
              animation: isCurr ? 'fv-pulse 2s ease-in-out infinite' : 'none',
            }}>
              {isDone && <I.Check style={{ width:10, height:10 }}/>}
              {isCurr && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
            </span>
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ fontSize:13, fontWeight:600, color: isDone ? 'var(--color-foreground)' : isCurr ? 'var(--color-brand-800)' : 'var(--color-foreground)' }}>{w.label}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>{w.at.toUpperCase()}</div>
            </div>
            <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:3, lineHeight:1.5 }}>{w.sub}</div>
          </div>
        </li>
      );
    })}
    <style>{`@keyframes fv-pulse { 0%,100%{ box-shadow:0 0 0 4px var(--color-brand-100); } 50%{ box-shadow:0 0 0 8px var(--color-brand-50); } }`}</style>
  </ol>
);

const EvidenceTile = ({ a }) => {
  const iconMap = { Audio:'Megaphone', Image:'MapPin', PDF:'FileText', Video:'FileText' };
  const IconC = I[iconMap[a.kind]] || I.FileText;
  return (
    <button style={{
      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      padding:0, background:'transparent', border:0,
      display:'flex', flexDirection:'column',
    }}>
      <div style={{
        aspectRatio:'4/3', width:'100%',
        background: a.kind === 'Image' ? 'linear-gradient(135deg, var(--color-gray-200), var(--color-gray-300))'
                  : a.kind === 'Audio' ? 'var(--color-brand-100)'
                  : a.kind === 'PDF'   ? 'var(--color-danger-50)'
                  : 'var(--color-muted)',
        borderRadius:10, border:'1px solid var(--color-border)',
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative',
      }}>
        <IconC style={{
          width:28, height:28,
          color: a.kind === 'Audio' ? 'var(--color-brand-700)'
               : a.kind === 'PDF'   ? 'var(--color-danger-700)'
               : 'var(--color-gray-600)',
        }}/>
        <span style={{
          position:'absolute', top:8, left:8,
          padding:'3px 7px', background:'rgba(0,0,0,0.65)', color:'#fff',
          borderRadius:6, fontSize:9, fontWeight:700, letterSpacing:'0.06em', fontFamily:'var(--font-mono)',
        }}>{a.kind.toUpperCase()}</span>
        {a.duration && <span style={{
          position:'absolute', bottom:8, right:8,
          padding:'3px 7px', background:'rgba(0,0,0,0.65)', color:'#fff',
          borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)',
        }}>{a.duration}</span>}
      </div>
      <div style={{ marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.4,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.label}</div>
        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>{a.size}</div>
      </div>
    </button>
  );
};

const ComplaintView = () => {
  const c = window.fvDataExtra.complaintDetail;
  const progress = Math.min(100, (c.endorsements / c.endorsementsToCritical) * 100);

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Feed</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Police misconduct</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>#{c.id}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}>Subscribe</Btn>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share</Btn>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.ArrowUp style={{ width:13, height:13 }}/>}>
            Endorse · {c.endorsements}
          </Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.6fr) 1fr', gap:24 }}>
          {/* LEFT — body */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Hero */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                <StatusPill status={c.status}/>
                <Chip tone="danger" sm bordered>{c.severity}</Chip>
                <Chip tone="default" sm bordered>{c.category} · {c.subCategory}</Chip>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
                  #{c.id} · submitted {c.submittedAt}
                </span>
              </div>
              <h1 style={{
                margin:0, fontSize:32, fontWeight:800, letterSpacing:'-0.025em',
                lineHeight:1.15, color:'var(--color-foreground)', textWrap:'balance',
              }}>
                {c.title}
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14, fontSize:12.5, color:'var(--color-muted-foreground)' }}>
                <Avatar handle={c.submittedBy} size={26}/>
                <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.submittedBy}</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:'var(--color-brand-700)', fontWeight:600 }}>
                  <I.ShieldFill style={{ width:11, height:11 }}/>
                  verified
                </span>
                <span>·</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                  <I.MapPin style={{ width:11, height:11 }}/>
                  {c.constituency} · pin {c.pincode}
                </span>
              </div>
            </div>

            {/* Body */}
            <Card pad={22}>
              <div style={{
                fontSize:15, lineHeight:1.7, color:'var(--color-foreground)',
                whiteSpace:'pre-line', textWrap:'pretty',
              }}>
                {c.body}
              </div>
              <div style={{
                marginTop:18, paddingTop:14, borderTop:'1px solid var(--color-border)',
                display:'flex', alignItems:'center', gap:18, fontSize:11, color:'var(--color-muted-foreground)',
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <I.MessageSq style={{ width:13, height:13 }}/>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.comments}</span>
                  comments
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <I.Link style={{ width:13, height:13 }}/>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.shares}</span>
                  shares
                </span>
                <span>·</span>
                <span style={{ fontFamily:'var(--font-mono)' }}>{c.views.toLocaleString()} views</span>
              </div>
            </Card>

            {/* Evidence */}
            <Card pad={22}>
              <SectionHead
                icon={<I.Paperclip style={{ width:16, height:16 }}/>}
                title={'Evidence · ' + c.evidence.length}
                subtitle="Metadata stripped on-device. Hashes anchored alongside the complaint body."
                right={<Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>}>Open viewer</Btn>}
              />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
                {c.evidence.map(a => <EvidenceTile key={a.label} a={a}/>)}
              </div>
            </Card>

            {/* Endorsers */}
            <Card pad={22}>
              <SectionHead
                icon={<I.ArrowUp style={{ width:16, height:16 }}/>}
                title={'Endorsements · ' + c.endorsements.toLocaleString()}
                subtitle={'+' + c.endorsementsLastDay + ' in the last 24 hours · ' + Math.round(progress) + '% to Critical Issue threshold'}
                right={<Btn variant="solid" tone="primary" size="sm" icon={<I.ArrowUp style={{ width:12, height:12 }}/>}>Endorse</Btn>}
              />
              <div style={{ marginBottom:14 }}>
                <div style={{ height:6, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width: progress + '%', height:'100%', background:'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-700))', borderRadius:99 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
                  <span>{c.endorsements.toLocaleString()} endorsed</span>
                  <span>{c.endorsementsToCritical.toLocaleString()} → CRITICAL</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ display:'flex' }}>
                  {c.topEndorsers.map((h, i) => (
                    <div key={h} style={{ marginLeft: i===0 ? 0 : -8 }}>
                      <Avatar handle={h} size={28}/>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12, color:'var(--color-muted-foreground)' }}>
                  Includes <strong style={{ color:'var(--color-foreground)' }}>{c.topEndorsers[0]}</strong>, <strong style={{ color:'var(--color-foreground)' }}>{c.topEndorsers[1]}</strong> and <strong style={{ color:'var(--color-foreground)' }}>{c.endorsements - 2}</strong> others.
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — workflow + context */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card pad={22}>
              <SectionHead
                icon={<I.ShieldFill style={{ width:16, height:16 }}/>}
                title="Lifecycle"
                subtitle="Public, anchored milestones."
              />
              <WorkflowRail workflow={c.workflow}/>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.Link style={{ width:16, height:16 }}/>}
                title="Linked accused"
                dense
              />
              <button style={{
                width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                padding:'12px 14px', borderRadius:12,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{
                  width:38, height:38, borderRadius:10, flexShrink:0,
                  background:'var(--color-gray-900)', color:'var(--color-gray-50)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, letterSpacing:'-0.02em',
                }}>PR</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{c.linkedPOI.name}</span>
                    <Chip tone="danger" sm>{c.linkedPOI.risk} risk</Chip>
                  </div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{c.linkedPOI.role}</div>
                  <div style={{ fontSize:11, color:'var(--color-brand-700)', fontWeight:600, marginTop:4 }}>
                    {c.linkedPOI.related} related complaints →
                  </div>
                </div>
                <I.ChevronR style={{ width:14, height:14, color:'var(--color-muted-foreground)' }}/>
              </button>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.Calendar style={{ width:16, height:16 }}/>}
                title="Court case in progress"
                dense
              />
              <button style={{
                width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                padding:'12px 14px', borderRadius:12,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                display:'flex', flexDirection:'column', gap:6,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-foreground)', fontWeight:600 }}>{c.judicial.id}</span>
                  <Chip tone="warning" sm bordered>{c.judicial.court}</Chip>
                </div>
                <div style={{ fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.45 }}>{c.judicial.matter}</div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>Next listing · <strong style={{ color:'var(--color-foreground)' }}>{c.judicial.next}</strong></div>
              </button>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.ShieldFill style={{ width:16, height:16 }}/>}
                title="On-chain anchor"
                dense
              />
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.7 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>chain</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Polygon zkEVM</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>tx</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{c.anchor.tx}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>block</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>#{c.anchor.block}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>anchored at</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{c.anchor.when}</span>
                </div>
              </div>
              <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>} style={{ marginTop:10 }}>Open in explorer</Btn>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ComplaintView });
