// Factivist — Shareable Complaint Card (desktop)
// Portrait (540×960) + Landscape (1080×608) — generated from anchored
// complaint record. Counterpart to ShareableReportCard.

const ShareableComplaintPortrait = ({ c }) => {
  const sevColor = c.severity === 'Critical' ? 'oklch(0.62 0.22 27)'
                 : c.severity === 'High'     ? 'oklch(0.62 0.22 27)'
                 : c.severity === 'Medium'   ? 'oklch(0.78 0.16 75)'
                 :                              'oklch(0.65 0.18 145)';
  return (
    <div style={{
      width:540, height:960, position:'relative',
      background:'#1c1917', color:'oklch(0.96 0.003 250)',
      fontFamily:'var(--font-sans)', overflow:'hidden',
      borderRadius:24, boxShadow:'0 30px 60px -20px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 10% 0%, oklch(0.42 0.22 27 / 0.45) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, oklch(0.32 0.16 250 / 0.45) 0%, transparent 55%)',
        pointerEvents:'none',
      }}/>

      {/* Header */}
      <div style={{ position:'relative', padding:'28px 32px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
          <FvMark size={28}/>
          <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.02em' }}>Factivist</span>
        </div>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em', color:'oklch(0.75 0.01 270)', fontWeight:600 }}>
          ANCHORED COMPLAINT
        </span>
      </div>

      {/* Severity stripe */}
      <div style={{
        position:'relative', margin:'24px 32px 0',
        display:'inline-flex', alignItems:'center', gap:10,
        padding:'7px 14px', borderRadius:9999, background:sevColor, color:'#fff',
        fontFamily:'var(--font-mono)', fontSize:11, fontWeight:800, letterSpacing:'0.12em', alignSelf:'flex-start',
      }}>
        <I.Flash style={{ width:11, height:11 }}/>
        {c.severity.toUpperCase()} · {c.category.toUpperCase()}
      </div>

      {/* Title */}
      <div style={{ position:'relative', padding:'14px 32px 0' }}>
        <div style={{
          fontSize:34, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1,
          color:'#fff', textWrap:'balance',
        }}>{c.title}</div>
        <div style={{ marginTop:16, fontSize:13.5, lineHeight:1.65, color:'oklch(0.85 0.01 270)', textWrap:'pretty',
          display:'-webkit-box', WebkitLineClamp:5, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {c.body}
        </div>
      </div>

      {/* Endorsement banner */}
      <div style={{
        position:'relative', margin:'22px 32px 0',
        padding:'18px 22px', borderRadius:16,
        background:'oklch(0.22 0.005 270 / 0.7)', border:'1px solid oklch(0.32 0.005 270)',
        display:'flex', alignItems:'center', gap:16,
      }}>
        <div style={{
          width:78, height:78, borderRadius:18, flexShrink:0,
          background:'oklch(0.42 0.20 250 / 0.25)', color:'oklch(0.78 0.16 250)',
          display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        }}>
          <I.ArrowUp style={{ width:22, height:22 }}/>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, marginTop:2, letterSpacing:'0.04em' }}>ENDORSE</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span style={{ fontSize:38, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1 }}>{c.endorsements.toLocaleString()}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.78 0.01 270)' }}>/ 1,000 to CRITICAL</span>
          </div>
          <div style={{ marginTop:8, height:6, background:'oklch(0.30 0.005 270)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width: ((c.endorsements / c.endorsementsToCritical) * 100) + '%', height:'100%', background:'oklch(0.78 0.16 250)' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:8, fontSize:11, color:'oklch(0.78 0.01 270)' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <I.MessageSq style={{ width:11, height:11 }}/><span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{c.comments}</span>
            </span>
            <span>·</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
              <I.Paperclip style={{ width:11, height:11 }}/><span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{c.evidence.length}</span> evidence
            </span>
          </div>
        </div>
      </div>

      {/* Linked context */}
      <div style={{ position:'relative', margin:'14px 32px 0' }}>
        <div style={{
          padding:'12px 14px', borderRadius:12,
          background:'oklch(0.22 0.005 270 / 0.5)', border:'1px solid oklch(0.30 0.005 270)',
          display:'flex', alignItems:'center', gap:10, fontSize:11,
        }}>
          <I.Calendar style={{ width:14, height:14, color:'oklch(0.78 0.16 75)' }}/>
          <span style={{ flex:1, color:'oklch(0.85 0.01 270)' }}>
            Court matter <strong style={{ color:'#fff', fontFamily:'var(--font-mono)' }}>{c.judicial.id}</strong> filed at Bombay HC · next listing <strong style={{ color:'#fff' }}>{c.judicial.next}</strong>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:0,
        padding:'18px 32px', borderTop:'1px solid oklch(0.28 0.005 270)',
        background:'oklch(0.135 0.005 270)',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:14,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:64, height:64, borderRadius:10, background:'#fff', padding:6,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <QRBlock size={52}/>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em' }}>READ THE FULL RECORD</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fff', fontWeight:700, marginTop:2 }}>factivist.in/c/{c.id}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:5, fontSize:10, color:'oklch(0.78 0.16 145)' }}>
              <I.ShieldFill style={{ width:10, height:10 }}/>
              <span>Anchored · {c.anchor.tx}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'oklch(0.62 0.01 270)', letterSpacing:'0.08em' }}>BY</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fff', marginTop:2 }}>{c.submittedBy}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:3, fontSize:9, color:'oklch(0.78 0.16 145)' }}>
            <I.ShieldFill style={{ width:9, height:9 }}/>verified
          </div>
        </div>
      </div>
    </div>
  );
};

const ShareableComplaintLandscape = ({ c }) => {
  const sevColor = c.severity === 'Critical' ? 'oklch(0.62 0.22 27)' : 'oklch(0.78 0.16 75)';
  return (
    <div style={{
      width:1080, height:608, position:'relative',
      background:'#1c1917', color:'oklch(0.96 0.003 250)',
      fontFamily:'var(--font-sans)', overflow:'hidden',
      borderRadius:24, boxShadow:'0 30px 60px -20px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 0% 100%, oklch(0.42 0.22 27 / 0.45) 0%, transparent 55%), radial-gradient(ellipse at 100% 0%, oklch(0.32 0.16 250 / 0.4) 0%, transparent 55%)',
        pointerEvents:'none',
      }}/>
      <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.6fr 1fr', height:'100%' }}>
        {/* LEFT */}
        <div style={{ padding:'40px 44px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
              <FvMark size={32}/>
              <span style={{ fontWeight:800, fontSize:22, letterSpacing:'-0.02em' }}>Factivist</span>
            </div>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.75 0.01 270)', letterSpacing:'0.12em', fontWeight:700 }}>
              ANCHORED COMPLAINT · #{c.id}
            </span>
          </div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px',
            background:sevColor, color:'#fff', borderRadius:9999, alignSelf:'flex-start',
            fontFamily:'var(--font-mono)', fontSize:11, fontWeight:800, letterSpacing:'0.10em',
          }}>
            <I.Flash style={{ width:11, height:11 }}/>
            {c.severity.toUpperCase()} · {c.category.toUpperCase()}
          </div>
          <div style={{ fontSize:38, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.05, textWrap:'balance' }}>{c.title}</div>
          <div style={{ fontSize:14, lineHeight:1.65, color:'oklch(0.85 0.01 270)', textWrap:'pretty',
            display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {c.body}
          </div>
          <div style={{ marginTop:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:72, height:72, borderRadius:12, background:'#fff', padding:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <QRBlock size={56}/>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em' }}>FULL RECORD</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, marginTop:3 }}>factivist.in/c/{c.id}</div>
            </div>
            <div style={{ marginLeft:'auto', textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.62 0.01 270)', letterSpacing:'0.06em' }}>ANCHORED</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, marginTop:3, color:'oklch(0.85 0.14 145)' }}>{c.anchor.tx}</div>
            </div>
          </div>
        </div>
        {/* RIGHT */}
        <div style={{
          padding:'40px 36px', borderLeft:'1px solid oklch(0.28 0.005 270)',
          background:'oklch(0.13 0.005 270 / 0.55)',
          display:'flex', flexDirection:'column', justifyContent:'center', gap:18,
        }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.75 0.01 270)', letterSpacing:'0.08em' }}>ENDORSED BY</div>
            <div style={{ fontSize:64, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1, marginTop:4 }}>{c.endorsements.toLocaleString()}</div>
            <div style={{ fontSize:13, color:'oklch(0.78 0.01 270)', marginTop:4 }}>verified citizens · {Math.round((c.endorsements / c.endorsementsToCritical) * 100)}% to Critical</div>
          </div>
          <div style={{ height:7, background:'oklch(0.28 0.005 270)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width: ((c.endorsements / c.endorsementsToCritical) * 100) + '%', height:'100%', background:'oklch(0.78 0.16 250)' }}/>
          </div>
          <div style={{ display:'flex', gap:18, fontSize:12, color:'oklch(0.85 0.01 270)' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <I.MessageSq style={{ width:14, height:14 }}/><span style={{ fontFamily:'var(--font-mono)', color:'#fff', fontWeight:600 }}>{c.comments}</span>
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <I.Paperclip style={{ width:14, height:14 }}/><span style={{ fontFamily:'var(--font-mono)', color:'#fff', fontWeight:600 }}>{c.evidence.length}</span>
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <I.MapPin style={{ width:14, height:14 }}/><span style={{ fontFamily:'var(--font-mono)', color:'#fff' }}>{c.constituency}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShareableComplaintArtboard = () => {
  const c = window.fvDataExtra.complaintDetail;
  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Share</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Complaint card</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>#{c.id}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Copy link</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export PNG</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px', display:'flex', flexDirection:'column', gap:28 }}>
        <div>
          <Overline>Shareable complaint card</Overline>
          <h1 style={{ margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.025em' }}>One image. Every receipt.</h1>
          <p style={{ margin:'10px 0 0', maxWidth:680, fontSize:13.5, color:'var(--color-muted-foreground)', lineHeight:1.65 }}>
            The complaint, sized for WhatsApp / Instagram (540×960) and Twitter / OG (1080×608). QR back to the live anchored record; severity stripe and endorsement counter front and centre.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:36, alignItems:'flex-start' }}>
          <div>
            <Overline style={{ marginBottom:12 }}>Portrait · WhatsApp / story</Overline>
            <ShareableComplaintPortrait c={c}/>
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <Btn variant="bordered" tone="default" size="sm">WhatsApp</Btn>
              <Btn variant="bordered" tone="default" size="sm">Instagram</Btn>
              <Btn variant="ghost" size="sm">Download</Btn>
            </div>
          </div>
          <div>
            <Overline style={{ marginBottom:12 }}>Landscape · Twitter / OG</Overline>
            <ShareableComplaintLandscape c={c}/>
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <Btn variant="bordered" tone="default" size="sm">Twitter / X</Btn>
              <Btn variant="bordered" tone="default" size="sm">LinkedIn</Btn>
              <Btn variant="ghost" size="sm">Download</Btn>
            </div>
            <div style={{ marginTop:24, padding:'18px 20px', borderRadius:14, background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <I.ShieldFill style={{ width:14, height:14, color:'var(--color-brand-600)' }}/>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--color-brand-900)' }}>Tamper-evident by design</span>
              </div>
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:5, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.6 }}>
                <li>· Card is regenerated from the on-chain record. No local editing of metrics.</li>
                <li>· QR carries a one-time anti-spoof seal — anyone can verify the source.</li>
                <li>· Card includes the linked court case if one exists.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ShareableComplaintPortrait, ShareableComplaintLandscape, ShareableComplaintArtboard });
