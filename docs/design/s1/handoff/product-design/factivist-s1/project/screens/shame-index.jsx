// Factivist — Constituency Shame Index
// Public-facing national leaderboard of the worst-performing constituencies.
// Editorial tone, dark base, designed to be screenshotted and circulated.

const RankCell = ({ rank }) => {
  const isTop3 = rank <= 3;
  return (
    <div style={{
      width:48, height:48, borderRadius:12, flexShrink:0,
      background: isTop3 ? 'var(--color-danger-500)' : 'var(--color-card)',
      color: isTop3 ? '#fff' : 'var(--color-muted-foreground)',
      border:'1.5px solid ' + (isTop3 ? 'var(--color-danger-500)' : 'var(--color-border)'),
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-sans)', fontSize:22, fontWeight:800, letterSpacing:'-0.03em',
    }}>{String(rank).padStart(2,'0')}</div>
  );
};

const DeltaBadge = ({ delta }) => {
  const tone = delta < 0 ? 'danger' : delta > 0 ? 'success' : 'default';
  const sym = delta < 0 ? '▼' : delta > 0 ? '▲' : '·';
  const styles = {
    danger:  { bg:'var(--color-danger-100)',  fg:'var(--color-danger-800)' },
    success: { bg:'var(--color-success-100)', fg:'var(--color-success-800)' },
    default: { bg:'var(--color-gray-200)',    fg:'var(--color-gray-800)' },
  }[tone];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 8px', borderRadius:9999,
      background:styles.bg, color:styles.fg,
      fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)',
    }}>
      <span style={{ fontSize:8 }}>{sym}</span>
      {Math.abs(delta)}
    </span>
  );
};

const ShameIndex = () => {
  const shame = window.fvDataExtra.shameIndex;
  const honour = window.fvDataExtra.honourIndex;
  const sectors = window.fvDataExtra.shameSectors;
  const [mode, setMode] = React.useState('shame'); // 'shame' | 'honour'

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Discover</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Constituency Shame Index</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export CSV</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Hero — bold editorial */}
        <div style={{
          padding:'36px 36px', borderRadius:24,
          background:'var(--color-gray-950)', color:'var(--color-gray-50)',
          position:'relative', overflow:'hidden', marginBottom:24,
        }}>
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse at 20% 0%, oklch(0.42 0.22 27 / 0.45) 0%, transparent 60%)',
            pointerEvents:'none',
          }}/>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:36, alignItems:'flex-end' }}>
            <div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.12em', color:'oklch(0.78 0.16 27)', fontWeight:700 }}>
                CONSTITUENCY SHAME INDEX · MAY 2026
              </span>
              <h1 style={{ margin:'12px 0 0', fontSize:54, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.02, textWrap:'balance', color:'#fff' }}>
                The 10 constituencies<br/>their citizens are failing in.
              </h1>
              <p style={{ margin:'18px 0 0', maxWidth:540, fontSize:16, lineHeight:1.6, color:'oklch(0.82 0.01 270)', textWrap:'pretty' }}>
                Ranked across attendance, manifesto delivery, complaint resolution rate, and citizen score. Built on 1.42 lakh anchored complaints across India.
              </p>
            </div>
            <div style={{
              padding:'16px 18px', borderRadius:14,
              background:'oklch(0.20 0.005 270 / 0.6)',
              border:'1px solid oklch(0.30 0.006 270)',
            }}>
              <Overline style={{ color:'oklch(0.78 0.01 270)' }}>How we rank</Overline>
              <ul style={{ margin:'8px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:5, fontSize:12, color:'oklch(0.88 0.005 270)', lineHeight:1.55 }}>
                {[
                  ['40%', 'Citizen score · weighted scorecard'],
                  ['25%', 'Promise delivery vs manifesto'],
                  ['20%', 'Complaint resolution rate'],
                  ['15%', 'Floor attendance & RTI response'],
                ].map(([w,l]) => (
                  <li key={l} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ width:38, fontFamily:'var(--font-mono)', color:'oklch(0.78 0.16 27)', fontWeight:700 }}>{w}</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Toggle + sector strip */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginBottom:18, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:4, background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:9999, padding:3 }}>
            <button onClick={()=>setMode('shame')} style={{
              padding:'7px 14px', borderRadius:9999, border:0, cursor:'pointer', fontFamily:'inherit',
              background: mode === 'shame' ? 'var(--color-danger-500)' : 'transparent',
              color: mode === 'shame' ? '#fff' : 'var(--color-foreground)',
              fontSize:12.5, fontWeight:700,
              display:'inline-flex', alignItems:'center', gap:6,
            }}>
              <I.Flash style={{ width:12, height:12 }}/>Shame Index
            </button>
            <button onClick={()=>setMode('honour')} style={{
              padding:'7px 14px', borderRadius:9999, border:0, cursor:'pointer', fontFamily:'inherit',
              background: mode === 'honour' ? 'var(--color-success-500)' : 'transparent',
              color: mode === 'honour' ? '#fff' : 'var(--color-foreground)',
              fontSize:12.5, fontWeight:700,
              display:'inline-flex', alignItems:'center', gap:6,
            }}>
              <I.ShieldFill style={{ width:12, height:12 }}/>Honour Index
            </button>
          </div>

          {/* Sector mix */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em', marginRight:6 }}>NATIONAL MIX</span>
            <div style={{ display:'flex', height:8, borderRadius:99, overflow:'hidden', width:260, border:'1px solid var(--color-border)' }}>
              {sectors.map((s, i) => (
                <div key={s.label} title={s.label} style={{
                  width: s.pct + '%',
                  background: ['var(--color-danger-500)','var(--color-warning-500)','var(--color-brand-500)','oklch(0.55 0.16 145)','oklch(0.55 0.18 35)','oklch(0.55 0.14 170)'][i],
                }}/>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.6fr) 1fr', gap:20 }}>
          {/* MAIN RANK TABLE */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(mode === 'shame' ? shame : honour).map((r, i) => {
              const tone = mode === 'shame' ? 'danger' : 'success';
              return (
                <div key={r.ac} style={{
                  padding:'14px 16px', borderRadius:14,
                  background: i === 0 ? (mode === 'shame' ? 'var(--color-danger-50)' : 'var(--color-success-50)') : 'var(--color-card)',
                  border:'1px solid ' + (i === 0 ? (mode === 'shame' ? 'var(--color-danger-200)' : 'var(--color-success-200)') : 'var(--color-border)'),
                  display:'grid', gridTemplateColumns:'auto minmax(0,1.6fr) 1fr 1fr 1fr 1fr auto', alignItems:'center', gap:16,
                }}>
                  <RankCell rank={r.rank}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.015em', lineHeight:1.2, color:'var(--color-foreground)' }}>{r.ac}</div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontFamily:'var(--font-mono)' }}>{r.state}</span>
                      <span>·</span>
                      <span>MP {r.mp}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>GRADE</div>
                    <div style={{ marginTop:3 }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        width:36, height:24, borderRadius:6,
                        background: r.grade.startsWith('A') ? 'var(--color-success-100)'
                          : r.grade.startsWith('B') ? 'var(--color-brand-100)'
                          : r.grade.startsWith('C') ? 'var(--color-warning-100)'
                          : 'var(--color-danger-100)',
                        color: r.grade.startsWith('A') ? 'var(--color-success-800)'
                          : r.grade.startsWith('B') ? 'var(--color-brand-800)'
                          : r.grade.startsWith('C') ? 'var(--color-warning-900)'
                          : 'var(--color-danger-800)',
                        fontWeight:700, fontSize:12,
                      }}>{r.grade}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>SCORE</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:700, marginTop:3,
                      color: tone === 'danger' ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>{r.score}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>COMPLAINTS</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, marginTop:3 }}>{r.complaints}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>RESOLVED</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                      <div style={{ width:32, height:5, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width: r.resolved + '%', height:'100%',
                          background: r.resolved > 40 ? 'var(--color-success-500)' : 'var(--color-warning-500)' }}/>
                      </div>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{r.resolved}%</span>
                    </div>
                  </div>
                  {mode === 'shame' && r.delta != null && <DeltaBadge delta={r.delta}/>}
                  {mode === 'honour' && <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>}>Card</Btn>}
                </div>
              );
            })}
          </div>

          {/* Right rail */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card pad={20}>
              <SectionHead
                icon={<I.Flash style={{ width:16, height:16 }}/>}
                title="Where the failures cluster"
                subtitle="Top categories in bottom-10 constituencies"
                dense
              />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {sectors.map((s, i) => (
                  <div key={s.label} style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 60px', gap:10, alignItems:'center' }}>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--color-foreground)', fontWeight:500 }}>{s.label}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{s.pct}%</span>
                      </div>
                      <RowBar value={s.pct} max={40} height={5}
                        color={['var(--color-danger-500)','var(--color-warning-500)','var(--color-brand-500)','oklch(0.55 0.16 145)','oklch(0.55 0.18 35)','oklch(0.55 0.14 170)'][i]}/>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', textAlign:'right' }}>{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card pad={20}>
              <SectionHead
                icon={<I.Link style={{ width:16, height:16 }}/>}
                title="Share the index"
                subtitle="One image. One link. Receipts attached."
                dense
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                <Btn variant="bordered" tone="default" size="sm" icon={<I.Link style={{ width:12, height:12 }}/>}>Twitter / X</Btn>
                <Btn variant="bordered" tone="default" size="sm">WhatsApp</Btn>
                <Btn variant="bordered" tone="default" size="sm">Instagram</Btn>
                <Btn variant="bordered" tone="default" size="sm">Email</Btn>
              </div>
              <div style={{
                marginTop:12, padding:'10px 12px', borderRadius:10,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                fontFamily:'var(--font-mono)', fontSize:11,
              }}>
                <div style={{ color:'var(--color-muted-foreground)', fontSize:9, letterSpacing:'0.06em', marginBottom:3 }}>SHORT LINK</div>
                <div style={{ color:'var(--color-foreground)', fontWeight:600 }}>factivist.in/shame-may-2026</div>
              </div>
            </Card>

            <Card pad={20} accent>
              <SectionHead
                icon={<I.FileText style={{ width:16, height:16 }}/>}
                title="Methodology"
                dense
              />
              <p style={{ margin:0, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.65 }}>
                Ranks computed weekly from anchored complaints, manifesto-vs-delivery audits, eCourts filings, RTI tracking, and Lok Sabha attendance. Constituencies are eligible after 100+ verified complaints in the term. Full formula is open-source. <span style={{ fontWeight:600, textDecoration:'underline', cursor:'pointer' }}>Read the rubric →</span>
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ShameIndex });
