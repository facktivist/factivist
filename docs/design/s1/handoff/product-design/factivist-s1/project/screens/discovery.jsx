// Factivist — Discovery feed (desktop)
// Three-column layout: filters + main feed + trending/quick-actions
// The home surface a verified citizen lands on after onboarding.

const SEVERITY_COLOR = {
  Critical:'var(--color-danger-600)',
  High:    'var(--color-danger-500)',
  Medium:  'var(--color-warning-500)',
  Low:     'var(--color-success-500)',
};

const FeedCard = ({ c }) => {
  const isResolved = c.status === 'Resolved';
  const isVerified = c.status === 'Verified';
  return (
    <article style={{
      padding:18, borderRadius:16,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      display:'flex', flexDirection:'column', gap:12, cursor:'pointer',
    }}>
      <header style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <Avatar handle={c.by} size={26}/>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color:'var(--color-foreground)' }}>{c.by}</span>
        <I.ShieldFill style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
        <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· {c.when}</span>
        <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>·</span>
        <span style={{ fontSize:11, color:'var(--color-muted-foreground)', display:'inline-flex', alignItems:'center', gap:4 }}>
          <I.MapPin style={{ width:11, height:11 }}/>{c.constituency}
        </span>
        <div style={{ marginLeft:'auto', display:'inline-flex', gap:6 }}>
          <StatusPill status={c.status}/>
        </div>
      </header>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        <span style={{
          width:4, alignSelf:'stretch', borderRadius:99, flexShrink:0,
          background: SEVERITY_COLOR[c.severity] || 'var(--color-gray-300)',
        }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:6 }}>
            <Chip tone="default" sm bordered>{c.category}</Chip>
            <Chip tone={c.severity === 'Critical' ? 'danger' : c.severity === 'High' ? 'danger' : c.severity === 'Medium' ? 'warning' : 'success'} sm>{c.severity}</Chip>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
          </div>
          <h3 style={{
            margin:0, fontSize:17, fontWeight:700, letterSpacing:'-0.015em', lineHeight:1.3,
            color:'var(--color-foreground)', textWrap:'pretty',
          }}>{c.title}</h3>
          <p style={{
            margin:'8px 0 0', fontSize:13, lineHeight:1.6, color:'var(--color-gray-700)', textWrap:'pretty',
          }}>{c.body}</p>
        </div>
      </div>

      {/* If close to a threshold, surface a critical-soon callout */}
      {c.criticalSoon && (
        <div style={{
          padding:'10px 12px', borderRadius:10,
          background:'var(--color-danger-50)', border:'1px solid var(--color-danger-200)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <I.Flash style={{ width:13, height:13, color:'var(--color-danger-600)' }}/>
          <span style={{ fontSize:12, color:'var(--color-danger-800)', fontWeight:500 }}>
            <strong>16 endorsements</strong> from Critical Issue threshold. {c.trend}.
          </span>
        </div>
      )}

      {isResolved && (
        <div style={{
          padding:'10px 12px', borderRadius:10,
          background:'var(--color-success-50)', border:'1px solid var(--color-success-200)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <I.Check style={{ width:13, height:13, color:'var(--color-success-700)' }}/>
          <span style={{ fontSize:12, color:'var(--color-success-800)' }}>
            Attested by <strong>17 verified citizens</strong>. Anchored as resolved.
          </span>
        </div>
      )}

      <footer style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingTop:10, borderTop:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:12, color:'var(--color-muted-foreground)' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, color: isResolved ? 'var(--color-gray-500)' : 'var(--color-foreground)' }}>
            <I.ArrowUp style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{c.endorsements.toLocaleString()}</span>
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <I.MessageSq style={{ width:13, height:13 }}/>
            <span style={{ fontFamily:'var(--font-mono)' }}>{c.comments}</span>
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <I.Paperclip style={{ width:13, height:13 }}/>
            <span style={{ fontFamily:'var(--font-mono)' }}>{c.evidence}</span>
          </span>
          {c.anchor && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:'var(--color-success-700)' }}>
              <I.ShieldFill style={{ width:11, height:11 }}/>
              <span style={{ fontSize:11, fontWeight:600 }}>Anchored</span>
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {!isResolved && (
            <Btn variant="bordered" tone="default" size="sm" icon={<I.ArrowUp style={{ width:12, height:12 }}/>}>Endorse</Btn>
          )}
          <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>}>Open</Btn>
        </div>
      </footer>
    </article>
  );
};

const FilterGroup = ({ label, items, value, onChange, showCount=true }) => (
  <div style={{ marginBottom:14 }}>
    <Overline style={{ marginBottom:8 }}>{label}</Overline>
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {items.map(i => {
        const isActive = value === i.id;
        return (
          <button key={i.id} onClick={()=>onChange?.(i.id)} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'7px 10px', borderRadius:8,
            background: isActive ? 'var(--color-brand-50)' : 'transparent',
            border:'1px solid ' + (isActive ? 'var(--color-brand-200)' : 'transparent'),
            cursor:'pointer', fontFamily:'inherit', textAlign:'left',
          }}>
            {i.dot && <span style={{ width:8, height:8, borderRadius:'50%', background:i.dot, flexShrink:0 }}/>}
            <span style={{ flex:1, fontSize:12.5, fontWeight: isActive ? 600 : 500, color:'var(--color-foreground)' }}>{i.label}</span>
            {showCount && i.n != null && (
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{i.n}</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const DiscoveryFeed = () => {
  const feed = window.fvDataExtra.feed;
  const trending = window.fvDataExtra.trending;
  const [sort, setSort] = React.useState('hot');
  const [scope, setScope] = React.useState('mum-s');
  const [statusFilter, setStatusFilter] = React.useState('all');

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Feed</span>
      </>} right={
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            height:34, padding:'0 12px', background:'var(--color-muted)',
            border:'1px solid var(--color-border)', borderRadius:10, fontSize:13,
            minWidth:260,
          }}>
            <I.Search style={{ width:14, height:14, color:'var(--color-muted-foreground)' }}/>
            <input placeholder="Search complaints, accused, sections…" style={{
              flex:1, border:0, background:'transparent', outline:'none',
              fontFamily:'inherit', fontSize:13, color:'var(--color-foreground)',
            }}/>
          </div>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.Plus style={{ width:13, height:13 }}/>}>File complaint</Btn>
        </div>
      }/>

      <main style={{
        maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px',
        display:'grid', gridTemplateColumns:'220px minmax(0,1fr) 300px', gap:24,
      }}>
        {/* LEFT — filters */}
        <aside style={{ position:'sticky', top:20, alignSelf:'flex-start' }}>
          <FilterGroup label="Scope" value={scope} onChange={setScope} items={[
            { id:'mum-s', label:'My constituency', n:412 },
            { id:'mh',    label:'My state · MH',   n:1840 },
            { id:'all',   label:'All India',       n:11256 },
            { id:'follow',label:'Following',       n:18 },
          ]}/>
          <FilterGroup label="Status" value={statusFilter} onChange={setStatusFilter} items={[
            { id:'all',       label:'All' },
            { id:'submitted', label:'Submitted',   dot:'var(--color-gray-400)' },
            { id:'review',    label:'Under review',dot:'var(--color-warning-500)', n:88 },
            { id:'verified',  label:'Verified',    dot:'var(--color-brand-500)',   n:142 },
            { id:'published', label:'Published',   dot:'var(--color-success-500)', n:182 },
            { id:'resolved',  label:'Resolved',    dot:'var(--color-success-700)', n:0 },
          ]}/>
          <FilterGroup label="Category" value="all" onChange={()=>{}} items={[
            { id:'all',   label:'All categories' },
            { id:'infra', label:'Infrastructure',    n:184 },
            { id:'police',label:'Police misconduct', n:72  },
            { id:'rti',   label:'RTI obstruction',   n:31  },
            { id:'health',label:'Healthcare',        n:51  },
            { id:'env',   label:'Environment',       n:18  },
          ]}/>
          <div style={{ marginTop:8, padding:'12px 14px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <I.Bell style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
              <span style={{ fontSize:12, fontWeight:600 }}>Save this view</span>
            </div>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>Get alerted when any new complaint matches Mumbai South + Critical.</div>
          </div>
        </aside>

        {/* CENTER — feed */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <Overline>Mumbai South · all categories</Overline>
              <h1 style={{ margin:'6px 0 0', fontSize:24, fontWeight:800, letterSpacing:'-0.02em' }}>What's anchored right now</h1>
            </div>
            <div style={{ display:'flex', gap:4, background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:9999, padding:3 }}>
              {[
                { id:'hot',     label:'Hot',     icon:'Flash' },
                { id:'new',     label:'New',     icon:'Sparkles' },
                { id:'top',     label:'Top',     icon:'ArrowUp' },
                { id:'unresolved', label:'Stuck', icon:'Calendar' },
              ].map(s => {
                const IconC = I[s.icon] || I.Sparkles;
                const isActive = sort === s.id;
                return (
                  <button key={s.id} onClick={()=>setSort(s.id)} style={{
                    padding:'6px 12px', borderRadius:9999, border:0, cursor:'pointer', fontFamily:'inherit',
                    background: isActive ? 'var(--color-foreground)' : 'transparent',
                    color: isActive ? 'var(--color-background)' : 'var(--color-foreground)',
                    fontSize:12, fontWeight:600,
                    display:'inline-flex', alignItems:'center', gap:5,
                  }}>
                    <IconC style={{ width:11, height:11 }}/>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {feed.map(c => <FeedCard key={c.id} c={c}/>)}
          </div>

          <div style={{ marginTop:20, display:'flex', justifyContent:'center' }}>
            <Btn variant="bordered" tone="default" size="md">Load 12 more</Btn>
          </div>
        </div>

        {/* RIGHT — trending + quick actions */}
        <aside style={{ position:'sticky', top:20, alignSelf:'flex-start', display:'flex', flexDirection:'column', gap:14 }}>
          <Card pad={16}>
            <SectionHead
              icon={<I.Flash style={{ width:14, height:14 }}/>}
              title="Trending in your area"
              subtitle="Last 24 hours"
              dense
            />
            <ol style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
              {trending.map((t, i) => (
                <li key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{
                    fontFamily:'var(--font-sans)', fontSize:20, fontWeight:800, letterSpacing:'-0.04em',
                    color:'var(--color-brand-500)', lineHeight:1, width:22,
                  }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:500, lineHeight:1.35, color:'var(--color-foreground)' }}>{t.title}</div>
                    <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
                      <span>{t.constituency}</span>
                      <span>·</span>
                      <span style={{ color:'var(--color-danger-700)', fontWeight:600, fontFamily:'var(--font-mono)' }}>{t.delta}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card pad={16} accent>
            <SectionHead
              icon={<I.Check style={{ width:14, height:14 }}/>}
              title="3 awaiting your attestation"
              subtitle="Citizens claim these are resolved. Confirm or dispute."
              dense
            />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { id:4814, title:'BEST bus #422 wheelchair ramp restored', at:'13/15' },
                { id:4711, title:'Sion Hospital ICU bed expansion · phase 1', at:'9/15' },
                { id:4602, title:'Mahul road overlay tarring', at:'14/15' },
              ].map(a => (
                <button key={a.id} style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'9px 11px', borderRadius:10,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', alignItems:'center', gap:10,
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, fontWeight:600, lineHeight:1.35 }}>{a.title}</div>
                    <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:3 }}>{a.at} attested</div>
                  </div>
                  <I.ChevronR style={{ width:12, height:12, color:'var(--color-muted-foreground)' }}/>
                </button>
              ))}
            </div>
          </Card>

          <Card pad={16}>
            <SectionHead
              icon={<I.Sparkles style={{ width:14, height:14 }}/>}
              title="Quick filters"
              dense
            />
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {['§154(3) CrPC','RTI § 8(1)(j)','RTE §12(1)(c)','Lalita Kumari','UAPA','MPLADS','LAD funds'].map(t => (
                <Chip key={t} tone="default" sm bordered>{t}</Chip>
              ))}
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

Object.assign(window, { DiscoveryFeed, FeedCard });
