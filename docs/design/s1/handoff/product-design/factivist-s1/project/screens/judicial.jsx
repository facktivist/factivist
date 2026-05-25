// Factivist — Judicial case tracking
// Layout (web, ~1280 wide):
//   Hero strip — case identity + status + next hearing
//   Body (2col):
//     LEFT: hearing timeline (every listing, every adjournment, with reason)
//     RIGHT: pendency context + judge analytics + related cases

const HEARING_TAG_STYLE = {
  Filed:     { bg:'var(--color-gray-200)',     fg:'var(--color-gray-800)' },
  Notice:    { bg:'var(--color-brand-100)',    fg:'var(--color-brand-800)' },
  Hearing:   { bg:'var(--color-gray-200)',     fg:'var(--color-gray-800)' },
  Adjourned: { bg:'var(--color-warning-100)',  fg:'var(--color-warning-900)' },
  Order:     { bg:'var(--color-success-100)',  fg:'var(--color-success-800)' },
  Listed:    { bg:'var(--color-brand-500)',    fg:'#fff' },
};

const HearingTag = ({ tag }) => {
  const s = HEARING_TAG_STYLE[tag] || HEARING_TAG_STYLE.Hearing;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', height:22, padding:'0 9px',
      background:s.bg, color:s.fg, borderRadius:9999,
      fontSize:11, fontWeight:600, letterSpacing:'0.01em', flexShrink:0,
    }}>{tag}</span>
  );
};

const JudicialCase = () => {
  const j = window.fvDataExtra.judicial;
  const adjournmentCount = j.hearings.filter(h => h.tag === 'Adjourned').length;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Cases</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span>{j.case.court}</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>{j.case.id}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Bell style={{width:13,height:13}}/>}>Subscribe</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{width:13,height:13}}/>}>e-Courts PDF</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Hero */}
        <Card pad={0} style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px' }}>
            <div style={{ padding:'24px 26px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <Chip tone="default" sm bordered>{j.case.court}</Chip>
                <Chip tone="default" sm bordered>{j.case.bench}</Chip>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
                  Filed {j.case.filed} · {j.case.age} days old
                </span>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:4 }}>
                  {j.case.id} · {j.case.section.toUpperCase()}
                </div>
                <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.15, color:'var(--color-foreground)' }}>
                  {j.case.matter}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, lineHeight:1.55 }}>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ width:90, color:'var(--color-muted-foreground)', flexShrink:0 }}>Petitioner</span>
                  <span style={{ color:'var(--color-foreground)' }}>{j.case.parties.petitioner}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ width:90, color:'var(--color-muted-foreground)', flexShrink:0 }}>Respondent</span>
                  <span style={{ color:'var(--color-foreground)' }}>{j.case.parties.respondent}</span>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ width:90, color:'var(--color-muted-foreground)', flexShrink:0 }}>Before</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:500 }}>{j.case.judge}</span>
                </div>
              </div>
              <div style={{
                padding:'12px 14px', background:'var(--color-muted)',
                border:'1px solid var(--color-border)', borderRadius:12,
                fontSize:13, lineHeight:1.6, color:'var(--color-foreground)',
                textWrap:'pretty',
              }}>
                {j.case.summary}
              </div>
            </div>

            <div style={{
              background:'var(--color-muted)',
              borderLeft:'1px solid var(--color-border)',
              padding:'24px 22px',
              display:'flex', flexDirection:'column', gap:14,
            }}>
              <div>
                <Overline>Status</Overline>
                <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:8,
                  padding:'5px 10px', background:'var(--color-danger-500)', color:'#fff',
                  borderRadius:9999, fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>
                  <I.Flash style={{width:11,height:11}}/>
                  ADJOURNED · {adjournmentCount}×
                </div>
              </div>
              <div style={{ height:1, background:'var(--color-border)' }}/>
              <div>
                <Overline>Next listing</Overline>
                <div style={{ marginTop:6, fontSize:24, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.1 }}>
                  {j.case.nextDate}
                </div>
                <div style={{ marginTop:4, fontSize:12, color:'var(--color-muted-foreground)' }}>
                  {j.case.nextRelative} · {j.case.court}
                </div>
              </div>
              <div style={{ height:1, background:'var(--color-border)' }}/>
              <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:11, color:'var(--color-muted-foreground)' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Cited in POIs</span>
                  <span style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{j.case.citedIn}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Linked RTIs</span>
                  <span style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{j.case.rtiThreads}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Anchored</span>
                  <span style={{ color:'var(--color-success-700)', fontFamily:'var(--font-mono)', fontWeight:600 }}>{j.case.polygonTx}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <Kpi value={j.case.age + 'd'}     label="Age of matter"        sub="filed 12 Apr 2024" tone="warning"/>
          <Kpi value={adjournmentCount}     label="Adjournments"         sub={Math.round((adjournmentCount/(j.hearings.length-2))*100) + '% of hearings'} tone="danger"/>
          <Kpi value={j.hearings.filter(h=>h.tag==='Order').length} label="Substantive orders"/>
          <Kpi value={j.pendency.medianAge + 'd'} label="Median age · this bench" sub={'national ' + j.pendency.nationalMedian + 'd'} tone="warning"/>
        </div>

        {/* Two-col body */}
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:20 }}>
          {/* LEFT — Hearings timeline */}
          <Card>
            <SectionHead
              icon={<I.Calendar style={{width:16,height:16}}/>}
              title={"Hearing history · " + j.hearings.length + ' listings'}
              subtitle="Pulled from eCourts / NJDG nightly. Crowd-corrected by verified citizens."
              right={
                <div style={{ display:'flex', gap:6 }}>
                  <Chip tone="primary" sm bordered>All</Chip>
                  <Chip tone="default" sm bordered>Adjourned only</Chip>
                  <Chip tone="default" sm bordered>Orders</Chip>
                </div>
              }
            />
            <ol style={{ listStyle:'none', padding:0, margin:0, position:'relative' }}>
              <span style={{
                position:'absolute', left:8, top:12, bottom:12, width:2,
                background:'var(--color-border)',
              }}/>
              {j.hearings.map((h, i) => (
                <li key={i} style={{
                  position:'relative', paddingLeft:30,
                  paddingBottom: i === j.hearings.length-1 ? 0 : 16,
                  display:'flex', gap:12, alignItems:'flex-start',
                }}>
                  <span style={{
                    position:'absolute', left:0, top:4,
                    width:18, height:18, borderRadius:'50%',
                    background:'var(--color-background)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <span style={{
                      width:10, height:10, borderRadius:'50%',
                      background:
                        h.tone==='success' ? 'var(--color-success-500)' :
                        h.tone==='warning' ? 'var(--color-warning-500)' :
                        h.tone==='danger'  ? 'var(--color-danger-500)' :
                        h.tag==='Listed'   ? 'var(--color-brand-500)' :
                        'var(--color-gray-400)',
                      boxShadow: h.tag==='Listed' ? '0 0 0 4px var(--color-brand-100)' : 'none',
                    }}/>
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{
                        fontSize:11, fontFamily:'var(--font-mono)',
                        color: h.tag==='Listed' ? 'var(--color-brand-700)' : 'var(--color-muted-foreground)',
                        letterSpacing:'0.04em', fontWeight: h.tag==='Listed' ? 700 : 500,
                      }}>{h.at.toUpperCase()}</span>
                      <HearingTag tag={h.tag}/>
                      <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{h.court}</span>
                    </div>
                    <div style={{ fontSize:13, color:'var(--color-foreground)', lineHeight:1.5 }}>{h.label}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* RIGHT — context */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card>
              <SectionHead
                icon={<I.Ranking style={{width:16,height:16}}/>}
                title="Pendency on this bench"
                subtitle={j.pendency.courtName}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <Kpi value={j.pendency.pending.toLocaleString()}   label="Pending"/>
                <Kpi value={j.pendency.olderThan2y.toLocaleString()} label="Older than 2y" tone="warning"/>
              </div>
              <Overline style={{ marginBottom:8 }}>Case-type mix</Overline>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {j.pendency.mix.map(m => (
                  <div key={m.type} style={{ display:'grid', gridTemplateColumns:'110px 1fr 36px', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--color-foreground)' }}>{m.type}</span>
                    <RowBar value={m.pct} max={40} height={6}/>
                    <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', textAlign:'right' }}>{m.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHead
                icon={<I.ShieldFill style={{width:16,height:16}}/>}
                title="Judge analytics"
                subtitle={j.judge.name + ' · appointed ' + j.judge.appointed}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <Kpi value={j.judge.medianDisposal + 'd'} label="Median disposal" sub={'bench ' + j.judge.benchMedian + 'd'} tone="warning"/>
                <Kpi value={Math.round(j.judge.adjournmentRate*100) + '%'} label="Adjournment rate" sub={'bench ' + Math.round(j.judge.benchAdjRate*100) + '%'} tone="danger"/>
              </div>
              <div style={{
                padding:'10px 12px', background:'var(--color-muted)',
                border:'1px solid var(--color-border)', borderRadius:10,
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
              }}>
                <div>
                  <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>ADJOURNMENT RATE · 12-MO TREND</div>
                  <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>Trending up</div>
                </div>
                <Spark values={j.judge.spark} color="var(--color-danger-500)" width={120} height={36}/>
              </div>
              <div style={{ marginTop:14 }}>
                <Overline style={{ marginBottom:8 }}>Notable recent orders</Overline>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {j.judge.notableOrders.map((o,i) => (
                    <div key={i} style={{
                      padding:'8px 10px', background:'var(--color-card)',
                      border:'1px solid var(--color-border)', borderRadius:10,
                    }}>
                      <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>{o.at.toUpperCase()}</div>
                      <div style={{ fontSize:12, marginTop:3, color:'var(--color-foreground)', lineHeight:1.5 }}>{o.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <SectionHead
                icon={<I.Link style={{width:16,height:16}}/>}
                title="Related cases"
                dense
              />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {j.related.map(r => (
                  <button key={r.id} style={{
                    width:'100%', textAlign:'left', background:'transparent',
                    border:'1px solid var(--color-border)', borderRadius:12,
                    padding:'10px 12px', cursor:'pointer', fontFamily:'inherit',
                    display:'flex', flexDirection:'column', gap:5,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{r.id}</span>
                      <span style={{
                        padding:'2px 7px', borderRadius:9999, fontSize:10, fontWeight:600,
                        background:
                          r.status==='Disposed' ? 'var(--color-success-100)' :
                          r.status==='Reserved' ? 'var(--color-brand-100)' :
                          'var(--color-warning-100)',
                        color:
                          r.status==='Disposed' ? 'var(--color-success-800)' :
                          r.status==='Reserved' ? 'var(--color-brand-800)' :
                          'var(--color-warning-900)',
                      }}>{r.status}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--color-foreground)', fontWeight:500, lineHeight:1.45 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>
                      {r.court} · {r.when}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { JudicialCase });
