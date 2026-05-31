// Factivist — Web (desktop) ZKP onboarding
// Mirrors the mobile 5-step flow but laid out for a 1280px viewport.
// Left rail = step navigator. Centre = copy + hero visual. Right = the
// privacy contract / trust panel. One screen per step, parametrized.

const WEB_OB_STEPS = [
  { n: 1, t: 'Verify',       sub: 'Promise & guardrails' },
  { n: 2, t: 'Scan',         sub: 'Aadhaar QR · on-device' },
  { n: 3, t: 'Prove',        sub: 'Generate the zero-knowledge proof' },
  { n: 4, t: 'Constituency', sub: 'Pick your civic locus' },
  { n: 5, t: 'Open feed',    sub: 'Anonymous citizen handle' },
];

// Shared left rail
const WebObRail = ({ step }) => (
  <aside style={{
    width:260, padding:'24px 22px 24px 28px', borderRight:'1px solid var(--color-border)',
    position:'sticky', top:0, alignSelf:'flex-start', height:'100%',
    background:'var(--color-card)',
  }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
      <FvMark size={28}/>
      <div style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>Factivist</div>
    </div>
    <Overline style={{ marginBottom:14 }}>Verify your citizenship</Overline>
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {WEB_OB_STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'pending';
        return (
          <div key={s.n} style={{
            display:'flex', alignItems:'center', gap:12, padding:'12px 12px',
            borderRadius:12,
            background: state==='current' ? 'var(--color-brand-50)' : 'transparent',
            border:'1px solid ' + (state==='current' ? 'var(--color-brand-200)' : 'transparent'),
            opacity: state==='pending' ? 0.55 : 1,
          }}>
            <span style={{
              width:26, height:26, borderRadius:'50%', flexShrink:0,
              background: state==='done' ? 'var(--color-brand-500)'
                        : state==='current' ? 'var(--color-foreground)'
                        : 'var(--color-gray-200)',
              color: state==='done' || state==='current' ? 'var(--color-background)' : 'var(--color-gray-700)',
              fontFamily:'var(--font-mono)', fontWeight:700, fontSize:11,
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>{state==='done' ? <I.Check style={{ width:11, height:11 }}/> : s.n}</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight: state==='current' ? 700 : 600, color:'var(--color-foreground)' }}>{s.t}</div>
              <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ marginTop:24, padding:'12px 14px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, color:'var(--color-brand-700)' }}>
        <I.Lock style={{ width:12, height:12 }}/>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em' }}>ON-DEVICE</span>
      </div>
      <div style={{ fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.5 }}>
        Your Aadhaar number, name, address and photo never leave this browser.
      </div>
    </div>
  </aside>
);

// Right-side trust panel (varies per step)
const WebObTrust = ({ items, footer }) => (
  <aside style={{
    width:300, padding:'24px 28px 24px 22px', alignSelf:'flex-start',
    position:'sticky', top:0,
  }}>
    <Overline>What we don't see</Overline>
    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display:'flex', gap:10, padding:'12px 12px',
          background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12,
        }}>
          <span style={{
            width:22, height:22, borderRadius:7, flexShrink:0,
            background:'var(--color-brand-50)', color:'var(--color-brand-700)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}><I.X style={{ width:10, height:10 }}/></span>
          <div>
            <div style={{ fontSize:12, fontWeight:600 }}>{it.k}</div>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, lineHeight:1.5 }}>{it.v}</div>
          </div>
        </div>
      ))}
    </div>
    {footer && <div style={{ marginTop:18 }}>{footer}</div>}
  </aside>
);

// Step 1 — Verify (intro)
const WebObStep1 = () => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'center', minHeight:'calc(100% - 0px)' }}>
    <div>
      <Overline>Step 1 of 5 · Identity</Overline>
      <h1 style={{ margin:'10px 0 12px', fontSize:46, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.05, textWrap:'balance' }}>
        Verify, but stay <span style={{ color:'var(--color-brand-600)' }}>anonymous.</span>
      </h1>
      <p style={{ margin:0, fontSize:16, lineHeight:1.65, color:'var(--color-muted-foreground)', maxWidth:520, textWrap:'pretty' }}>
        Prove you're a unique Indian citizen over 18, without giving us your name, your number, or your Aadhaar. A zero-knowledge proof attests the facts we need. Nothing else.
      </p>
      <div style={{ marginTop:24, display:'flex', flexDirection:'column', gap:8, maxWidth:520 }}>
        {[
          { i: 'Lock',       t: 'Aadhaar never leaves this browser' },
          { i: 'ShieldFill', t: 'Groth16 ZKP attests you are 18+ and a unique citizen' },
          { i: 'Sparkles',   t: 'A nullifier prevents one Aadhaar from registering twice' },
          { i: 'MapPin',     t: 'State code is extracted only to route you to your constituency' },
        ].map((r, i) => {
          const IconC = I[r.i] || I.Lock;
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12 }}>
              <IconC style={{ width:16, height:16, color:'var(--color-brand-600)', flexShrink:0 }}/>
              <span style={{ fontSize:13, color:'var(--color-foreground)', lineHeight:1.4 }}>{r.t}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:28, display:'flex', gap:10 }}>
        <Btn variant="solid" tone="primary" size="lg" iconRight={<I.ChevronR style={{ width:15, height:15 }}/>}>
          Verify with Aadhaar
        </Btn>
        <Btn variant="ghost" size="lg">Browse anonymously first</Btn>
      </div>
      <div style={{ marginTop:14, fontSize:11.5, color:'var(--color-muted-foreground)' }}>
        By continuing you accept the Citizen Charter. No PII is uploaded.
      </div>
    </div>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{
        position:'relative', width:380, height:380, borderRadius:24,
        background:'linear-gradient(140deg, var(--color-brand-50), var(--color-card))',
        border:'1px solid var(--color-brand-200)',
        display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        {/* Concentric rings */}
        {[260, 200, 140].map((sz, i) => (
          <span key={i} style={{
            position:'absolute', width:sz, height:sz, borderRadius:'50%',
            border:'1px dashed var(--color-brand-300)', opacity: 0.4 - i*0.06,
          }}/>
        ))}
        <div style={{
          width:120, height:120, borderRadius:'50%',
          background:'var(--color-brand-500)', color:'#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 12px 40px -8px var(--color-brand-500)',
        }}>
          <I.ShieldFill style={{ width:58, height:58 }}/>
        </div>
        {/* Floating tags */}
        {[
          { x: 30,  y: 56,  text: 'name',   strike: true },
          { x: 240, y: 40,  text: 'number', strike: true },
          { x: 18,  y: 240, text: 'address',strike: true },
          { x: 250, y: 290, text: 'photo',  strike: true },
          { x: 130, y: 12,  text: '18+ ✓',  strike: false, brand: true },
          { x: 270, y: 170, text: 'state code ✓', strike: false, brand: true },
        ].map((tag, i) => (
          <span key={i} style={{
            position:'absolute', left: tag.x, top: tag.y,
            padding:'5px 10px', borderRadius:9999, fontSize:11, fontWeight:600, fontFamily:'var(--font-mono)',
            background: tag.brand ? 'var(--color-brand-100)' : 'var(--color-card)',
            color: tag.brand ? 'var(--color-brand-800)' : 'var(--color-muted-foreground)',
            border:'1px solid ' + (tag.brand ? 'var(--color-brand-300)' : 'var(--color-border)'),
            textDecoration: tag.strike ? 'line-through' : 'none',
          }}>{tag.text}</span>
        ))}
      </div>
    </div>
  </div>
);

// Step 2 — Scan
const WebObStep2 = () => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'center' }}>
    <div>
      <Overline>Step 2 of 5 · Read the QR</Overline>
      <h1 style={{ margin:'10px 0 12px', fontSize:36, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, textWrap:'balance' }}>
        Point the camera at the QR on your Aadhaar card.
      </h1>
      <p style={{ margin:0, fontSize:15, lineHeight:1.65, color:'var(--color-muted-foreground)', maxWidth:520, textWrap:'pretty' }}>
        We read it locally and verify the UIDAI digital signature. The frame is processed and discarded — no image, no number, no QR data is uploaded.
      </p>
      <div style={{ marginTop:22, display:'flex', flexDirection:'column', gap:8, maxWidth:520 }}>
        {[
          { i: 'FileText', t: 'Or upload your mAadhaar PDF — same on-device flow' },
          { i: 'Sparkles', t: 'Works offline · the QR carries everything we need' },
        ].map((r, i) => {
          const IconC = I[r.i];
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12 }}>
              <IconC style={{ width:14, height:14, color:'var(--color-brand-600)', flexShrink:0 }}/>
              <span style={{ fontSize:12.5, color:'var(--color-foreground)' }}>{r.t}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:22, display:'flex', gap:10 }}>
        <Btn variant="solid" tone="primary" size="md" icon={<I.Search style={{ width:14, height:14 }}/>}>Open scanner</Btn>
        <Btn variant="bordered" tone="default" size="md" icon={<I.FileText style={{ width:14, height:14 }}/>}>Upload mAadhaar PDF</Btn>
      </div>
    </div>
    {/* Viewfinder */}
    <div style={{
      width:'100%', aspectRatio:'1', maxWidth:420, margin:'0 auto',
      background:'linear-gradient(160deg, #181818, #050505)',
      borderRadius:24, position:'relative', overflow:'hidden',
      border:'1px solid var(--color-border)',
    }}>
      {[[0,0,'TL'],[1,0,'TR'],[0,1,'BL'],[1,1,'BR']].map(([x,y,k]) => (
        <span key={k} style={{
          position:'absolute',
          [x===0?'left':'right']: 36,
          [y===0?'top':'bottom']: 36,
          width:42, height:42,
          borderTop:    y===0 ? '4px solid var(--color-brand-400)' : '0',
          borderBottom: y===1 ? '4px solid var(--color-brand-400)' : '0',
          borderLeft:   x===0 ? '4px solid var(--color-brand-400)' : '0',
          borderRight:  x===1 ? '4px solid var(--color-brand-400)' : '0',
          borderRadius: 8,
        }}/>
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          width:'62%', aspectRatio:'1', borderRadius:18,
          background:'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
          border:'1px dashed rgba(255,255,255,0.18)',
          display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        }}>
          <I.Search style={{ width:64, height:64, color:'rgba(255,255,255,0.22)' }}/>
          <span style={{
            position:'absolute', left:'8%', right:'8%', top:'48%',
            height:2, background:'var(--color-brand-400)',
            boxShadow:'0 0 14px var(--color-brand-400)',
          }}/>
        </div>
      </div>
      <div style={{
        position:'absolute', left:0, right:0, bottom:18, textAlign:'center',
        fontSize:11.5, color:'rgba(255,255,255,0.66)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em',
      }}>HOLD STEADY — SCANNING ON-DEVICE</div>
    </div>
  </div>
);

// Step 3 — Generate proof (auto-advancing for demo)
const WebObStep3 = () => {
  const [p, setP] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setP(v => v >= 100 ? 100 : Math.min(100, v + 1.8)), 70);
    return () => clearInterval(id);
  }, []);
  const items = [
    { at:18,  label:'UIDAI signature verified',          detail:'RSA-2048 · valid against UIDAI public key' },
    { at:42,  label:'Age proof generated',                detail:'You are 18+ · DOB not stored' },
    { at:62,  label:'State code extracted',               detail:'Maharashtra · district discarded' },
    { at:82,  label:'Nullifier hashed',                   detail:'hash(Aadhaar) prevents duplicate accounts' },
    { at:100, label:'ZKP proof bundled · 4.2 KB',         detail:'Groth16 · ready to submit on-chain' },
  ];
  const done = p >= 100;
  return (
    <div>
      <Overline>Step 3 of 5 · Zero-knowledge proof</Overline>
      <h1 style={{ margin:'10px 0 12px', fontSize:36, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, textWrap:'balance', maxWidth:760 }}>
        {done ? 'Proof generated.' : 'Generating zero-knowledge proof…'}
      </h1>
      <p style={{ margin:0, fontSize:15, lineHeight:1.65, color:'var(--color-muted-foreground)', maxWidth:760, textWrap:'pretty' }}>
        Groth16 over the <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>anoncitizen</span> circuit. Runs entirely on this device. About 8 seconds on a modern laptop, 12–18 on mobile.
      </p>

      <div style={{
        marginTop:24, padding:'22px 26px', borderRadius:18,
        background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
        maxWidth:760,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-brand-800)', letterSpacing:'0.06em' }}>PROGRESS</span>
          <span style={{ fontSize:36, fontWeight:800, color:'var(--color-brand-700)', letterSpacing:'-0.02em' }}>{Math.round(p)}<span style={{ fontSize:18 }}>%</span></span>
        </div>
        <div style={{ height:10, background:'var(--color-gray-200)', borderRadius:99, overflow:'hidden' }}>
          <div style={{
            width: p + '%', height:'100%',
            background:'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
            transition:'width 0.2s linear',
          }}/>
        </div>
      </div>

      <div style={{
        marginTop:18, display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, maxWidth:760,
      }}>
        {items.map((it, i) => {
          const ok = p >= it.at;
          return (
            <div key={i} style={{
              display:'flex', gap:12, alignItems:'flex-start',
              padding:'12px 14px', background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:12,
              opacity: ok ? 1 : 0.55, transition:'opacity 0.25s var(--ease-standard)',
            }}>
              <span style={{
                width:24, height:24, borderRadius:'50%', flexShrink:0,
                background: ok ? 'var(--color-success-100)' : 'var(--color-gray-200)',
                color: ok ? 'var(--color-success-700)' : 'var(--color-gray-500)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}>{ok ? <I.Check style={{ width:12, height:12 }}/> : <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }}/>}</span>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{it.label}</div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>{it.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:24 }}>
        <Btn variant="solid" tone="primary" size="lg" disabled={!done} iconRight={<I.ChevronR style={{ width:15, height:15 }}/>}>
          {done ? 'Submit proof' : 'Generating…'}
        </Btn>
      </div>
    </div>
  );
};

// Step 4 — Pick constituency
const WebObStep4 = () => {
  const [sel, setSel] = React.useState('Mumbai South');
  const options = [
    { name: 'Mumbai South',         meta: 'Maharashtra · AC 184 · pin 400001', mp: 'Anant V. Kulkarni', grade: 'C+' },
    { name: 'Mumbai South Central', meta: 'Maharashtra · AC 185 · pin 400011', mp: 'P. Naik',           grade: 'C'  },
    { name: 'Mumbai North-East',    meta: 'Maharashtra · AC 168 · pin 400078', mp: 'S. Pawar',          grade: 'C-' },
    { name: 'Pune Cantonment',      meta: 'Maharashtra · AC 215 · pin 411001', mp: 'L. Tagore',         grade: 'B-' },
    { name: 'Thane',                meta: 'Maharashtra · AC 147 · pin 400601', mp: 'V. Khade',          grade: 'C'  },
    { name: 'Aurangabad Central',   meta: 'Maharashtra · AC 105 · pin 431001', mp: 'M. Joshi',          grade: 'C+' },
  ];
  return (
    <div>
      <Overline>Step 4 of 5 · Constituency</Overline>
      <h1 style={{ margin:'10px 0 12px', fontSize:36, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, textWrap:'balance', maxWidth:760 }}>
        Pick the constituency you'll be civically present in.
      </h1>
      <p style={{ margin:0, fontSize:14.5, lineHeight:1.65, color:'var(--color-muted-foreground)', maxWidth:760, textWrap:'pretty' }}>
        From your state code only. The platform never reads your address. You can change this once per electoral term, after a 14-day cooldown.
      </p>
      <div style={{
        marginTop:22, padding:'10px 14px', background:'var(--color-card)', border:'1px solid var(--color-border)',
        borderRadius:12, display:'flex', alignItems:'center', gap:10, maxWidth:760,
      }}>
        <I.Search style={{ width:14, height:14, color:'var(--color-muted-foreground)' }}/>
        <input placeholder="Search by constituency name, MLA, MP or pincode" defaultValue="Mumbai" style={{
          flex:1, border:0, background:'transparent', outline:'none',
          fontFamily:'inherit', fontSize:13.5, color:'var(--color-foreground)',
        }}/>
        <Chip tone="default" sm bordered>Maharashtra</Chip>
      </div>
      <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:8, maxWidth:760 }}>
        {options.map(o => (
          <button key={o.name} onClick={() => setSel(o.name)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            borderRadius:14, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
            background: sel===o.name ? 'var(--color-brand-50)' : 'var(--color-card)',
            border:'1.5px solid ' + (sel===o.name ? 'var(--color-brand-400)' : 'var(--color-border)'),
          }}>
            <span style={{
              width:18, height:18, borderRadius:'50%', flexShrink:0,
              border:'2px solid ' + (sel===o.name ? 'var(--color-brand-500)' : 'var(--color-gray-300)'),
              background: sel===o.name ? 'var(--color-brand-500)' : 'transparent',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>{sel===o.name && <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }}/>}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight: sel===o.name ? 700 : 600 }}>{o.name}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{o.meta}</div>
            </div>
            <div style={{ textAlign:'right', fontSize:11, color:'var(--color-muted-foreground)' }}>
              <div>MP · {o.mp}</div>
              <div style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:700, fontSize:12 }}>Grade {o.grade}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ marginTop:22 }}>
        <Btn variant="solid" tone="primary" size="lg" iconRight={<I.ChevronR style={{ width:15, height:15 }}/>}>
          Continue with {sel}
        </Btn>
      </div>
    </div>
  );
};

// Step 5 — Done
const WebObStep5 = () => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:36, alignItems:'center' }}>
    <div>
      <Overline>Step 5 of 5 · Citizen handle</Overline>
      <h1 style={{ margin:'10px 0 12px', fontSize:46, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.05, textWrap:'balance' }}>
        You're a <span style={{ color:'var(--color-success-700)' }}>verified citizen.</span>
      </h1>
      <p style={{ margin:0, fontSize:16, lineHeight:1.65, color:'var(--color-muted-foreground)', maxWidth:520, textWrap:'pretty' }}>
        No name, no number, no email. Just one anonymous handle, anchored on Polygon. From now on, anything you say carries the weight of a real citizen — and nothing more.
      </p>
      <div style={{
        marginTop:22, padding:'18px 20px', borderRadius:18,
        background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)', maxWidth:520,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Avatar handle="citizen-7K3F4P" size={56}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-brand-700)', letterSpacing:'0.06em' }}>YOUR HANDLE</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, letterSpacing:'-0.01em' }}>citizen-7K3F4P</div>
          </div>
          <I.ShieldFill style={{ width:24, height:24, color:'var(--color-brand-600)' }}/>
        </div>
        <div style={{ marginTop:12, padding:'10px 14px', background:'var(--color-card)', borderRadius:10, border:'1px solid var(--color-border)', fontSize:11.5, color:'var(--color-muted-foreground)' }}>
          Anchored to <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>0x8b1c…f4ae</span> · Polygon block 71,184,612 · constituency <strong style={{ color:'var(--color-foreground)' }}>Mumbai South</strong>
        </div>
      </div>
      <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:8, maxWidth:520 }}>
        {[
          { i:'Plus',     t:'File a complaint about your street' },
          { i:'ArrowUp',  t:'Endorse 100 complaints to unlock report-card amend rights' },
          { i:'Bell',     t:'Subscribe to your constituency feed' },
        ].map((r, i) => {
          const IconC = I[r.i];
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12 }}>
              <IconC style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
              <span style={{ fontSize:13 }}>{r.t}</span>
              <I.ChevronR style={{ width:13, height:13, color:'var(--color-muted-foreground)', marginLeft:'auto' }}/>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:22, display:'flex', gap:10 }}>
        <Btn variant="solid" tone="primary" size="lg" iconRight={<I.ChevronR style={{ width:15, height:15 }}/>}>Open the feed</Btn>
        <Btn variant="ghost" size="lg">Download recovery key</Btn>
      </div>
    </div>
    <div style={{ display:'flex', justifyContent:'center' }}>
      <div style={{
        width:340, padding:'32px 32px', borderRadius:24,
        background:'linear-gradient(160deg, var(--color-success-50), var(--color-card) 70%)',
        border:'1px solid var(--color-success-200)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:18,
      }}>
        <div style={{
          width:108, height:108, borderRadius:'50%',
          background:'var(--color-success-500)', color:'#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 16px 40px -10px var(--color-success-500)',
        }}><I.Check style={{ width:54, height:54 }}/></div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.08em', color:'var(--color-success-800)' }}>ANCHORED ON POLYGON</div>
          <div style={{ marginTop:6, fontSize:18, fontWeight:800, letterSpacing:'-0.015em' }}>One citizen · one vote</div>
        </div>
        <div style={{
          width:'100%', padding:'12px 14px', borderRadius:12,
          background:'var(--color-card)', border:'1px solid var(--color-border)',
          display:'flex', flexDirection:'column', gap:6,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--color-muted-foreground)' }}>nullifier</span>
            <span style={{ color:'var(--color-foreground)' }}>0xa18e…2d4f</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--color-muted-foreground)' }}>state code</span>
            <span style={{ color:'var(--color-foreground)' }}>MH</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--color-muted-foreground)' }}>proof size</span>
            <span style={{ color:'var(--color-foreground)' }}>4.2 KB</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Trust panel items per step
const WEB_OB_TRUST_ITEMS = [
  // step 1
  [
    { k: 'Your Aadhaar number', v: 'Never uploaded. Read only from the QR your camera sees.' },
    { k: 'Your name & address', v: 'Stripped from the proof. We literally cannot read them.' },
    { k: 'Your photo',           v: 'Stays on your device. Discarded after the proof is built.' },
    { k: 'A reverse lookup',     v: 'The nullifier is a one-way hash. It cannot reveal the Aadhaar.' },
  ],
  // step 2
  [
    { k: 'The camera frame',     v: 'Discarded after the QR is decoded. Never sent to any server.' },
    { k: 'The QR payload',       v: 'Parsed locally. Only the signature is checked against UIDAI.' },
    { k: 'Mistaken scans',       v: 'No retries are logged. Try as many times as you need.' },
  ],
  // step 3
  [
    { k: 'Your Aadhaar number', v: 'Goes into the proof as a private input. Cannot be extracted.' },
    { k: 'Your DOB',             v: 'Only "≥ 18" is exposed. The actual date stays private.' },
    { k: 'Your district',        v: 'Only state code is used for routing. District is dropped.' },
  ],
  // step 4
  [
    { k: 'Your home address',    v: 'Never asked. Your constituency is your civic locus, not your residence.' },
    { k: 'Your pincode',          v: 'Used for routing if you choose to share it. Off by default.' },
  ],
  // step 5
  [
    { k: 'A real identity',      v: 'Your handle is permanently disconnected from your Aadhaar.' },
    { k: 'Cross-platform leaks', v: 'No email, no phone. Reset only via the recovery key you hold.' },
    { k: 'Re-registration',      v: 'The nullifier prevents the same Aadhaar from registering twice.' },
  ],
];

const WebOnboarding = ({ step = 0 }) => {
  const StepComp = [WebObStep1, WebObStep2, WebObStep3, WebObStep4, WebObStep5][step] || WebObStep1;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 300px', minHeight:'100%' }}>
      <WebObRail step={step}/>
      <main style={{ padding:'40px 36px 64px', minWidth:0 }}>
        <StepComp/>
      </main>
      <WebObTrust items={WEB_OB_TRUST_ITEMS[step] || WEB_OB_TRUST_ITEMS[0]}/>
    </div>
  );
};

Object.assign(window, { WebOnboarding });
