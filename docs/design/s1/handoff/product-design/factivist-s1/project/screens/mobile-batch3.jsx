// Factivist — Mobile companions for the new batch:
//   MobileModerationAppeal · MobileUndertrial · MobileMediaCapture
// 360-wide phone surfaces; sticky top bar; scrolling body.
// Reuses MTopBar / MPhonePage from mobile-extras.jsx.

// ─── Mobile · AI Moderation appeal (citizen-facing) ───────────────────
const MobileModerationAppeal = () => {
  const a = window.fvBatch3.appeal;
  return (
    <MPhonePage>
      <MTopBar title="Complaint held" sub={`#${a.complaintId} · awaiting human review`}
        right={<Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 28px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Notice */}
        <div style={{
          padding:'14px 14px', borderRadius:14,
          background:'var(--color-warning-50)', border:'1px solid var(--color-warning-200)',
        }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--color-warning-900)', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.06em', fontWeight:700 }}>
            <I.Flash style={{ width:11, height:11 }}/>HELD · LLAMA GUARD 3
          </div>
          <div style={{ marginTop:8, fontSize:17, fontWeight:800, letterSpacing:'-0.015em', lineHeight:1.2 }}>
            Your complaint is awaiting human review.
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>
            Filed at <strong>{a.rejectedAt}</strong>. You can fix the flagged spans and resubmit, or appeal to a moderator. We never share your handle with the accused.
          </div>
        </div>

        {/* Reasons */}
        <Card pad={14}>
          <Overline>Why it was flagged</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {a.reasons.map((r, i) => (
              <div key={i} style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-danger-500)' }}/>
                  <span style={{ fontSize:12, fontWeight:700 }}>{r.cat}</span>
                  <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{r.model} · {r.score.toFixed(2)}</span>
                </div>
                <div style={{ marginTop:4, fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.5 }}>
                  Span <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'0 5px', borderRadius:5, fontFamily:'var(--font-mono)', fontSize:11 }}>{r.span}</span> reads as community-targeted language. Swap it for neutral civic vocabulary to clear the filter.
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Original + suggested edit */}
        <Card pad={14}>
          <Overline>Your wording, flagged</Overline>
          <div style={{
            marginTop:8, padding:'10px 12px', borderRadius:10,
            background:'var(--color-card)', border:'1px solid var(--color-border)',
            fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.55,
          }}>
            These <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'0 5px', borderRadius:5 }}>[slur]</span> politicians from <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'0 5px', borderRadius:5 }}>[community]</span> are destroying [city] — they refused my FIR for the third time this month at Powai station and laughed.
          </div>

          <Overline style={{ marginTop:14 }}>Suggested edit</Overline>
          <div style={{
            marginTop:8, padding:'10px 12px', borderRadius:10,
            background:'var(--color-success-50)', border:'1px solid var(--color-success-200)',
            fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.55,
          }}>
            Officials at <strong>Powai police station</strong> refused my FIR for the third time this month and laughed when I asked for the refusal in writing.
            <div style={{ marginTop:6, fontSize:10.5, color:'var(--color-success-800)', fontFamily:'var(--font-mono)' }}>auto-edit · keeps every verifiable fact</div>
          </div>
        </Card>

        {/* Note to moderator */}
        <Card pad={14}>
          <Overline>Stand by your wording? Write to the moderator</Overline>
          <textarea placeholder="e.g. 'This phrase is a direct quote captured in the attached audio.'" style={{
            marginTop:8, width:'100%', minHeight:84, padding:'10px 12px',
            borderRadius:10, border:'1px solid var(--color-border)',
            background:'var(--color-card)', color:'var(--color-foreground)',
            fontFamily:'inherit', fontSize:12.5, lineHeight:1.5, resize:'vertical', outline:'none',
          }}/>
        </Card>

        {/* What appeal does not do */}
        <Card pad={14} accent>
          <Overline>Appeal does not</Overline>
          <ul style={{ margin:'8px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
            {[
              'Reveal your handle to the accused',
              'Auto-override the filter · a human reads it',
              'Reset the 30-day cooldown if rejected again',
            ].map((s, i) => (
              <li key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11.5, lineHeight:1.5 }}>
                <I.X style={{ width:10, height:10, color:'var(--color-brand-700)', marginTop:3, flexShrink:0 }}/>{s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Sticky action bar */}
      <div style={{
        position:'sticky', bottom:0,
        padding:'10px 12px 14px', background:'var(--color-card)',
        borderTop:'1px solid var(--color-border)',
        display:'flex', flexDirection:'column', gap:8,
      }}>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.Check style={{ width:14, height:14 }}/>}>
          Apply suggested edit & resubmit
        </Btn>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="bordered" tone="default" size="md" icon={<I.MessageSq style={{ width:13, height:13 }}/>}>Appeal</Btn>
          <Btn variant="ghost" size="md">Withdraw</Btn>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Under-trial tracker ─────────────────────────────────────
const MobileUndertrial = () => {
  const u = window.fvBatch3.undertrial;
  const A = window.fvBatch3.undertrialAgg;
  const overPct = Math.round((u.daysHeld / u.statutoryLimitDays) * 100);
  return (
    <MPhonePage>
      <MTopBar title="Under-trial tracker" sub={u.id}
        right={<Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 110px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Hero */}
        <div style={{
          padding:'14px 14px', borderRadius:14,
          background:'linear-gradient(140deg, var(--color-danger-50), var(--color-card) 70%)',
          border:'1px solid var(--color-danger-200)',
        }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--color-danger-800)', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.06em', fontWeight:700 }}>
            <I.Flash style={{ width:11, height:11 }}/>{u.daysHeld} DAYS · {overPct}% OVER §436A
          </div>
          <div style={{ marginTop:8, fontSize:20, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.15, textWrap:'balance' }}>
            Held without conviction since {u.arrestedOn}.
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'var(--color-foreground)', lineHeight:1.5, textWrap:'pretty' }}>
            §436A CrPC benchmark for these sections is <strong>{u.statutoryLimitDays} days</strong>. The count is at <strong>{u.daysHeld}</strong>.
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ position:'relative', height:14, borderRadius:99, background:'var(--color-gray-200)', overflow:'hidden' }}>
              <div style={{ width: Math.min(100, (u.statutoryLimitDays / u.daysHeld) * 100) + '%', height:'100%', background:'var(--color-warning-500)' }}/>
              <div style={{ position:'absolute', left: Math.min(100, (u.statutoryLimitDays / u.daysHeld) * 100) + '%', right:0, top:0, bottom:0, background:'var(--color-danger-500)' }}/>
            </div>
            <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>
              <span>0d</span><span>{u.statutoryLimitDays}d limit</span><span>{u.daysHeld}d</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { l:'Bail rejections', v: u.bailHistory.filter(b => b.kind === 'Rejected').length, sub:'Sessions · HC · SC' },
            { l:'Adjournments',    v: u.adjournments, sub: u.hearingsHeld + ' actually held' },
            { l:'Watching',        v: u.flaggedBy, sub:'verified citizens' },
            { l:'In state',        v: u.statePeers.thisCaseRank, sub:'by duration' },
          ].map((k, i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:12, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>{k.l.toUpperCase()}</div>
              <div style={{ marginTop:4, fontSize:20, fontWeight:800, letterSpacing:'-0.02em' }}>{k.v}</div>
              <div style={{ marginTop:2, fontSize:10.5, color:'var(--color-muted-foreground)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Charges */}
        <Card pad={14}>
          <Overline>Charges of record</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {u.charges.map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11.5, fontWeight:700 }}>{c.code}</div>
                <div style={{ flex:1, fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.4 }}>{c.label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11.5, fontWeight:700 }}>{c.maxPunishYears}y</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bail history (compact) */}
        <Card pad={14}>
          <Overline>Bail attempts</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:10 }}>
            {u.bailHistory.slice(0,6).map((b, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ minWidth:60, fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)', textAlign:'right', paddingTop:2 }}>{b.at}</span>
                <span style={{ width:9, height:9, borderRadius:'50%', marginTop:5, flexShrink:0, background: UT_BAIL_TONE[b.tone] || UT_BAIL_TONE.default }}/>
                <div style={{ minWidth:0, flex:1 }}>
                  <Chip tone={b.kind === 'Rejected' ? 'danger' : b.kind === 'Withdrawn' ? 'warning' : 'default'} sm bordered>{b.kind}</Chip>
                  <div style={{ marginTop:4, fontSize:11.5, fontWeight:600 }}>{b.outcome}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', textAlign:'center' }}>+ {u.bailHistory.length - 6} more</div>
          </div>
        </Card>

        {/* Aggregate */}
        <Card pad={14} accent>
          <Overline>Under-trial · in numbers</Overline>
          <div style={{ marginTop:8, fontSize:32, fontWeight:800, letterSpacing:'-0.03em', color:'var(--color-brand-700)', lineHeight:1 }}>
            {A.headline.toLocaleString()}
          </div>
          <div style={{ marginTop:6, fontSize:11.5, lineHeight:1.5 }}>
            citizens held without conviction across India · <strong>{A.pctOfPrisoners}%</strong> of all prisoners.
          </div>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'Over 5 years', pct: A.pctOver5Years },
              { label:'SC · ST · OBC · Muslim', pct: A.pctSCSTOBCMuslim },
            ].map((r, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:3 }}>
                  <span>{r.label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{r.pct}%</span>
                </div>
                <RowBar value={r.pct} max={100} color="var(--color-brand-500)" height={6}/>
              </div>
            ))}
          </div>
        </Card>

        {/* Similar */}
        <Card pad={14}>
          <Overline>Similar long-held cases</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {u.similar.slice(0,3).map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)' }}>{s.id}</div>
                  <div style={{ fontSize:12, fontWeight:600, lineHeight:1.35 }}>{s.label}</div>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:800, color:'var(--color-danger-700)' }}>{s.daysHeld}d</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position:'sticky', bottom:0,
        padding:'10px 12px 14px', background:'var(--color-card)',
        borderTop:'1px solid var(--color-border)',
        display:'flex', gap:8,
      }}>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.FileText style={{ width:14, height:14 }}/>}>
          File a §436A petition
        </Btn>
        <Btn variant="bordered" tone="default" size="md" icon={<I.Link style={{ width:13, height:13 }}/>}/>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Media capture ──────────────────────────────────────────
const MobileMediaCapture = () => {
  const c = window.fvBatch3.capture;
  const [mode, setMode] = React.useState('audio');
  const [rec, setRec] = React.useState(true);
  return (
    <MPhonePage>
      <MTopBar title="Capture evidence" sub="Step 3 of 4 · on-device"
        right={<Btn variant="ghost" size="sm" icon={<I.Lock style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 110px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Mode segmented */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, padding:3, background:'var(--color-muted)', borderRadius:12, border:'1px solid var(--color-border)' }}>
          {['audio','video','photo'].map(m => {
            const IconC = m === 'audio' ? I.Mic : I.Image;
            return (
              <button key={m} onClick={() => setMode(m)} style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'10px 6px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                background: mode === m ? 'var(--color-card)' : 'transparent',
                border: mode === m ? '1px solid var(--color-border)' : '1px solid transparent',
                fontWeight: mode === m ? 700 : 500, fontSize:12,
                color: mode === m ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              }}>
                <IconC style={{ width:13, height:13 }}/>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            );
          })}
        </div>

        {mode === 'audio' && (
          <Card pad={14}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Overline>Audio</Overline>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:9999, background: rec ? 'var(--color-danger-500)' : 'var(--color-gray-200)', color: rec ? '#fff' : 'var(--color-gray-700)', fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700 }}>
                {rec && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
                {rec ? 'REC · ' + c.audioSession.duration : 'IDLE'}
              </span>
            </div>
            <div style={{
              marginTop:10, padding:'14px 14px', borderRadius:12,
              background:'linear-gradient(160deg, var(--color-brand-50), var(--color-card))',
              border:'1px solid var(--color-brand-200)',
            }}>
              <CaptureWaveform values={c.audioWaveform} height={72} recording={rec}/>
              <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>
                <span>00:00</span><span>01:00</span><span style={{ color: rec ? 'var(--color-danger-700)' : 'inherit', fontWeight:700 }}>● {c.audioSession.duration}</span>
              </div>
            </div>
            <button onClick={() => setRec(v => !v)} style={{
              marginTop:14, width:'100%', height:48, borderRadius:9999, border:0, cursor:'pointer',
              background: rec ? 'var(--color-danger-500)' : 'var(--color-foreground)',
              color: rec ? '#fff' : 'var(--color-background)',
              fontFamily:'inherit', fontWeight:700, fontSize:13,
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {rec
                ? <><span style={{ width:11, height:11, borderRadius:2, background:'#fff' }}/>Stop & save</>
                : <><span style={{ width:11, height:11, borderRadius:'50%', background:'var(--color-danger-500)' }}/>Start recording</>
              }
            </button>
            <Overline style={{ marginTop:14 }}>Live transcript · {c.audioSession.lang}</Overline>
            <div style={{ marginTop:8, padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)', fontSize:11.5, lineHeight:1.55 }}>
              {c.audioSession.transcript}
              <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--color-border)', display:'flex', flexWrap:'wrap', gap:5 }}>
                {c.audioSession.stripped.map(s => <StripPill key={s}>stripped · {s}</StripPill>)}
              </div>
            </div>
          </Card>
        )}

        {mode === 'video' && (
          <Card pad={14}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Overline>Video</Overline>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:9999, background: rec ? 'var(--color-danger-500)' : 'var(--color-gray-200)', color: rec ? '#fff' : 'var(--color-gray-700)', fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700 }}>
                {rec && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
                {rec ? 'REC · ' + c.videoSession.duration : 'READY'}
              </span>
            </div>
            <div style={{
              marginTop:10, position:'relative', borderRadius:12, overflow:'hidden',
              background:'linear-gradient(160deg, #0a0a0a, #1a1a1a)', aspectRatio:'9/16',
              maxHeight:380,
            }}>
              <svg width="100%" height="100%" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <filter id="mc-blur"><feGaussianBlur stdDeviation="7"/></filter>
                </defs>
                <rect width="360" height="380" fill="#1c2430"/>
                <rect y="380" width="360" height="260" fill="#0d1116"/>
                {[40,120,200,280].map((x, i) => <rect key={i} x={x-30} y={200 + (i%2)*15} width={60} height={180} fill="#070a10" opacity={0.85}/>)}
                <g transform="translate(150, 440)">
                  <rect x="-14" y="0" width="28" height="68" fill="#3b3b3b"/>
                  <g filter="url(#mc-blur)"><circle cx="0" cy="-10" r="12" fill="#7a6a55"/></g>
                </g>
                <text x="150" y="416" textAnchor="middle" fill="#fff" style={{ fontSize:10, fontFamily:'var(--font-mono)' }}>FACE · BLURRED</text>
              </svg>
              <div style={{ position:'absolute', top:10, left:10, padding:'3px 8px', borderRadius:6, background:'rgba(0,0,0,0.55)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:9.5 }}>GPS · OFF</div>
              <button onClick={() => setRec(v => !v)} style={{
                position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
                width:54, height:54, borderRadius:'50%', cursor:'pointer', border:'4px solid #fff',
                background: rec ? 'var(--color-danger-500)' : 'transparent',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                {rec
                  ? <span style={{ width:15, height:15, borderRadius:3, background:'#fff' }}/>
                  : <span style={{ width:32, height:32, borderRadius:'50%', background:'var(--color-danger-500)' }}/>
                }
              </button>
            </div>
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5 }}>
              {c.videoSession.stripped.map(s => <StripPill key={s}>stripped · {s}</StripPill>)}
              {c.videoSession.blurred.map(s => <StripPill key={s} ok={false}>blurring · {s}</StripPill>)}
            </div>
          </Card>
        )}

        {mode === 'photo' && (
          <Card pad={14}>
            <Overline>Photo</Overline>
            <div style={{
              marginTop:10, position:'relative', borderRadius:12, overflow:'hidden',
              background:'linear-gradient(160deg, #1a1a1a, #0a0a0a)', aspectRatio:'4/3',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <I.Image style={{ width:38, height:38, color:'rgba(255,255,255,0.25)' }}/>
              <button style={{
                position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
                width:52, height:52, borderRadius:'50%', cursor:'pointer', border:'4px solid #fff',
                background:'#fff',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ width:40, height:40, borderRadius:'50%', border:'2px solid #1a1a1a' }}/>
              </button>
            </div>
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5 }}>
              <StripPill>stripped · GPS</StripPill>
              <StripPill>stripped · EXIF</StripPill>
              <StripPill>stripped · serial</StripPill>
              <StripPill ok={false}>blurring · 3 faces</StripPill>
            </div>
          </Card>
        )}

        {/* What we strip · always */}
        <Card pad={14} accent>
          <Overline>What we strip · always</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {[
              'GPS lat / lon',
              'EXIF camera serial',
              'Voice biometric vector',
              'Device ID',
              'Faces & vehicle plates',
            ].map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                <span style={{ width:18, height:18, borderRadius:6, background:'var(--color-brand-100)', color:'var(--color-brand-700)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <I.X style={{ width:9, height:9 }}/>
                </span>
                {s}
              </div>
            ))}
          </div>
        </Card>

        {/* Pending list */}
        <Card pad={14}>
          <Overline>This session · {c.pending.length} files</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {c.pending.map(p => {
              const IconC = p.kind === 'audio' ? I.Mic : I.Image;
              return (
                <div key={p.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:'var(--color-brand-50)', color:'var(--color-brand-700)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <IconC style={{ width:13, height:13 }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</div>
                    <div style={{ marginTop:2, fontSize:10, color:'var(--color-muted-foreground)' }}>{p.len} · {p.mb} MB · {p.stripping ? 'stripping…' : 'cleaned'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position:'sticky', bottom:0,
        padding:'10px 12px 14px', background:'var(--color-card)',
        borderTop:'1px solid var(--color-border)',
        display:'flex', gap:8,
      }}>
        <Btn variant="bordered" tone="default" size="md" fullWidth>Cancel</Btn>
        <Btn variant="solid" tone="primary" size="md" fullWidth iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}>
          Save & continue
        </Btn>
      </div>
    </MPhonePage>
  );
};

Object.assign(window, { MobileModerationAppeal, MobileUndertrial, MobileMediaCapture });
