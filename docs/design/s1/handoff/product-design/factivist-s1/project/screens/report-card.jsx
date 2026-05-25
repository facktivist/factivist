// Factivist — Leader Report Card screen
// Two variations:
//   A · Editorial: oversized grade + narrative scorecard, dossier feel
//   B · Dashboard: scanner-style grid, all metrics at a glance
//
// Data: window.fvDataExtra.leaders[0] (Anant V. Kulkarni — Mumbai South MP).

const PROMISE_COLORS = {
  kept:    'var(--color-success-500)',
  partial: 'var(--color-warning-500)',
  broken:  'var(--color-danger-500)',
  unknown: 'var(--color-gray-300)',
};

const PartyBadge = ({ party, color }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:6,
    height:22, padding:'0 9px',
    background:'var(--color-gray-100)',
    border:'1px solid var(--color-border)',
    borderRadius:9999, fontSize:11, fontWeight:600,
    color:'var(--color-gray-800)',
  }}>
    <span style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
    {party}
  </span>
);

// ─── Variation A — Editorial ────────────────────────────────────────
const ReportCardEditorial = ({ leader }) => {
  const promiseSegments = [
    { label:'Kept',       value:leader.promisesKept,    color:PROMISE_COLORS.kept },
    { label:'Partial',    value:leader.promisesPartial, color:PROMISE_COLORS.partial },
    { label:'Broken',     value:leader.promisesBroken,  color:PROMISE_COLORS.broken },
    { label:'Unverified', value:leader.promisesUnknown, color:PROMISE_COLORS.unknown },
  ];
  const responseSegments = [
    { label:'Resolved',     value:leader.complaintsResolved,    color:'var(--color-success-500)' },
    { label:'Acknowledged', value:leader.complaintsAcknowledged,color:'var(--color-warning-500)' },
    { label:'Ignored',      value:leader.complaintsIgnored,     color:'var(--color-danger-500)' },
  ];
  const maxCat = Math.max(...leader.categoryBreakdown.map(c=>c.n));
  const promises = window.fvDataExtra.promises;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Report cards</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span>{leader.constituency}</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{leader.id}</span>
      </>} right={<div style={{ display:'flex', gap:8 }}>
        <Btn variant="ghost" size="sm" icon={<I.Link style={{width:13,height:13}}/>}>Share</Btn>
        <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{width:13,height:13}}/>}>Export</Btn>
      </div>}/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Hero dossier */}
        <Card pad={0} style={{ overflow:'hidden', marginBottom:24 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:0 }}>
            {/* Left: identity */}
            <div style={{ padding:28, display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Chip tone="default" sm bordered>{leader.role}</Chip>
                <PartyBadge party={leader.party} color={leader.partyColor}/>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)'}}>
                  {leader.term}
                </span>
              </div>
              <div>
                <div style={{
                  fontSize:34, fontWeight:800, letterSpacing:'-0.025em',
                  lineHeight:1.05, color:'var(--color-foreground)',
                }}>{leader.name}</div>
                <div style={{
                  marginTop:6, fontSize:14, color:'var(--color-muted-foreground)',
                }}>
                  <span style={{ color:'var(--color-foreground)', fontWeight:500 }}>{leader.constituency}</span>
                  {' · '}{leader.state}
                </div>
              </div>
              <div style={{
                marginTop:4, padding:'14px 16px',
                background:'var(--color-muted)', borderRadius:12,
                fontSize:13, lineHeight:1.6, color:'var(--color-foreground)',
                textWrap:'pretty',
              }}>
                <strong style={{ fontWeight:600 }}>The record so far.</strong> Attendance{' '}
                <span style={{ color:'var(--color-danger-700)', fontWeight:600 }}>{leader.attendance}%</span> against
                a Lok Sabha average of {leader.attendanceAvg}%. 6 of 17 manifesto promises broken — Mahul–Chembur 24×7 water,
                Sandhurst skywalk, and the odd-even scheme top the list. Where the office <em>has</em> moved
                is on RTI: voted Nay on the 2025 amendment. Median complaint response is 47 days; the JJ Hospital trauma
                ward did open, on time.
              </div>
            </div>

            {/* Right: grade */}
            <div style={{
              background:'var(--color-muted)',
              borderLeft:'1px solid var(--color-border)',
              padding:'28px 24px',
              display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:16,
            }}>
              <Overline>Citizen score</Overline>
              <GradeBadge grade={leader.grade} tone={leader.gradeTone} large/>
              <div style={{ textAlign:'center' }}>
                <div style={{
                  fontFamily:'var(--font-mono)', fontSize:11,
                  color:'var(--color-muted-foreground)', letterSpacing:'0.04em',
                }}>SCORE</div>
                <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginTop:2 }}>
                  {leader.score}<span style={{ color:'var(--color-muted-foreground)', fontWeight:500, fontSize:14 }}>/100</span>
                </div>
              </div>
              <div style={{
                width:'100%', height:1, background:'var(--color-border)',
              }}/>
              <div style={{ display:'flex', flexDirection:'column', gap:4, alignSelf:'stretch', fontSize:11, color:'var(--color-muted-foreground)' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Last review</span>
                  <span style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)' }}>06 May 2026</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>Anchored</span>
                  <span style={{ color:'var(--color-success-700)', fontFamily:'var(--font-mono)' }}>0x9c2…ae1</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:24 }}>
          <Kpi value={leader.attendance + '%'} label="Lok Sabha attendance" sub={'avg ' + leader.attendanceAvg + '%'} tone="danger"/>
          <Kpi value={leader.questions} label="Questions raised" sub={'avg ' + leader.questionsAvg} tone="warning"/>
          <Kpi value={leader.debates} label="Debates participated"/>
          <Kpi value={'+' + leader.assetGrowth + '%'} label="Asset declaration growth" sub="vs first declaration" tone="danger"/>
        </div>

        {/* Promises + Complaint response */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:24 }}>
          <Card>
            <SectionHead
              icon={<I.Vote style={{width:16,height:16}}/>}
              title="Manifesto promises"
              subtitle={leader.promisesTotal + ' commitments tracked from manifesto, rallies, and on-record interviews.'}
              right={<Chip tone="warning" sm>{leader.promisesBroken} broken</Chip>}
            />
            <StackBar segments={promiseSegments} height={12}/>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10,
              marginTop:14, marginBottom:18,
            }}>
              {promiseSegments.map(s => (
                <div key={s.label} style={{
                  padding:'8px 10px', background:'var(--color-muted)',
                  border:'1px solid var(--color-border)', borderRadius:10,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:s.color }}/>
                    <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontWeight:500 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, marginTop:4, letterSpacing:'-0.02em' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {promises.slice(0,5).map(p => (
                <div key={p.id} style={{
                  display:'flex', gap:12, alignItems:'flex-start',
                  padding:'10px 12px', background:'var(--color-card)',
                  border:'1px solid var(--color-border)', borderRadius:10,
                }}>
                  <PromiseChip status={p.status}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, lineHeight:1.45, color:'var(--color-foreground)', fontWeight:500 }}>{p.text}</div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4, fontFamily:'var(--font-mono)' }}>
                      {p.source}
                    </div>
                    <div style={{ fontSize:12, color:'var(--color-gray-600)', marginTop:4, lineHeight:1.5 }}>
                      {p.evidence}
                    </div>
                  </div>
                </div>
              ))}
              <button style={{
                background:'transparent', border:'1px dashed var(--color-border)', borderRadius:10,
                padding:'9px', cursor:'pointer', fontFamily:'inherit',
                fontSize:12, color:'var(--color-brand-700)', fontWeight:600,
              }}>
                See all {leader.promisesTotal} promises →
              </button>
            </div>
          </Card>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card>
              <SectionHead
                icon={<I.Megaphone style={{width:16,height:16}}/>}
                title="Complaint response"
                subtitle="From citizens in this constituency."
                dense
              />
              <StackBar segments={responseSegments} height={10}/>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:14, fontSize:12 }}>
                {responseSegments.map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:s.color }}/>
                    <span style={{ flex:1, color:'var(--color-foreground)' }}>{s.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>{s.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop:14, padding:'10px 12px', background:'var(--color-danger-50)',
                border:'1px solid var(--color-danger-200)', borderRadius:10,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <I.Flash style={{width:14,height:14,color:'var(--color-danger-600)'}}/>
                  <span style={{ fontSize:11, color:'var(--color-danger-800)', fontWeight:600 }}>Median response</span>
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:'var(--color-danger-800)', marginTop:6, letterSpacing:'-0.02em' }}>
                  {leader.responseTimeDays} days
                </div>
                <div style={{ fontSize:11, color:'var(--color-danger-800)', marginTop:2 }}>
                  Statutory expectation: {leader.responseTimeAvg} days
                </div>
              </div>
            </Card>

            <Card>
              <SectionHead
                icon={<I.Calendar style={{width:16,height:16}}/>}
                title="Attendance"
                subtitle="Last 24 sessions"
                dense
              />
              <AttendanceGrid attended={leader.attended}/>
              <div style={{
                display:'flex', justifyContent:'space-between',
                fontSize:11, color:'var(--color-muted-foreground)',
                marginTop:10,
              }}>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--color-brand-500)',marginRight:6,verticalAlign:'middle'}}/>Attended {leader.attended.filter(Boolean).length}</span>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--color-gray-300)',marginRight:6,verticalAlign:'middle'}}/>Absent {leader.attended.filter(a=>!a).length}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Categories */}
        <Card>
          <SectionHead
            icon={<I.Filter style={{width:16,height:16}}/>}
            title={"Where citizens are complaining · " + leader.complaintsTotal.toLocaleString() + " in this term"}
            subtitle="Cross-checked with verified, anchored complaints. Excludes withdrawn or moderator-rejected."
          />
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {leader.categoryBreakdown.map(c => (
              <div key={c.cat} style={{ display:'grid', gridTemplateColumns:'180px 1fr 60px', gap:14, alignItems:'center' }}>
                <div style={{ fontSize:13, color:'var(--color-foreground)' }}>{c.cat}</div>
                <RowBar value={c.n} max={maxCat}/>
                <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', textAlign:'right' }}>{c.n}</div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

// ─── Variation B — Dashboard ────────────────────────────────────────
const ReportCardDashboard = ({ leader }) => {
  const promiseSegments = [
    { label:'Kept',       value:leader.promisesKept,    color:PROMISE_COLORS.kept },
    { label:'Partial',    value:leader.promisesPartial, color:PROMISE_COLORS.partial },
    { label:'Broken',     value:leader.promisesBroken,  color:PROMISE_COLORS.broken },
    { label:'Unverified', value:leader.promisesUnknown, color:PROMISE_COLORS.unknown },
  ];
  const maxCat = Math.max(...leader.categoryBreakdown.map(c=>c.n));

  // Generate plausible-looking sparkline series for the dashboard
  const series = {
    attendance: [0.7,0.6,0.5,0.55,0.4,0.45,0.42,0.38,0.36,0.40,0.42,0.38],
    response:   [0.30,0.34,0.38,0.42,0.46,0.50,0.54,0.58,0.55,0.60,0.62,0.66],
    asset:      [0.10,0.12,0.14,0.18,0.22,0.30,0.42,0.58,0.74,0.88,0.96,1.0],
  };

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Report cards</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{leader.constituency}</span>
      </>} right={
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            height:32, padding:'0 10px', background:'var(--color-muted)',
            border:'1px solid var(--color-border)', borderRadius:10, fontSize:12,
          }}>
            <I.Calendar style={{width:13,height:13, color:'var(--color-muted-foreground)'}}/>
            <span style={{ fontFamily:'var(--font-mono)' }}>{leader.term}</span>
          </div>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{width:13,height:13}}/>}>Export</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Identity strip — compact */}
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
          <GradeBadge grade={leader.grade} tone={leader.gradeTone}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <PartyBadge party={leader.party} color={leader.partyColor}/>
              <Chip tone="default" sm bordered>{leader.role}</Chip>
            </div>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.1 }}>{leader.name}</div>
            <div style={{ fontSize:13, color:'var(--color-muted-foreground)', marginTop:2 }}>
              {leader.constituency} · {leader.state}
            </div>
          </div>
          <div style={{
            padding:'12px 16px',
            background:'var(--color-card)',
            border:'1px solid var(--color-border)',
            borderRadius:12,
            display:'flex', flexDirection:'column', alignItems:'flex-end',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>SCORE</div>
            <div style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1, marginTop:2 }}>
              {leader.score}<span style={{ color:'var(--color-muted-foreground)', fontWeight:500, fontSize:14 }}>/100</span>
            </div>
          </div>
        </div>

        {/* 3-up: trend metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:14 }}>
          {[
            { label:'Lok Sabha attendance', value:leader.attendance + '%', sub:'12-mo trend', series:series.attendance, color:'var(--color-danger-500)', tone:'danger' },
            { label:'Median complaint response', value:leader.responseTimeDays + 'd', sub:'12-mo trend', series:series.response, color:'var(--color-warning-500)', tone:'warning' },
            { label:'Asset declaration growth', value:'+' + leader.assetGrowth + '%', sub:'cumulative', series:series.asset, color:'var(--color-danger-500)', tone:'danger' },
          ].map((m,i) => (
            <Card key={i} pad={18}>
              <Overline>{m.label}</Overline>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:10, gap:12 }}>
                <div>
                  <div style={{
                    fontSize:30, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1,
                    color: m.tone==='danger' ? 'var(--color-danger-700)' : 'var(--color-warning-700)',
                  }}>{m.value}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:6 }}>{m.sub}</div>
                </div>
                <Spark values={m.series} color={m.color}/>
              </div>
            </Card>
          ))}
        </div>

        {/* 2-up: Promises pie + Categories */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:14, marginBottom:14 }}>
          <Card pad={18}>
            <SectionHead
              icon={<I.Vote style={{width:16,height:16}}/>}
              title="Manifesto delivery"
              subtitle={leader.promisesTotal + ' tracked'}
              dense
            />
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {/* Donut */}
              <PromiseDonut segments={promiseSegments} size={140}/>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                {promiseSegments.map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:s.color }}/>
                    <span style={{ flex:1, fontSize:13 }}>{s.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--color-muted-foreground)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card pad={18}>
            <SectionHead
              icon={<I.Filter style={{width:16,height:16}}/>}
              title="Complaint mix"
              subtitle={leader.complaintsTotal.toLocaleString() + ' verified · this term'}
              dense
            />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {leader.categoryBreakdown.slice(0,6).map(c => (
                <div key={c.cat} style={{ display:'grid', gridTemplateColumns:'140px 1fr 44px', gap:12, alignItems:'center' }}>
                  <div style={{ fontSize:12, color:'var(--color-foreground)' }}>{c.cat}</div>
                  <RowBar value={c.n} max={maxCat} height={6}/>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', textAlign:'right' }}>{c.n}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Attendance + work stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }}>
          <Card pad={18}>
            <SectionHead
              icon={<I.Calendar style={{width:16,height:16}}/>}
              title="Session attendance"
              subtitle="Last 24 sessions · brand cells = attended"
              dense
            />
            <AttendanceGrid attended={leader.attended}/>
            <div style={{
              display:'flex', justifyContent:'space-between',
              fontSize:11, color:'var(--color-muted-foreground)',
              marginTop:10,
            }}>
              <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--color-brand-500)',marginRight:6,verticalAlign:'middle'}}/>Attended {leader.attended.filter(Boolean).length}/{leader.attended.length}</span>
              <span>Lok Sabha avg: {leader.attendanceAvg}%</span>
            </div>
          </Card>
          <Card pad={18}>
            <SectionHead
              icon={<I.FileText style={{width:16,height:16}}/>}
              title="Floor work"
              dense
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Kpi value={leader.questions} label="Questions raised" sub={'avg ' + leader.questionsAvg}/>
              <Kpi value={leader.debates} label="Debates"/>
              <Kpi value="2" label="Bills moved" sub="private members"/>
              <Kpi value="0" label="Committee chairs"/>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

// SVG donut for promise breakdown
const PromiseDonut = ({ segments, size=140 }) => {
  const total = segments.reduce((a,s)=>a+s.value, 0) || 1;
  const r = size/2 - 12;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-gray-100)" strokeWidth="16"/>
      {segments.map((s,i) => {
        const len = (s.value/total) * C;
        const dash = `${len} ${C}`;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth="16"
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        );
        offset += len;
        return el;
      })}
      <text x={size/2} y={size/2-4} textAnchor="middle"
        style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:22, letterSpacing:'-0.02em' }}>
        {Math.round((segments.find(s=>s.label==='Kept').value/total)*100)}%
      </text>
      <text x={size/2} y={size/2+12} textAnchor="middle"
        style={{ fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>
        KEPT
      </text>
    </svg>
  );
};

Object.assign(window, { ReportCardEditorial, ReportCardDashboard });
