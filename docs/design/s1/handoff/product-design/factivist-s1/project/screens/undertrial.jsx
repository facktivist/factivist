// Factivist — Under-trial prisoner tracker (desktop)
// One detained citizen's record, surfaced as a civic-accountability case.
// Sticky header with days-held vs statutory limit. Body: charges, bail
// history, hearings, legal aid. Sidebar: state-wide aggregate, similar
// long-held cases, related complaints, share kit.

const UT_BAIL_TONE = {
  default:'var(--color-gray-400)',
  warning:'var(--color-warning-500)',
  danger: 'var(--color-danger-500)',
  success:'var(--color-success-500)',
};

// Big days-held vs statutory-limit bar
const UTHeadlineBar = ({ held, limit }) => {
  const ratio = held / limit;
  const fill = Math.min(1, ratio);
  const over = Math.max(0, ratio - 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ position:'relative', height:18, borderRadius:99, background:'var(--color-gray-200)', overflow:'hidden' }}>
        <div style={{ width: (fill*100) + '%', height:'100%',
          background: ratio >= 1 ? 'var(--color-danger-500)' : 'var(--color-warning-500)' }}/>
        {/* statutory limit marker */}
        <div style={{ position:'absolute', left: Math.min(100, (limit/Math.max(held, limit))*100) + '%', top:-4, bottom:-4, width:2, background:'var(--color-foreground)' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
        <span>0 days</span>
        <span>statutory limit · {limit} days (§436A CrPC half-of-max benchmark)</span>
        <span>{held} days held · {ratio >= 1 ? '+' + Math.round((ratio - 1) * 100) + '% over limit' : Math.round(ratio*100) + '% of limit'}</span>
      </div>
    </div>
  );
};

const UTKpi = ({ label, value, sub, tone='default' }) => {
  const c = { default:'var(--color-foreground)', danger:'var(--color-danger-600)', warning:'var(--color-warning-700)', success:'var(--color-success-700)' }[tone];
  return (
    <div style={{
      padding:'16px 18px', borderRadius:14,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
    }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.08em' }}>{label.toUpperCase()}</div>
      <div style={{ marginTop:6, fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1, color:c }}>{value}</div>
      {sub && <div style={{ marginTop:6, fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
};

const UndertrialTracker = () => {
  const u = window.fvBatch3.undertrial;
  const A = window.fvBatch3.undertrialAgg;
  return (
    <div>
      <MiniHeader trail={<>
        <span>Judicial</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Under-trial tracker</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>{u.id}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}>Watch · {u.flaggedBy}</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share case</Btn>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>File a §436A petition</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Hero */}
        <div style={{
          padding:'22px 24px', borderRadius:18, marginBottom:18,
          background:'linear-gradient(140deg, var(--color-danger-50), var(--color-card) 70%)',
          border:'1px solid var(--color-danger-200)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, color:'var(--color-danger-800)', fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', fontWeight:700 }}>
            <I.Flash style={{ width:13, height:13 }}/>
            UNDER-TRIAL · {u.daysHeld} DAYS · {Math.round((u.daysHeld / u.statutoryLimitDays) * 100)}% OVER §436A BENCHMARK
          </div>
          <h1 style={{ margin:'2px 0 8px', fontSize:36, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance', maxWidth:880 }}>
            Held without conviction since <span style={{ color:'var(--color-danger-700)' }}>14 Aug 2022</span>.
          </h1>
          <p style={{ margin:0, fontSize:14.5, lineHeight:1.65, color:'var(--color-foreground)', maxWidth:880, textWrap:'pretty' }}>
            A verified citizen, identifying details withheld per platform policy. Charged under IPC 153A, 295A and UAPA §13 — combined statutory maximum of 7 years. <strong>Under §436A CrPC the under-trial may not be held longer than half of that</strong> without conviction; the count is at <strong>{u.daysHeld} days</strong>, against a <strong>{u.statutoryLimitDays}-day</strong> benchmark.
          </p>
          <div style={{ marginTop:18 }}>
            <UTHeadlineBar held={u.daysHeld} limit={u.statutoryLimitDays}/>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:18 }}>
          <UTKpi label="Days held"        value={u.daysHeld.toLocaleString()} sub={'since ' + u.arrestedOn}      tone="danger"/>
          <UTKpi label="Bail rejections"  value={u.bailHistory.filter(b => b.kind === 'Rejected').length}        sub="across Sessions · HC · SC" tone="danger"/>
          <UTKpi label="Adjournments"     value={u.adjournments}            sub={u.hearingsHeld + ' hearings actually held'} tone="warning"/>
          <UTKpi label="In state"         value={u.statePeers.thisCaseRank} sub={'Maharashtra · ' + u.statePeers.total.toLocaleString() + ' under-trials'}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18, alignItems:'flex-start' }}>
          {/* LEFT */}
          <div style={{ display:'flex', flexDirection:'column', gap:18, minWidth:0 }}>
            {/* Charges */}
            <Card>
              <SectionHead icon={<I.FileText style={{ width:15, height:15 }}/>}
                title="Charges of record" subtitle="As listed in the chargesheet, anchored from the eCourts mirror." dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {u.charges.map((c, i) => (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'140px 1fr 140px', gap:12, alignItems:'center',
                    padding:'12px 14px', background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:12,
                  }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:'var(--color-foreground)' }}>{c.code}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:2 }}>statutory section</div>
                    </div>
                    <div style={{ fontSize:13, color:'var(--color-foreground)', lineHeight:1.5 }}>{c.label}</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>max punishment</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700 }}>{c.maxPunishYears} yrs</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:6, padding:'10px 14px', borderRadius:10, background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)', display:'flex', alignItems:'center', gap:10 }}>
                  <I.Sparkles style={{ width:13, height:13, color:'var(--color-brand-700)' }}/>
                  <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>
                    Combined max <strong>{u.charges.reduce((a,c) => a + c.maxPunishYears, 0)} years</strong>. <span style={{ fontFamily:'var(--font-mono)' }}>§436A</span> benchmark is half of that — <strong>{u.statutoryLimitDays} days</strong>. The under-trial has been held <strong>{Math.round((u.daysHeld / u.statutoryLimitDays) * 10) / 10}× longer</strong>.
                  </div>
                </div>
              </div>
            </Card>

            {/* Bail history */}
            <Card>
              <SectionHead icon={<I.Judge style={{ width:15, height:15 }}/>}
                title="Bail attempts · all rejections, all benches"
                subtitle={u.bailHistory.length + ' filings across ' + (new Set(u.bailHistory.map(b => b.outcome.split(' · ')[0])).size) + ' courts'} dense/>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:0 }}>
                {u.bailHistory.map((b, i) => (
                  <React.Fragment key={i}>
                    <div style={{
                      padding:'12px 12px 12px 0', textAlign:'right',
                      borderRight:'1px solid var(--color-border)',
                      fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--color-muted-foreground)',
                    }}>{b.at}</div>
                    <div style={{
                      padding:'12px 0 12px 16px', position:'relative',
                    }}>
                      <span style={{
                        position:'absolute', left:-5, top:18, width:9, height:9, borderRadius:'50%',
                        background: UT_BAIL_TONE[b.tone] || UT_BAIL_TONE.default,
                        border:'2px solid var(--color-background)',
                      }}/>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <Chip tone={b.kind === 'Rejected' ? 'danger' : b.kind === 'Withdrawn' ? 'warning' : 'default'} sm bordered>{b.kind}</Chip>
                        <span style={{ fontSize:12.5, fontWeight:600 }}>{b.outcome}</span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </Card>

            {/* Hearings + legal aid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Card>
                <SectionHead icon={<I.Calendar style={{ width:15, height:15 }}/>}
                  title="Hearings vs adjournments" subtitle="At the listing court" dense/>
                <div style={{ marginTop:6 }}>
                  <StackBar height={14} segments={[
                    { label:'Held',         value:u.hearingsHeld, color:'var(--color-success-500)' },
                    { label:'Adjourned',    value:u.adjournments, color:'var(--color-danger-500)' },
                  ]}/>
                  <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:11.5, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>
                    <span>{u.hearingsHeld} held</span>
                    <span>{u.adjournments} adjourned</span>
                  </div>
                  <div style={{ marginTop:12, padding:'10px 12px', background:'var(--color-muted)', borderRadius:10, fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.55 }}>
                    Next listing <strong style={{ fontFamily:'var(--font-mono)' }}>{u.nextListing}</strong> · <span style={{ fontFamily:'var(--font-mono)' }}>{u.courtCaseId}</span> · {u.bench} · before <strong>{u.judge}</strong>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHead icon={<I.ShieldFill style={{ width:15, height:15 }}/>}
                  title="Legal aid" subtitle="Assigned counsel · last visit" dense/>
                <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{u.legalAid.counsel}</div>
                  <div style={{ marginTop:6, fontSize:11.5, color:'var(--color-muted-foreground)' }}>
                    Assigned <strong style={{ color:'var(--color-foreground)' }}>{u.legalAid.assigned}</strong> · last in-person visit <strong style={{ color:'var(--color-foreground)' }}>{u.legalAid.lastVisit}</strong>
                  </div>
                  <div style={{ marginTop:10, display:'flex', gap:8 }}>
                    <Btn variant="bordered" tone="default" size="sm" icon={<I.Mic style={{ width:13, height:13 }}/>}>Add observed-visit log</Btn>
                    <Btn variant="ghost" size="sm" icon={<I.Plus style={{ width:13, height:13 }}/>}>Pro-bono offer</Btn>
                  </div>
                </div>
              </Card>
            </div>

            {/* Related civic record */}
            <Card>
              <SectionHead icon={<I.MessageSq style={{ width:15, height:15 }}/>}
                title={'Civic record · ' + u.relatedComplaints + ' complaints reference this case'}
                subtitle="Anchored complaints that name this case or the same bench. The accused never sees who filed."
                dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { id: 4612, title: 'Bombay HC court 12 · pattern of 3-month adjournments in UAPA cases', votes: 421, when: '2 weeks ago' },
                  { id: 4302, title: 'Arthur Road Jail · families denied legal-aid visits for sub-judice cases', votes: 188, when: '1 month ago' },
                  { id: 3902, title: 'CrPC §436A petitions ignored for under-trials with multiple-section charges', votes: 142, when: '2 months ago' },
                ].map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600 }}>{c.title}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--color-foreground)', display:'inline-flex', alignItems:'center', gap:5 }}>
                      <I.ArrowUp style={{ width:11, height:11 }}/>{c.votes}
                    </span>
                    <span style={{ fontSize:11.5, color:'var(--color-muted-foreground)' }}>{c.when}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Aggregate counters */}
            <Card accent>
              <Overline>Under-trial · in numbers</Overline>
              <div style={{ marginTop:12, fontSize:46, fontWeight:800, letterSpacing:'-0.03em', color:'var(--color-brand-700)', lineHeight:1 }}>
                {A.headline.toLocaleString()}
              </div>
              <div style={{ marginTop:6, fontSize:12, color:'var(--color-foreground)', lineHeight:1.5 }}>
                citizens held without conviction across India · <strong>{A.pctOfPrisoners}%</strong> of all prisoners.
              </div>
              <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Over 5 years',           pct: A.pctOver5Years,    note: '53,000+ citizens'   },
                  { label:'SC · ST · OBC · Muslim', pct: A.pctSCSTOBCMuslim, note: 'against 67% of population' },
                ].map((r, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ fontWeight:600 }}>{r.label}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{r.pct}%</span>
                    </div>
                    <RowBar value={r.pct} max={100} color="var(--color-brand-500)" height={8}/>
                    <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:4 }}>{r.note}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--color-brand-200)', display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                <span style={{ color:'var(--color-muted-foreground)' }}>States watched</span>
                <span style={{ fontWeight:700, fontFamily:'var(--font-mono)' }}>{A.statesWatched}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginTop:6 }}>
                <span style={{ color:'var(--color-muted-foreground)' }}>Cases tracked</span>
                <span style={{ fontWeight:700, fontFamily:'var(--font-mono)' }}>{A.casesTracked.toLocaleString()}</span>
              </div>
            </Card>

            {/* Similar long-held cases */}
            <Card>
              <SectionHead icon={<I.Ranking style={{ width:15, height:15 }}/>}
                title="Similar long-held cases" subtitle="By statutory section, ranked by days held" dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {u.similar.map(s => (
                  <button key={s.id} style={{
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    padding:'10px 12px', borderRadius:10,
                    background:'var(--color-muted)', border:'1px solid var(--color-border)',
                    display:'flex', alignItems:'center', gap:10,
                  }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{s.id}</div>
                      <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.4, marginTop:2 }}>{s.label}</div>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:800, color:'var(--color-danger-700)' }}>{s.daysHeld.toLocaleString()}d</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Share kit */}
            <Card>
              <SectionHead icon={<I.Link style={{ width:15, height:15 }}/>}
                title="Carry this case out" subtitle="The receipt is anchored — share it." dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { i:'FileText', t:'Press pack PDF · 4 pages' },
                  { i:'Link',     t:'WhatsApp card · portrait' },
                  { i:'Link',     t:'Twitter card · landscape' },
                  { i:'FileText', t:'CSV of all bail filings' },
                ].map((r, i) => {
                  const IconC = I[r.i];
                  return (
                    <button key={i} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'9px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                      background:'transparent', border:'1px solid var(--color-border)', textAlign:'left',
                    }}>
                      <IconC style={{ width:13, height:13, color:'var(--color-brand-700)' }}/>
                      <span style={{ flex:1, fontSize:12.5 }}>{r.t}</span>
                      <I.ChevronR style={{ width:12, height:12, color:'var(--color-muted-foreground)' }}/>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { UndertrialTracker });
