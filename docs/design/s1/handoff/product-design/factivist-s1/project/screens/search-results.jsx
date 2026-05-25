// Factivist — Search Results (desktop)
// Populated state of the search experience. Faceted left rail, mixed-type
// result feed, and a "spotlight" right rail with the top leader / case hits.

const Highlight = ({ html }) => (
  <span dangerouslySetInnerHTML={{
    __html: html.replace(/<em>/g, '<mark style="background:var(--color-warning-100); color:var(--color-warning-900); padding:0 2px; border-radius:3px; font-style:normal; font-weight:600;">').replace(/<\/em>/g, '</mark>'),
  }}/>
);

const SearchResults = () => {
  const r = window.fvDataExtra.searchResults;
  const [facet, setFacet] = React.useState('all');

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Search</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>"{r.query}"</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}>Filters</Btn>
          <Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}>Save as alert</Btn>
        </div>
      }/>

      <main style={{
        maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px',
        display:'grid', gridTemplateColumns:'220px minmax(0,1fr) 320px', gap:24,
      }}>
        {/* LEFT — facets */}
        <aside style={{ position:'sticky', top:20, alignSelf:'flex-start' }}>
          <Overline style={{ marginBottom:10 }}>By type</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {r.facets.map(f => {
              const isA = facet === f.id;
              return (
                <button key={f.id} onClick={()=>setFacet(f.id)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 11px', borderRadius:9,
                  background: isA ? 'var(--color-brand-50)' : 'transparent',
                  border:'1px solid ' + (isA ? 'var(--color-brand-200)' : 'transparent'),
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                  <span style={{ fontSize:12.5, fontWeight: isA ? 600 : 500, color:'var(--color-foreground)' }}>{f.label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{f.n}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop:18 }}>
            <Overline style={{ marginBottom:10 }}>Refine</Overline>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { l:'Last 30 days',     k:'recency' },
                { l:'Critical severity',k:'crit'    },
                { l:'My constituency',  k:'mine'    },
                { l:'Verified only',    k:'verif'   },
              ].map(f => (
                <label key={f.k} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'7px 10px', borderRadius:8,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  cursor:'pointer',
                }}>
                  <span style={{
                    width:16, height:16, borderRadius:4, flexShrink:0,
                    background: f.k === 'crit' ? 'var(--color-brand-500)' : 'var(--color-card)',
                    border:'1.5px solid ' + (f.k === 'crit' ? 'var(--color-brand-500)' : 'var(--color-gray-300)'),
                    color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {f.k === 'crit' && <I.Check style={{ width:9, height:9 }}/>}
                  </span>
                  <span style={{ fontSize:12, color:'var(--color-foreground)' }}>{f.l}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER — results */}
        <div>
          {/* Search field */}
          <div style={{
            padding:'10px 14px', background:'var(--color-card)',
            border:'1px solid var(--color-border)', borderRadius:12,
            display:'flex', alignItems:'center', gap:10, marginBottom:14,
          }}>
            <I.Search style={{ width:15, height:15, color:'var(--color-muted-foreground)' }}/>
            <input defaultValue={r.query} style={{
              flex:1, border:0, outline:'none', background:'transparent',
              fontFamily:'inherit', fontSize:14, color:'var(--color-foreground)',
            }}/>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>
              {r.complaints.length + r.poi.length + r.leaders.length + r.cases.length + r.commentHits.length} OF 171
            </span>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <h1 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:'-0.015em' }}>
              {r.counts.complaints} complaints · {r.counts.leaders} leaders · {r.counts.poi} POIs · {r.counts.cases} cases · {r.counts.comments} comments
            </h1>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>relevance · most endorsed</span>
          </div>

          {/* Complaints section */}
          <div style={{ marginBottom:18 }}>
            <Overline style={{ marginBottom:8 }}>Complaints · top hits</Overline>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {r.complaints.map(c => (
                <article key={c.id} style={{
                  padding:'14px 16px', borderRadius:14,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', flexDirection:'column', gap:8, cursor:'pointer',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <StatusPill status={c.status}/>
                    <Chip tone="danger" sm>{c.severity}</Chip>
                    <Chip tone="default" sm bordered>{c.constituency}</Chip>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em', lineHeight:1.35, color:'var(--color-foreground)' }}>
                    <Highlight html={c.title}/>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--color-gray-700)', lineHeight:1.6 }}>
                    <Highlight html={c.body}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:11, color:'var(--color-muted-foreground)' }}>
                    <Avatar handle={c.by} size={20}/>
                    <span style={{ fontFamily:'var(--font-mono)' }}>{c.by}</span>
                    <span>·</span>
                    <span>{c.when}</span>
                    <span>·</span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                      <I.ArrowUp style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--color-foreground)' }}>{c.endorsements}</span>
                    </span>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                      <I.MessageSq style={{ width:11, height:11 }}/>
                      <span style={{ fontFamily:'var(--font-mono)' }}>{c.comments}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* POI section */}
          <div style={{ marginBottom:18 }}>
            <Overline style={{ marginBottom:8 }}>Accused / POI</Overline>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {r.poi.map(p => (
                <button key={p.id} style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'14px 14px', borderRadius:14,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', gap:12, alignItems:'flex-start',
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:11, flexShrink:0,
                    background:'var(--color-gray-900)', color:'#fff',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize:14, letterSpacing:'-0.02em',
                  }}>{p.name.split(' ').filter(s => s[0] !== '"').slice(0,2).map(s=>s[0]).join('')}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.01em' }}>{p.name}</span>
                      <Chip tone="danger" sm>{p.risk} risk</Chip>
                    </div>
                    <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginBottom:5 }}>{p.role}</div>
                    <div style={{ fontSize:12, color:'var(--color-gray-700)', lineHeight:1.5 }}>
                      <Highlight html={p.sub}/>
                    </div>
                    <div style={{ fontSize:11, color:'var(--color-brand-700)', fontWeight:600, marginTop:6 }}>
                      {p.linked} linked complaints →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cases */}
          <div style={{ marginBottom:18 }}>
            <Overline style={{ marginBottom:8 }}>Court cases</Overline>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {r.cases.map(c => (
                <button key={c.id} style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'12px 14px', borderRadius:11,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:9, flexShrink:0,
                    background:'var(--color-muted)', color:'var(--color-brand-600)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><I.Calendar style={{ width:16, height:16 }}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{c.id}</span>
                      <Chip tone="default" sm bordered>{c.court}</Chip>
                      <Chip tone="warning" sm>{c.status}</Chip>
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, lineHeight:1.4 }}>
                      <Highlight html={c.matter}/>
                    </div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4 }}>Next listing · <strong style={{ color:'var(--color-foreground)' }}>{c.next}</strong></div>
                  </div>
                  <I.ChevronR style={{ width:14, height:14, color:'var(--color-muted-foreground)' }}/>
                </button>
              ))}
            </div>
          </div>

          {/* Comments preview */}
          <div>
            <Overline style={{ marginBottom:8 }}>Comments matching your query</Overline>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {r.commentHits.map(c => (
                <button key={c.id} style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'12px 14px', borderRadius:11,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', gap:12, alignItems:'flex-start',
                }}>
                  <Avatar handle={c.by} size={28}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{c.by}</span>
                      <I.ShieldFill style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>
                      <span style={{ fontSize:10, color:'var(--color-muted-foreground)' }}>on #{c.complaintId}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.55 }}>
                      <Highlight html={c.body}/>
                    </div>
                  </div>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--color-muted-foreground)' }}>
                    <I.ArrowUp style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                    <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--color-foreground)' }}>{c.votes}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — spotlight */}
        <aside style={{ position:'sticky', top:20, alignSelf:'flex-start', display:'flex', flexDirection:'column', gap:14 }}>
          <Card pad={16}>
            <SectionHead
              icon={<I.Ranking style={{ width:14, height:14 }}/>}
              title="Top leader for this query"
              dense
            />
            {r.leaders.map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <GradeBadge grade={l.grade} tone="danger"/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>{l.name}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{l.role}</div>
                  <div style={{ fontSize:11, color:'var(--color-gray-700)', marginTop:6, lineHeight:1.5 }}>
                    <Highlight html={l.sub}/>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <Card pad={16} accent>
            <SectionHead
              icon={<I.Sparkles style={{ width:14, height:14 }}/>}
              title="Ask AI on this query"
              dense
            />
            <p style={{ margin:0, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.6 }}>
              Want a synthesised answer across all 171 anchored hits? Switch this query into <strong>Ask AI</strong> and it will cite each source.
            </p>
            <Btn variant="solid" tone="primary" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>} style={{ marginTop:10 }}>
              Open in Ask AI
            </Btn>
          </Card>

          <Card pad={16}>
            <SectionHead
              icon={<I.Bell style={{ width:14, height:14 }}/>}
              title="Save this search"
              dense
            />
            <p style={{ margin:0, fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.6 }}>
              Get alerted when new anchored complaints match <strong style={{ color:'var(--color-foreground)' }}>"{r.query}"</strong>.
            </p>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              <Btn variant="bordered" tone="default" size="sm">Daily digest</Btn>
              <Btn variant="ghost" size="sm">Real-time</Btn>
            </div>
          </Card>

          <Card pad={16}>
            <SectionHead
              icon={<I.FileText style={{ width:14, height:14 }}/>}
              title="Citations / sections"
              dense
            />
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {['§154(3) CrPC','§156(3) CrPC','§166 CrPC','§354 IPC','Lalita Kumari (2013)','Subhakaran v. State'].map(t => (
                <Chip key={t} tone="default" sm bordered>{t}</Chip>
              ))}
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

Object.assign(window, { SearchResults });
