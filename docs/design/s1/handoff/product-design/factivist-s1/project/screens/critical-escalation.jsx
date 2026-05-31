// Factivist — Critical Issue escalation moment
// The serious-but-cathartic transition state when a complaint crosses the
// 1,000-endorsement threshold. Used both as a full takeover screen and as
// a feed-overlay banner.

const VelocityLine = ({ values, width = 480, height = 110, color = 'oklch(0.78 0.18 27)' }) => {
  const max = Math.max(...values);
  const innerW = width - 24, innerH = height - 24;
  const xs = values.map((_, i) => 12 + (i / (values.length - 1)) * innerW);
  const ys = values.map(v => 12 + innerH - (v / max) * innerH);
  const path = xs.map((x, i) => (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + ys[i].toFixed(1)).join(' ');
  const area = path + ` L ${xs[xs.length - 1]},${height - 6} L ${xs[0]},${height - 6} Z`;
  return (
    <svg width={width} height={height} style={{ display:'block' }}>
      <defs>
        <linearGradient id="vel-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* horizontal gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, k) => (
        <line key={k} x1={12} x2={width - 12} y1={12 + innerH * t} y2={12 + innerH * t}
          stroke="oklch(0.30 0.005 270)" strokeWidth="0.5" strokeDasharray={k===4 ? '0' : '2 3'}/>
      ))}
      <path d={area} fill="url(#vel-grad)"/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4 : 2.5}
          fill={i === xs.length - 1 ? '#fff' : color} stroke={color} strokeWidth={i === xs.length - 1 ? 2 : 0}/>
      ))}
    </svg>
  );
};

// Big animated ring filling to 100%
const CriticalRing = ({ size = 240, value = 1000, max = 1000, color = 'oklch(0.78 0.18 27)' }) => {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const filled = Math.min(1, value / max);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.28 0.005 270)" strokeWidth="14"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${filled * c} ${c}`} transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2 - 4} textAnchor="middle" style={{
        fontFamily:'var(--font-sans)', fontSize:48, fontWeight:800, letterSpacing:'-0.04em', fill:'#fff',
      }}>{value.toLocaleString()}</text>
      <text x={size/2} y={size/2 + 20} textAnchor="middle" style={{
        fontFamily:'var(--font-mono)', fontSize:10, fill:'oklch(0.78 0.01 270)', letterSpacing:'0.08em',
      }}>{max.toLocaleString()} · CRITICAL THRESHOLD</text>
    </svg>
  );
};

const CriticalEscalation = () => {
  const c = window.fvDataExtra.criticalMoment;
  // Critical Issue is an intentional dark takeover regardless of theme,
  // so background / chrome colors are hardcoded oklch rather than tokens
  // (gray scale inverts on `body.fv-dark` and would make the page white).
  return (
    <div style={{
      background:'oklch(0.135 0.005 270)', minHeight:'100%',
      color:'oklch(0.96 0.003 250)',
    }}>
      <div style={{
        position:'sticky', top:0, zIndex:5,
        padding:'12px 24px', borderBottom:'1px solid oklch(0.28 0.005 270)',
        background:'oklch(0.135 0.005 270 / 0.92)',
        backdropFilter:'saturate(180%) blur(8px)',
        display:'flex', alignItems:'center', gap:14, fontSize:13,
      }}>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid oklch(0.30 0.005 270)',
          background:'transparent', cursor:'pointer',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          color:'inherit',
        }}>
          <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
            <I.ChevronR style={{ width:14, height:14 }}/>
          </span>
        </button>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, fontFamily:'var(--font-mono)', color:'oklch(0.78 0.01 270)' }}>
          <span>Feed</span>
          <I.ChevronR style={{ width:11, height:11, color:'oklch(0.55 0.01 270)' }}/>
          <span style={{ color:'#fff', fontWeight:600 }}>#{c.id}</span>
          <I.ChevronR style={{ width:11, height:11, color:'oklch(0.55 0.01 270)' }}/>
          <span style={{ color:'oklch(0.78 0.18 27)', fontWeight:700 }}>CRITICAL ISSUE</span>
        </div>
        <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share the moment</Btn>
      </div>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'40px 24px 80px' }}>
        {/* Hero */}
        <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:36, alignItems:'center', marginBottom:36 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <span style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'6px 14px', borderRadius:9999,
                background:'oklch(0.62 0.22 27)', color:'#fff',
                fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:'0.12em',
              }}>
                <I.Flash style={{ width:12, height:12 }}/>
                CRITICAL ISSUE · ANCHORED
              </span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.62 0.01 270)' }}>just now · 2 minutes ago</span>
            </div>
            <h1 style={{
              margin:0, fontSize:46, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.05,
              textWrap:'balance', color:'#fff',
            }}>
              1,000 verified citizens<br/>
              <span style={{ color:'oklch(0.78 0.18 27)' }}>just refused to look away.</span>
            </h1>
            <p style={{
              margin:'18px 0 0', maxWidth:560, fontSize:16, lineHeight:1.65,
              color:'oklch(0.82 0.01 270)', textWrap:'pretty',
            }}>
              {c.title} crossed the Critical Issue threshold at <strong style={{ color:'#fff' }}>2:14 AM IST</strong>. It is now pinned to the Mumbai South MP's report card, routed to the Maharashtra state feed, and visible to journalists with API access.
            </p>
          </div>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <CriticalRing value={c.endorsements} max={c.threshold} size={300}/>
          </div>
        </div>

        {/* The complaint capsule */}
        <div style={{
          padding:'22px 24px', borderRadius:18, marginBottom:36,
          background:'oklch(0.18 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.005 270)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:5, height:22, padding:'0 9px',
              background:'oklch(0.62 0.22 27)', color:'#fff', borderRadius:9999,
              fontSize:11, fontWeight:700,
            }}>{c.severity}</span>
            <Chip tone="default" sm bordered>{c.category}</Chip>
            <Chip tone="default" sm bordered>{c.constituency}</Chip>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.62 0.01 270)' }}>#{c.id} · filed {c.filedOn}</span>
          </div>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.25, color:'#fff' }}>{c.title}</div>
          <p style={{ margin:'10px 0 0', fontSize:14, lineHeight:1.65, color:'oklch(0.82 0.01 270)', maxWidth:760, textWrap:'pretty' }}>{c.body}</p>
          <div style={{ display:'flex', alignItems:'center', gap:18, marginTop:14, fontSize:12, color:'oklch(0.78 0.01 270)' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <I.MessageSq style={{ width:13, height:13 }}/>
              <span style={{ fontFamily:'var(--font-mono)', color:'#fff', fontWeight:600 }}>{c.comments}</span>
              comments
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <I.Paperclip style={{ width:13, height:13 }}/>
              <span style={{ fontFamily:'var(--font-mono)', color:'#fff', fontWeight:600 }}>{c.evidence}</span>
              evidence files
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <Avatar handle={c.by} size={20}/>
              <span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{c.by}</span>
            </span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:24, marginBottom:32 }}>
          {/* Velocity */}
          <div style={{
            padding:'22px 24px', borderRadius:18,
            background:'oklch(0.18 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.005 270)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.78 0.01 270)', letterSpacing:'0.08em' }}>ENDORSEMENT VELOCITY · LAST 12 HOURS</div>
                <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginTop:4, color:'#fff' }}>From 12 to 264 / hour</div>
              </div>
              <span style={{
                padding:'5px 10px', borderRadius:9999,
                background:'oklch(0.62 0.22 27)', color:'#fff',
                fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
              }}>22× ACCELERATION</span>
            </div>
            <VelocityLine values={c.velocity} width={520} height={140}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.62 0.01 270)' }}>
              <span>14:00</span><span>18:00</span><span>22:00</span><span>NOW · 2:14</span>
            </div>
          </div>

          {/* Recent endorsers */}
          <div style={{
            padding:'22px 24px', borderRadius:18,
            background:'oklch(0.18 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.005 270)',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.78 0.01 270)', letterSpacing:'0.08em', marginBottom:6 }}>WHO PUSHED IT OVER</div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.015em', color:'#fff', marginBottom:14 }}>
              The 1,000th endorsement was anchored by <span style={{ color:'oklch(0.78 0.18 27)', fontFamily:'var(--font-mono)' }}>{c.recentEndorsers[0]}</span>.
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
              {c.recentEndorsers.map((h, i) => (
                <div key={h} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Avatar handle={h} size={26}/>
                  {i === 0 && (
                    <span style={{
                      fontFamily:'var(--font-mono)', fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      color:'oklch(0.78 0.18 27)',
                    }}>1000TH</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{
              padding:'10px 12px', borderRadius:10,
              background:'oklch(0.22 0.005 270 / 0.8)', border:'1px solid oklch(0.30 0.005 270)',
              fontFamily:'var(--font-mono)', fontSize:10.5, lineHeight:1.7, color:'oklch(0.82 0.01 270)',
            }}>
              <div style={{ color:'oklch(0.78 0.16 145)', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>ANCHOR · CRITICAL STATE</div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'oklch(0.62 0.01 270)' }}>tx</span><span style={{ color:'#fff' }}>0x4ae9…f2c3</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'oklch(0.62 0.01 270)' }}>block</span><span style={{ color:'#fff' }}>71,184,612</span></div>
            </div>
          </div>
        </div>

        {/* Unlocked cascade */}
        <div>
          <div style={{ marginBottom:14 }}>
            <Overline style={{ color:'oklch(0.78 0.01 270)' }}>What changes at Critical</Overline>
            <h2 style={{ margin:'6px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.02em', color:'#fff' }}>
              Five cascades, anchored together.
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 }}>
            {c.unlocked.map((u, i) => (
              <div key={u.id} style={{
                padding:'16px 16px', borderRadius:14,
                background:'oklch(0.18 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.005 270)',
                display:'flex', flexDirection:'column', gap:10,
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10,
                  background:'oklch(0.42 0.20 27 / 0.25)', color:'oklch(0.78 0.18 27)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13 }}>{String(i+1).padStart(2,'0')}</span>
                </div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#fff', lineHeight:1.3 }}>{u.label}</div>
                  <div style={{ fontSize:11.5, color:'oklch(0.78 0.01 270)', marginTop:5, lineHeight:1.55 }}>{u.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop:36, padding:'24px 28px', borderRadius:18,
          background:'oklch(0.42 0.22 27 / 0.18)', border:'1px solid oklch(0.55 0.22 27 / 0.45)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:24, flexWrap:'wrap',
        }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.015em', color:'#fff' }}>Carry the receipt out of this room.</div>
            <div style={{ fontSize:13, color:'oklch(0.82 0.01 270)', marginTop:5 }}>One image, one QR, one anchored record — primed for WhatsApp and Twitter.</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="solid" tone="primary" size="md" icon={<I.Link style={{ width:14, height:14 }}/>}>Share critical card</Btn>
            <Btn variant="bordered" tone="default" size="md" icon={<I.FileText style={{ width:14, height:14 }}/>}>Press pack PDF</Btn>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { CriticalEscalation, CriticalRing, VelocityLine });
