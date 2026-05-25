// Factivist — Mobile companions for Shareable card, Shame Index, and
// Critical Issue escalation.

// ─── Mobile · Shareable Report Card preview + share sheet ───────────
// Frames the WhatsApp-shaped portrait card with a share sheet beneath it.
const MobileShareCard = () => {
  const L = window.fvDataExtra.leaders[0];
  return (
    <MPhonePage>
      <MTopBar title="Share report card" sub={L.constituency} right={
        <Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>
      }/>
      <div style={{
        flex:1, overflow:'auto', padding:'14px 14px 110px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
        background:'var(--color-muted)',
      }}>
        {/* Scaled-down portrait card */}
        <div style={{ transform:'scale(0.58)', transformOrigin:'top center', height:560 }}>
          <ShareableCardPortrait leader={L}/>
        </div>
        <Card pad={14} style={{ width:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <I.Sparkles style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
            <span style={{ fontSize:12.5, fontWeight:700 }}>This card is auto-built from the anchor</span>
          </div>
          <p style={{ margin:0, fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
            Every metric on the card resolves to the live record. QR carries a one-time anti-spoof seal.
          </p>
        </Card>
      </div>
      {/* Share sheet */}
      <div style={{
        position:'sticky', bottom:0,
        padding:'14px 14px 18px', background:'var(--color-card)',
        borderTop:'1px solid var(--color-border)',
        borderRadius:'18px 18px 0 0',
      }}>
        <div style={{ width:34, height:4, borderRadius:99, background:'var(--color-gray-300)', margin:'-4px auto 12px' }}/>
        <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Share to</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { I:'Link', l:'WhatsApp' },
            { I:'Link', l:'Twitter' },
            { I:'Link', l:'Instagram' },
            { I:'Link', l:'Telegram' },
            { I:'Link', l:'Email' },
            { I:'FileText', l:'Download PNG' },
            { I:'FileText', l:'Copy link' },
            { I:'FileText', l:'Press pack' },
          ].map((s, i) => {
            const IconC = I[s.I] || I.Link;
            return (
              <button key={i} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                padding:'9px 4px', borderRadius:11,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                cursor:'pointer', fontFamily:'inherit',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:9,
                  background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><IconC style={{ width:15, height:15 }}/></div>
                <span style={{ fontSize:10, fontWeight:600, color:'var(--color-foreground)' }}>{s.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Shame Index ──────────────────────────────────────────
const MobileShameIndex = () => {
  const shame = window.fvDataExtra.shameIndex;
  const sectors = window.fvDataExtra.shameSectors;
  return (
    <MPhonePage>
      <MTopBar title="Shame Index" sub="May 2026 · top 10"
        right={<Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 60px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Hero card */}
        <div style={{
          padding:'18px 18px', borderRadius:16,
          background:'var(--color-gray-950)', color:'var(--color-gray-50)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse at 20% 0%, oklch(0.42 0.22 27 / 0.5) 0%, transparent 65%)',
            pointerEvents:'none',
          }}/>
          <div style={{ position:'relative' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'oklch(0.78 0.16 27)', letterSpacing:'0.12em', fontWeight:700 }}>CONSTITUENCY SHAME INDEX</div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.05, marginTop:8 }}>
              The 10 their citizens<br/>are failing in.
            </div>
            <p style={{ margin:'10px 0 0', fontSize:11.5, color:'oklch(0.82 0.01 270)', lineHeight:1.55 }}>
              Ranked across attendance, manifesto delivery, complaint resolution, and citizen score. Built on 1.42L anchored complaints.
            </p>
          </div>
        </div>

        {/* Sector strip */}
        <div>
          <Overline>Where failures cluster</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
            {sectors.map((s, i) => (
              <div key={s.label} style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 36px', gap:8, alignItems:'center' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11.5, fontWeight:500 }}>{s.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{s.pct}%</span>
                  </div>
                  <RowBar value={s.pct} max={40} height={4}
                    color={['var(--color-danger-500)','var(--color-warning-500)','var(--color-brand-500)','oklch(0.55 0.16 145)','oklch(0.55 0.18 35)','oklch(0.55 0.14 170)'][i]}/>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', textAlign:'right' }}>{(s.count/1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked list */}
        <div>
          <Overline>Ranked · most failing first</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:5 }}>
            {shame.slice(0, 8).map((r, i) => (
              <button key={r.ac} style={{
                width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                padding:'10px 11px', borderRadius:11,
                background: i === 0 ? 'var(--color-danger-50)' : 'var(--color-card)',
                border:'1px solid ' + (i === 0 ? 'var(--color-danger-200)' : 'var(--color-border)'),
                display:'flex', alignItems:'center', gap:10,
              }}>
                <span style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  background: i < 3 ? 'var(--color-danger-500)' : 'var(--color-muted)',
                  color: i < 3 ? '#fff' : 'var(--color-muted-foreground)',
                  border:'1px solid ' + (i < 3 ? 'var(--color-danger-500)' : 'var(--color-border)'),
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-sans)', fontSize:14, fontWeight:800, letterSpacing:'-0.02em',
                }}>{String(r.rank).padStart(2,'0')}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.01em' }}>{r.ac}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)' }}>· {r.state}</span>
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:2 }}>{r.mp}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700,
                    color: r.score < 40 ? 'var(--color-danger-700)' : 'var(--color-warning-700)',
                    lineHeight:1,
                  }}>{r.score}</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', marginTop:3 }}>{r.complaints} cmpl</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Critical Issue escalation ────────────────────────────
const MobileCriticalEscalation = () => {
  const c = window.fvDataExtra.criticalMoment;
  return (
    <MPhonePage dark>
      <div style={{
        padding:'14px 16px 12px', borderBottom:'1px solid oklch(0.28 0.005 270)',
        background:'oklch(0.135 0.005 270)',
        display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:5,
        color:'#fff',
      }}>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid oklch(0.30 0.005 270)',
          background:'transparent', cursor:'pointer', color:'inherit',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
            <I.ChevronR style={{ width:14, height:14 }}/>
          </span>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.78 0.18 27)', letterSpacing:'0.08em', fontWeight:700 }}>CRITICAL ISSUE</div>
          <div style={{ fontSize:13, fontWeight:700, marginTop:1 }}>#{c.id}</div>
        </div>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid oklch(0.30 0.005 270)',
          background:'transparent', cursor:'pointer', color:'inherit',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.Link style={{ width:13, height:13 }}/></button>
      </div>

      <div style={{
        flex:1, overflow:'auto', padding:'18px 16px 100px',
        background:'var(--color-gray-950)', color:'#fff',
        display:'flex', flexDirection:'column', gap:18,
      }}>
        {/* Pill */}
        <div style={{
          alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:7,
          padding:'5px 12px', borderRadius:9999,
          background:'oklch(0.62 0.22 27)', color:'#fff',
          fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, letterSpacing:'0.12em',
        }}>
          <I.Flash style={{ width:11, height:11 }}/>
          CRITICAL · ANCHORED
        </div>

        <h1 style={{ margin:0, fontSize:28, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
          1,000 verified citizens<br/>
          <span style={{ color:'oklch(0.78 0.18 27)' }}>just refused to look away.</span>
        </h1>

        <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
          <CriticalRing value={c.endorsements} max={c.threshold} size={200}/>
        </div>

        <div style={{
          padding:'14px 16px', borderRadius:14,
          background:'oklch(0.18 0.005 270 / 0.7)', border:'1px solid oklch(0.30 0.005 270)',
        }}>
          <div style={{ display:'flex', gap:5, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
            <span style={{
              display:'inline-flex', alignItems:'center', height:20, padding:'0 8px',
              background:'oklch(0.62 0.22 27)', color:'#fff', borderRadius:9999,
              fontSize:10, fontWeight:700,
            }}>{c.severity}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'oklch(0.62 0.01 270)' }}>{c.category}</span>
          </div>
          <div style={{ fontSize:15, fontWeight:700, lineHeight:1.3, letterSpacing:'-0.01em' }}>{c.title}</div>
          <p style={{ margin:'8px 0 0', fontSize:11.5, color:'oklch(0.82 0.01 270)', lineHeight:1.6 }}>{c.body}</p>
        </div>

        {/* Velocity mini chart */}
        <div style={{
          padding:'14px 16px', borderRadius:14,
          background:'oklch(0.18 0.005 270 / 0.7)', border:'1px solid oklch(0.30 0.005 270)',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'oklch(0.78 0.01 270)', letterSpacing:'0.06em' }}>VELOCITY · 12H</div>
            <span style={{
              padding:'3px 8px', borderRadius:9999,
              background:'oklch(0.62 0.22 27)', color:'#fff',
              fontFamily:'var(--font-mono)', fontSize:9, fontWeight:700,
            }}>22×</span>
          </div>
          <VelocityLine values={c.velocity} width={300} height={86}/>
        </div>

        {/* Cascades */}
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.78 0.01 270)', letterSpacing:'0.06em', marginBottom:10 }}>
            WHAT CHANGES AT CRITICAL
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {c.unlocked.map((u, i) => (
              <div key={u.id} style={{
                padding:'10px 12px', borderRadius:11,
                background:'oklch(0.18 0.005 270 / 0.7)', border:'1px solid oklch(0.30 0.005 270)',
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <span style={{
                  width:26, height:26, borderRadius:7, flexShrink:0,
                  background:'oklch(0.42 0.20 27 / 0.25)', color:'oklch(0.78 0.18 27)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-mono)', fontWeight:700, fontSize:11,
                }}>{String(i+1).padStart(2,'0')}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{u.label}</div>
                  <div style={{ fontSize:10.5, color:'oklch(0.78 0.01 270)', marginTop:3, lineHeight:1.5 }}>{u.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky share footer */}
      <div style={{
        position:'sticky', bottom:0, padding:'12px 14px 16px',
        background:'oklch(0.135 0.005 270)', borderTop:'1px solid oklch(0.28 0.005 270)',
        display:'flex', gap:6,
      }}>
        <button style={{
          flex:1, padding:'12px', borderRadius:11, border:0, cursor:'pointer', fontFamily:'inherit',
          background:'oklch(0.62 0.22 27)', color:'#fff',
          fontSize:13, fontWeight:700,
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <I.Link style={{ width:13, height:13 }}/> Share the moment
        </button>
        <button style={{
          padding:'12px 16px', borderRadius:11, border:'1px solid oklch(0.30 0.005 270)', cursor:'pointer', fontFamily:'inherit',
          background:'transparent', color:'#fff', fontSize:13, fontWeight:700,
        }}>Press pack</button>
      </div>
    </MPhonePage>
  );
};

Object.assign(window, { MobileShareCard, MobileShameIndex, MobileCriticalEscalation });
