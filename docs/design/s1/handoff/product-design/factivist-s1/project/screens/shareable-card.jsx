// Factivist — Shareable Report Card
// One-page election-season card optimized for screenshotting / WhatsApp /
// Twitter sharing. Renders as a portrait card at 540×960 and a landscape
// card at 1080×608. The artboard shows both side by side plus copy.

const ShareableCardPortrait = ({ leader }) => {
  const L = leader;
  const promiseSegments = [
    { label:'Kept',    value:L.promisesKept,    color:'oklch(0.65 0.18 145)' },
    { label:'Partial', value:L.promisesPartial, color:'oklch(0.78 0.16 75)'  },
    { label:'Broken',  value:L.promisesBroken,  color:'oklch(0.62 0.20 27)'  },
    { label:'Unverif', value:L.promisesUnknown, color:'oklch(0.78 0.01 270)' },
  ];
  const total = promiseSegments.reduce((a,s)=>a+s.value, 0);

  return (
    <div style={{
      width:540, height:960, position:'relative',
      background:'#1c1917',
      color:'oklch(0.96 0.003 250)',
      fontFamily:'var(--font-sans)', overflow:'hidden',
      borderRadius:24, boxShadow:'0 30px 60px -20px rgba(0,0,0,0.45)',
    }}>
      {/* Brand glow */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 20% 0%, oklch(0.42 0.15 250 / 0.45) 0%, transparent 55%), radial-gradient(ellipse at 90% 90%, oklch(0.45 0.20 27 / 0.30) 0%, transparent 50%)',
        pointerEvents:'none',
      }}/>

      {/* Header */}
      <div style={{ position:'relative', padding:'28px 32px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
          <FvMark size={28}/>
          <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.02em' }}>Factivist</span>
        </div>
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em',
          color:'oklch(0.75 0.01 270)', fontWeight:600,
        }}>REPORT CARD · 2026</span>
      </div>

      <div style={{ position:'relative', padding:'18px 32px 0' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.78 0.16 250)', letterSpacing:'0.06em', fontWeight:700, marginBottom:8 }}>
          {L.role.toUpperCase()} · {L.term}
        </div>
        <div style={{ fontSize:38, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.05, textWrap:'balance' }}>{L.name}</div>
        <div style={{ marginTop:6, fontSize:14, color:'oklch(0.78 0.01 270)', display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:L.partyColor }}/>
          <span>{L.party}</span>
          <span>·</span>
          <span style={{ color:'#fff' }}>{L.constituency}</span>
          <span>·</span>
          <span>{L.state}</span>
        </div>
      </div>

      {/* Giant grade */}
      <div style={{
        position:'relative', margin:'22px 32px 0',
        padding:'22px 24px', borderRadius:18,
        background:'oklch(0.22 0.005 270 / 0.7)',
        border:'1px solid oklch(0.32 0.006 270)',
        display:'flex', alignItems:'center', gap:18,
      }}>
        <div style={{
          width:108, height:108, borderRadius:24, flexShrink:0,
          background:
            L.gradeTone === 'success' ? 'oklch(0.65 0.18 145)' :
            L.gradeTone === 'warning' ? 'oklch(0.78 0.16 75)'  :
            'oklch(0.62 0.22 27)',
          color: L.gradeTone === 'warning' ? '#1c1917' : '#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          fontSize:60, fontWeight:800, fontFamily:'var(--font-sans)', letterSpacing:'-0.05em', lineHeight:1,
          boxShadow:'0 10px 30px -8px currentColor',
        }}>{L.grade}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em' }}>CIVIC SCORE</div>
          <div style={{ fontSize:46, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1, marginTop:4 }}>
            {L.score}<span style={{ color:'oklch(0.55 0.01 270)', fontSize:22 }}>/100</span>
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'oklch(0.85 0.01 270)', lineHeight:1.45 }}>
            Outranks <strong style={{ color:'#fff' }}>22%</strong> of MPs nationally. {L.promisesBroken} of {L.promisesTotal} promises broken.
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{
        position:'relative', margin:'14px 32px 0',
        display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10,
      }}>
        {[
          { v:L.attendance + '%', l:'attendance', avg:'avg ' + L.attendanceAvg + '%', tone:'danger' },
          { v:L.questions,        l:'questions',  avg:'avg ' + L.questionsAvg, tone:'warning' },
          { v:L.responseTimeDays + 'd', l:'response', avg:'med 21d', tone:'danger' },
        ].map((m,i) => (
          <div key={i} style={{
            padding:'12px 12px', borderRadius:12,
            background:'oklch(0.22 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.006 270)',
          }}>
            <div style={{
              fontSize:22, fontWeight:800, letterSpacing:'-0.015em', lineHeight:1,
              color: m.tone === 'danger' ? 'oklch(0.78 0.16 27)' : 'oklch(0.85 0.14 75)',
            }}>{m.v}</div>
            <div style={{ fontSize:10, color:'oklch(0.78 0.01 270)', marginTop:5, letterSpacing:'0.02em', textTransform:'uppercase' }}>{m.l}</div>
            <div style={{ fontSize:9, color:'oklch(0.62 0.01 270)', marginTop:3, fontFamily:'var(--font-mono)' }}>{m.avg}</div>
          </div>
        ))}
      </div>

      {/* Promises bar */}
      <div style={{ position:'relative', margin:'18px 32px 0' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em', marginBottom:8 }}>
          MANIFESTO · {L.promisesTotal} TRACKED
        </div>
        <div style={{ display:'flex', height:14, borderRadius:99, overflow:'hidden' }}>
          {promiseSegments.map((s,i) => (
            <div key={i} style={{
              width: (s.value/total*100) + '%',
              background:s.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color: s.label === 'Partial' ? '#1c1917' : '#fff',
            }}>{s.value > 1 ? s.value : ''}</div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:9, color:'oklch(0.75 0.01 270)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>
          <span>KEPT {L.promisesKept}</span>
          <span>PARTIAL {L.promisesPartial}</span>
          <span style={{ color:'oklch(0.78 0.16 27)' }}>BROKEN {L.promisesBroken}</span>
          <span>UNVERIFIED {L.promisesUnknown}</span>
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
            width:64, height:64, borderRadius:10,
            background:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            padding:6,
          }}>
            <QRBlock/>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em' }}>OPEN THE FULL RECORD</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fff', fontWeight:700, marginTop:2 }}>factivist.in/l/{L.id}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:5, fontSize:10, color:'oklch(0.78 0.16 145)' }}>
              <I.ShieldFill style={{ width:10, height:10 }}/>
              <span>Anchored · {L.id}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'oklch(0.62 0.01 270)', letterSpacing:'0.08em' }}>UPDATED</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fff', fontWeight:600, marginTop:2 }}>06 MAY 2026</div>
        </div>
      </div>
    </div>
  );
};

// Stylized QR for the card. 12×12 with rng based on the leader name to make
// each card feel unique without depending on an external QR library.
const QRBlock = ({ size = 52 }) => {
  const N = 13;
  let h = 2166136261;
  const seed = 'factivist-mum-south';
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rng = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h = (h ^ (h >>> 16)) >>> 0; return h / 4294967296; };
  const cell = size / N;
  const cells = [];
  for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
    // Always-on finder squares in 3 corners
    const inFinder = (xs, ys) => (x>=xs && x<xs+3 && y>=ys && y<ys+3) || ((x===xs+1) && (y===ys+1));
    const f = inFinder(0,0) || inFinder(N-3,0) || inFinder(0,N-3);
    if (f) cells.push([x,y]);
    else if (rng() > 0.55) cells.push([x,y]);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.map(([x,y], i) => <rect key={i} x={x*cell} y={y*cell} width={cell+0.5} height={cell+0.5} fill="#1c1917"/>)}
    </svg>
  );
};

// Landscape variant — 1080×608. Used as a Twitter / OG share image.
const ShareableCardLandscape = ({ leader }) => {
  const L = leader;
  return (
    <div style={{
      width:1080, height:608, position:'relative',
      background:'#1c1917', color:'oklch(0.96 0.003 250)',
      fontFamily:'var(--font-sans)', overflow:'hidden',
      borderRadius:24, boxShadow:'0 30px 60px -20px rgba(0,0,0,0.45)',
    }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 80% 20%, oklch(0.45 0.18 250 / 0.5) 0%, transparent 50%), radial-gradient(ellipse at 10% 100%, oklch(0.45 0.20 27 / 0.25) 0%, transparent 55%)',
        pointerEvents:'none',
      }}/>

      <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:0, height:'100%' }}>
        {/* LEFT */}
        <div style={{ padding:'40px 44px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
              <FvMark size={32}/>
              <span style={{ fontWeight:800, fontSize:22, letterSpacing:'-0.02em' }}>Factivist</span>
            </div>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.12em', color:'oklch(0.75 0.01 270)', fontWeight:600 }}>REPORT CARD · 2026</span>
          </div>
          <div style={{ marginTop:8 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'oklch(0.78 0.16 250)', letterSpacing:'0.06em', fontWeight:700, marginBottom:8 }}>
              {L.role.toUpperCase()} · {L.term}
            </div>
            <div style={{ fontSize:54, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.02, textWrap:'balance' }}>{L.name}</div>
            <div style={{ marginTop:8, fontSize:18, color:'oklch(0.78 0.01 270)', display:'inline-flex', alignItems:'center', gap:8 }}>
              <span style={{ width:9, height:9, borderRadius:'50%', background:L.partyColor }}/>
              <span>{L.party}</span>
              <span>·</span>
              <span style={{ color:'#fff' }}>{L.constituency}</span>
            </div>
          </div>
          <div style={{
            marginTop:14, padding:'14px 18px', borderRadius:14,
            background:'oklch(0.22 0.005 270 / 0.6)', border:'1px solid oklch(0.30 0.006 270)',
            fontSize:15, lineHeight:1.55, color:'oklch(0.92 0.005 270)', textWrap:'pretty',
          }}>
            Attendance {L.attendance}% against a {L.attendanceAvg}% Lok Sabha average. 6 of 17 manifesto promises broken — including 24×7 water in Mahul–Chembur and the Sandhurst Road skywalk.
          </div>
          {/* footer row */}
          <div style={{ marginTop:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:72, height:72, borderRadius:12, background:'#fff', padding:8,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <QRBlock size={56}/>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.75 0.01 270)', letterSpacing:'0.06em' }}>OPEN THE FULL RECORD</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, marginTop:3 }}>factivist.in/l/{L.id}</div>
            </div>
            <div style={{ marginLeft:'auto', textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'oklch(0.62 0.01 270)', letterSpacing:'0.06em' }}>ANCHORED</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, marginTop:3, color:'oklch(0.85 0.14 145)' }}>0x9c2…ae1</div>
            </div>
          </div>
        </div>
        {/* RIGHT — grade panel */}
        <div style={{
          padding:'40px 44px',
          background:'oklch(0.13 0.005 270 / 0.55)',
          borderLeft:'1px solid oklch(0.28 0.005 270)',
          display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:14,
        }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'oklch(0.75 0.01 270)', letterSpacing:'0.08em' }}>CIVIC SCORE</div>
          <div style={{
            width:200, height:200, borderRadius:36,
            background:
              L.gradeTone === 'success' ? 'oklch(0.65 0.18 145)' :
              L.gradeTone === 'warning' ? 'oklch(0.78 0.16 75)'  :
              'oklch(0.62 0.22 27)',
            color: L.gradeTone === 'warning' ? '#1c1917' : '#fff',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:120, fontWeight:800, letterSpacing:'-0.06em', lineHeight:1,
            boxShadow:'0 20px 60px -10px currentColor',
          }}>{L.grade}</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:46, fontWeight:800, letterSpacing:'-0.03em' }}>
              {L.score}<span style={{ color:'oklch(0.55 0.01 270)', fontSize:22 }}>/100</span>
            </div>
            <div style={{ fontSize:13, color:'oklch(0.78 0.01 270)', marginTop:4 }}>{L.promisesBroken} of {L.promisesTotal} promises broken</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Artboard combining both card variants + share controls.
const ShareableReportCardArtboard = () => {
  const L = window.fvDataExtra.leaders[0];
  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Share</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Leader report card</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{L.constituency}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Copy link</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export PNG</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px', display:'flex', flexDirection:'column', gap:28 }}>
        <div>
          <Overline>Election-season share card</Overline>
          <h1 style={{ margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.025em' }}>
            One image. Every receipt.
          </h1>
          <p style={{ margin:'10px 0 0', maxWidth:680, fontSize:13.5, color:'var(--color-muted-foreground)', lineHeight:1.65 }}>
            WhatsApp-shaped portrait card (540×960) and a Twitter / OG landscape card (1080×608). Both link to the full anchored record and carry a scannable QR for off-app circulation. Designed for screenshots — no UI chrome included.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:36, alignItems:'flex-start' }}>
          <div>
            <Overline style={{ marginBottom:12 }}>Portrait · WhatsApp / Instagram story</Overline>
            <ShareableCardPortrait leader={L}/>
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <Btn variant="bordered" tone="default" size="sm" icon={<I.Link style={{ width:12, height:12 }}/>}>WhatsApp</Btn>
              <Btn variant="bordered" tone="default" size="sm">Instagram</Btn>
              <Btn variant="ghost" size="sm">Download</Btn>
            </div>
          </div>

          <div>
            <Overline style={{ marginBottom:12 }}>Landscape · Twitter / open graph</Overline>
            <ShareableCardLandscape leader={L}/>
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <Btn variant="bordered" tone="default" size="sm">Twitter / X</Btn>
              <Btn variant="bordered" tone="default" size="sm">LinkedIn</Btn>
              <Btn variant="ghost" size="sm">Download</Btn>
            </div>

            <div style={{ marginTop:24, padding:'18px 20px', borderRadius:14, background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <I.Sparkles style={{ width:14, height:14, color:'var(--color-brand-600)' }}/>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--color-brand-900)' }}>What changes when you share</span>
              </div>
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:5, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.6 }}>
                <li>· The card is generated from the anchored record — never edited locally. Every metric is verifiable.</li>
                <li>· The QR resolves to the full report card with a one-time anti-spoof seal.</li>
                <li>· Share counts are aggregated but never tied to your nullifier.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ShareableCardPortrait, ShareableCardLandscape, ShareableReportCardArtboard, QRBlock });
