// Factivist — Mobile ZKP onboarding flow (multi-step)
// Step 0: Intro / promise
// Step 1: Scan Aadhaar QR (camera)
// Step 2: Generate proof (ZKP progress)
// Step 3: Pick constituency
// Step 4: Done — citizen handle
//
// Clickable hot path: tap "Continue" to advance.
// State is local; the outer canvas can render all 5 steps in a row.

const { useState: oUseState } = React;

const FvMark = ({ size=32 }) => (
  <div style={{ position:'relative', width:size, height:size, borderRadius: Math.round(size*0.22), background:'var(--color-brand-500)', overflow:'hidden', flexShrink:0 }}>
    <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-sans)', fontWeight:900, fontStyle:'italic', fontSize: Math.round(size*0.78), lineHeight:1, color:'#fff', letterSpacing:'-0.04em', transform:'translateY(-1px) translateX(-1px)', userSelect:'none' }}>F</span>
    <span style={{ position:'absolute', right: Math.max(2.5, size*0.13), bottom: Math.max(2.5, size*0.13), width: Math.max(2.5, size*0.14), height: Math.max(2.5, size*0.14), borderRadius:'50%', background:'#fff' }}/>
  </div>
);

const StepDots = ({ step, total=5 }) => (
  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
    {Array.from({length:total}, (_,i) => (
      <span key={i} style={{
        width: i===step ? 22 : 7, height:7, borderRadius:99,
        background: i===step ? 'var(--color-brand-500)' : i<step ? 'var(--color-brand-300)' : 'var(--color-gray-300)',
        transition:'all 0.25s var(--ease-emphasized)',
      }}/>
    ))}
  </div>
);

// Card frame matching mobile content padding
const StepFrame = ({ children, footer }) => (
  <div style={{ background:'var(--color-background)', minHeight:'100%', display:'flex', flexDirection:'column' }}>
    <div style={{ padding:'24px 20px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <FvMark size={28}/>
      <button style={{
        padding:'5px 10px', border:0, background:'transparent',
        color:'var(--color-muted-foreground)', fontFamily:'inherit',
        fontSize:13, cursor:'pointer', fontWeight:500,
      }}>Skip</button>
    </div>
    <div style={{ flex:1, padding:'8px 20px', display:'flex', flexDirection:'column' }}>{children}</div>
    {footer && <div style={{ padding:'14px 20px 20px', display:'flex', flexDirection:'column', gap:10 }}>{footer}</div>}
  </div>
);

// ─── Step 0 — Intro ─────────────────────────────────────────────────
const ZKP_Intro = ({ onNext }) => (
  <StepFrame footer={<>
    <Btn variant="solid" tone="primary" size="lg" fullWidth onClick={onNext}>
      Verify with Aadhaar
    </Btn>
    <Btn variant="ghost" size="md" fullWidth>Browse anonymously first</Btn>
    <div style={{ textAlign:'center', fontSize:10, color:'var(--color-muted-foreground)', marginTop:4 }}>
      By continuing you accept the Citizen Charter. No PII leaves your device.
    </div>
  </>}>
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:20, paddingTop:8 }}>
      <div style={{
        width:120, height:120, borderRadius:'50%', alignSelf:'center',
        background:'var(--color-brand-100)',
        border:'1px solid var(--color-brand-200)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <I.ShieldFill style={{ width:56, height:56, color:'var(--color-brand-500)' }}/>
      </div>
      <div>
        <h1 style={{ margin:0, textAlign:'center', fontSize:24, fontWeight:800, letterSpacing:'-0.02em', textWrap:'pretty', lineHeight:1.15 }}>
          Verify. Stay anonymous.
        </h1>
        <p style={{ margin:'10px 0 0', textAlign:'center', fontSize:13, lineHeight:1.6, color:'var(--color-muted-foreground)', textWrap:'pretty' }}>
          Prove you are a unique Indian citizen — without giving us your name, your number, or your Aadhaar.
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[
          { I: 'Lock',       label: 'Aadhaar never leaves this phone' },
          { I: 'ShieldFill', label: 'Zero-knowledge proof attests you are 18+' },
          { I: 'Sparkles',   label: 'One citizen, one vote — Sybil-proof' },
        ].map((r,i) => {
          const IconC = I[r.I];
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 12px', background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:12,
            }}>
              <IconC style={{width:14,height:14, color:'var(--color-brand-600)', flexShrink:0}}/>
              <span style={{ fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.45 }}>{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
    <div style={{ paddingTop:18 }}><StepDots step={0}/></div>
  </StepFrame>
);

// ─── Step 1 — Scan Aadhaar QR ──────────────────────────────────────
const ZKP_Scan = ({ onNext }) => (
  <StepFrame footer={<>
    <Btn variant="solid" tone="primary" size="lg" fullWidth onClick={onNext} icon={<I.Search style={{width:15,height:15}}/>}>
      Open scanner
    </Btn>
    <Btn variant="bordered" tone="default" size="md" fullWidth icon={<I.FileText style={{width:14,height:14}}/>}>
      Upload mAadhaar PDF
    </Btn>
  </>}>
    <div style={{ marginTop:8 }}>
      <Overline>Step 2 of 5</Overline>
      <h1 style={{ margin:'8px 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.2 }}>
        Scan the QR on your Aadhaar card
      </h1>
      <p style={{ margin:0, fontSize:13, lineHeight:1.55, color:'var(--color-muted-foreground)' }}>
        The QR is read on-device. Only the UIDAI signature is checked.
      </p>
    </div>
    <div style={{
      flex:1, marginTop:18, marginBottom:14,
      background:'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)',
      borderRadius:18, position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {/* Viewfinder corners */}
      {[[0,0,'TL'],[1,0,'TR'],[0,1,'BL'],[1,1,'BR']].map(([x,y,k]) => (
        <span key={k} style={{
          position:'absolute',
          [x===0?'left':'right']: 28,
          [y===0?'top':'bottom']: 28,
          width:30, height:30,
          borderTop:    y===0 ? '3px solid var(--color-brand-400)' : '0',
          borderBottom: y===1 ? '3px solid var(--color-brand-400)' : '0',
          borderLeft:   x===0 ? '3px solid var(--color-brand-400)' : '0',
          borderRight:  x===1 ? '3px solid var(--color-brand-400)' : '0',
          borderRadius: 6,
        }}/>
      ))}
      <div style={{
        width:'70%', aspectRatio:'1', borderRadius:14,
        background:'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
        border:'1px dashed rgba(255,255,255,0.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative',
      }}>
        <I.Search style={{width:48, height:48, color:'rgba(255,255,255,0.25)'}}/>
        <span style={{
          position:'absolute', left:'8%', right:'8%', top:'48%',
          height:2, background:'var(--color-brand-400)',
          boxShadow:'0 0 10px var(--color-brand-400)',
        }}/>
      </div>
      <div style={{
        position:'absolute', left:0, right:0, bottom:14, textAlign:'center',
        fontSize:11, color:'rgba(255,255,255,0.6)', fontFamily:'var(--font-mono)',
        letterSpacing:'0.06em',
      }}>HOLD STEADY — SCANNING</div>
    </div>
    <div style={{
      padding:'10px 12px', background:'var(--color-muted)',
      border:'1px solid var(--color-border)', borderRadius:10,
      display:'flex', gap:10, alignItems:'flex-start',
    }}>
      <I.Lock style={{width:13,height:13, color:'var(--color-brand-600)', flexShrink:0, marginTop:2}}/>
      <div style={{ fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.55 }}>
        Camera frame stays on-device. We never upload the image, the number, or the QR data.
      </div>
    </div>
    <div style={{ paddingTop:14 }}><StepDots step={1}/></div>
  </StepFrame>
);

// ─── Step 2 — Generate ZKP ─────────────────────────────────────────
const ZKP_Generate = ({ onNext }) => {
  // Animate the progress percentage
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    const tick = (t) => {
      if (cancelled) return;
      setP(prev => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + 1.6);
      });
    };
    const id = setInterval(tick, 60);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const done = p >= 100;
  const items = [
    { at:18,  label:'UIDAI signature verified',           detail:'On-device · RSA-2048' },
    { at:42,  label:'Age proof generated',                detail:'You are 18+ · no DOB stored' },
    { at:70,  label:'State code extracted for routing',   detail:'Maharashtra · no district kept' },
    { at:92,  label:'Nullifier hashed',                   detail:'Hash(Aadhaar) prevents duplicate accounts' },
    { at:100, label:'ZKP proof bundled · 4.2 KB',         detail:'Groth16 · ready to submit' },
  ];

  return (
    <StepFrame footer={
      <Btn variant="solid" tone="primary" size="lg" fullWidth onClick={onNext} disabled={!done}>
        {done ? 'Submit proof' : 'Generating…'}
      </Btn>
    }>
      <div style={{ marginTop:8 }}>
        <Overline>Step 3 of 5</Overline>
        <h1 style={{ margin:'8px 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.2 }}>
          {done ? 'Proof generated' : 'Generating zero-knowledge proof'}
        </h1>
        <p style={{ margin:0, fontSize:13, lineHeight:1.55, color:'var(--color-muted-foreground)' }}>
          Groth16 over the anoncitizen circuit. About 8 seconds on a typical phone.
        </p>
      </div>

      <div style={{
        marginTop:20, padding:'18px 16px', borderRadius:16,
        background:'var(--color-brand-50)',
        border:'1px solid var(--color-brand-200)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-brand-800)', letterSpacing:'0.06em' }}>PROGRESS</span>
          <span style={{ fontSize:22, fontWeight:800, color:'var(--color-brand-700)', letterSpacing:'-0.02em' }}>{Math.round(p)}%</span>
        </div>
        <div style={{ height:8, background:'var(--color-gray-200)', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            width: p + '%', height:'100%',
            background:'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
            transition:'width 0.18s linear',
          }}/>
        </div>
      </div>

      <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
        {items.map((it, i) => {
          const ok = p >= it.at;
          return (
            <div key={i} style={{
              display:'flex', gap:12, alignItems:'flex-start',
              padding:'10px 12px', background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:12,
              opacity: ok ? 1 : 0.55,
              transition:'opacity 0.25s var(--ease-standard)',
            }}>
              <span style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                background: ok ? 'var(--color-success-100)' : 'var(--color-gray-200)',
                color: ok ? 'var(--color-success-700)' : 'var(--color-gray-500)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>
                {ok ? <I.Check style={{width:11,height:11}}/> : <span style={{width:5,height:5,borderRadius:'50%',background:'currentColor'}}/>}
              </span>
              <div>
                <div style={{ fontSize:12.5, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.4 }}>{it.label}</div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>{it.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ paddingTop:14 }}><StepDots step={2}/></div>
    </StepFrame>
  );
};

// ─── Step 3 — Pick constituency ────────────────────────────────────
const ZKP_Constituency = ({ onNext }) => {
  const [sel, setSel] = React.useState('Mumbai South');
  const options = ['Mumbai South','Mumbai South Central','Mumbai North-East','Pune Cantonment','Thane'];
  return (
    <StepFrame footer={
      <Btn variant="solid" tone="primary" size="lg" fullWidth onClick={onNext}>
        Continue with {sel}
      </Btn>
    }>
      <div style={{ marginTop:8 }}>
        <Overline>Step 4 of 5</Overline>
        <h1 style={{ margin:'8px 0 6px', fontSize:22, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.2 }}>
          Pick your constituency
        </h1>
        <p style={{ margin:0, fontSize:13, lineHeight:1.55, color:'var(--color-muted-foreground)' }}>
          From your state code only. You can change this once per term.
        </p>
      </div>
      <div style={{
        marginTop:18, padding:'10px 12px',
        background:'var(--color-muted)', border:'1px solid var(--color-border)',
        borderRadius:12, display:'flex', alignItems:'center', gap:10,
      }}>
        <I.MapPin style={{width:14,height:14, color:'var(--color-brand-600)'}}/>
        <input placeholder="Search constituency or pincode" style={{
          flex:1, border:0, background:'transparent', outline:'none',
          fontFamily:'inherit', fontSize:13, color:'var(--color-foreground)',
        }}/>
      </div>
      <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(o => (
          <button key={o} onClick={()=>setSel(o)} style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'12px 14px', borderRadius:12,
            background: sel===o ? 'var(--color-brand-50)' : 'var(--color-card)',
            border:'1px solid ' + (sel===o ? 'var(--color-brand-400)' : 'var(--color-border)'),
            cursor:'pointer', fontFamily:'inherit', textAlign:'left',
          }}>
            <span style={{
              width:18, height:18, borderRadius:'50%', flexShrink:0,
              border:'2px solid ' + (sel===o ? 'var(--color-brand-500)' : 'var(--color-gray-300)'),
              background: sel===o ? 'var(--color-brand-500)' : 'transparent',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>
              {sel===o && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}
            </span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight: sel===o?600:500, color:'var(--color-foreground)' }}>{o}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>Maharashtra</div>
            </div>
            <I.ChevronR style={{width:13,height:13, color:'var(--color-gray-400)'}}/>
          </button>
        ))}
      </div>
      <div style={{
        marginTop:'auto', paddingTop:14, paddingBottom:6,
      }}>
        <StepDots step={3}/>
      </div>
    </StepFrame>
  );
};

// ─── Step 4 — Done ──────────────────────────────────────────────────
const ZKP_Done = ({ onNext }) => (
  <StepFrame footer={
    <Btn variant="solid" tone="primary" size="lg" fullWidth onClick={onNext} iconRight={<I.ChevronR style={{width:15,height:15}}/>}>
      Open the feed
    </Btn>
  }>
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:18 }}>
      <div style={{
        width:84, height:84, borderRadius:'50%', alignSelf:'center',
        background:'var(--color-success-100)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <I.Check style={{ width:38, height:38, color:'var(--color-success-700)' }}/>
      </div>
      <div>
        <h1 style={{ margin:0, textAlign:'center', fontSize:24, fontWeight:800, letterSpacing:'-0.02em', textWrap:'pretty', lineHeight:1.15 }}>
          You're a verified citizen.
        </h1>
        <p style={{ margin:'10px 0 0', textAlign:'center', fontSize:13, lineHeight:1.6, color:'var(--color-muted-foreground)', textWrap:'pretty' }}>
          No name, no number, no email. Just one anonymous handle that proves you are real.
        </p>
      </div>
      <div style={{
        padding:'16px 18px', borderRadius:16,
        background:'var(--color-brand-50)',
        border:'1px solid var(--color-brand-200)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar handle="citizen-7K3F4P" size={36}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'var(--color-brand-700)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>YOUR HANDLE</div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-mono)', letterSpacing:'-0.01em', color:'var(--color-foreground)' }}>citizen-7K3F4P</div>
          </div>
          <I.ShieldFill style={{width:18,height:18, color:'var(--color-brand-600)'}}/>
        </div>
        <div style={{ marginTop:12, padding:'10px 12px', background:'var(--color-card)', borderRadius:10, border:'1px solid var(--color-border)', fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
          Anchored to <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>0x8b1…f4a</span> on Polygon · constituency <strong style={{ color:'var(--color-foreground)' }}>Mumbai South</strong>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[
          'File a complaint about your street',
          'Endorse 100 complaints to unlock report-card amend rights',
          'Subscribe to your constituency feed',
        ].map((t,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', fontSize:12.5, color:'var(--color-foreground)' }}>
            <I.Sparkles style={{width:12,height:12, color:'var(--color-brand-600)'}}/>
            {t}
          </div>
        ))}
      </div>
    </div>
    <div style={{ paddingTop:14 }}><StepDots step={4}/></div>
  </StepFrame>
);

// Convenience step renderer
const ZKP_Step = ({ step, onNext }) => {
  if (step === 0) return <ZKP_Intro onNext={onNext}/>;
  if (step === 1) return <ZKP_Scan onNext={onNext}/>;
  if (step === 2) return <ZKP_Generate onNext={onNext}/>;
  if (step === 3) return <ZKP_Constituency onNext={onNext}/>;
  return <ZKP_Done onNext={onNext}/>;
};

Object.assign(window, {
  ZKP_Intro, ZKP_Scan, ZKP_Generate, ZKP_Constituency, ZKP_Done, ZKP_Step, FvMark,
});
