// Factivist — Landing / marketing page (pre-verify)
// One scroll: hero · how it works · proof · privacy story · CTA.
// Editorial, civic-serious. No emoji.

const FvWordmark = ({ size = 36, light = false }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
    <FvMark size={size}/>
    <span style={{
      fontFamily:'var(--font-sans)', fontWeight:800, letterSpacing:'-0.025em',
      fontSize: Math.round(size * 0.68), color: light ? '#fff' : 'var(--color-foreground)',
    }}>Factivist</span>
  </div>
);

// Mini bar
const TickerRow = ({ items }) => (
  <div style={{
    display:'flex', gap:0, overflow:'hidden',
    borderTop:'1px solid var(--color-border)',
    borderBottom:'1px solid var(--color-border)',
  }}>
    {items.map((t, i) => (
      <div key={i} style={{
        flex:1, padding:'10px 14px', display:'flex', alignItems:'center', gap:8,
        borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
        background: 'var(--color-card)',
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background: t.tone || 'var(--color-success-500)', flexShrink:0 }}/>
        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>{t.label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', marginLeft:'auto' }}>{t.value}</span>
      </div>
    ))}
  </div>
);

const LandingScreen = () => {
  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      {/* Nav */}
      <nav style={{
        padding:'18px 32px', display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'1px solid var(--color-border)',
        background:'var(--fv-landing-nav-bg, rgba(246,244,239,0.92))', backdropFilter:'saturate(180%) blur(8px)',
        position:'sticky', top:0, zIndex:5,
      }}>
        <FvWordmark size={28}/>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {['How it works','Report cards','For press','Charter','Whitepaper'].map(l => (
            <a key={l} href="#" style={{
              padding:'8px 12px', borderRadius:9999, fontFamily:'inherit',
              fontSize:13, fontWeight:500, color:'var(--color-foreground)',
              textDecoration:'none',
            }}>{l}</a>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm">Sign in</Btn>
          <Btn variant="solid" tone="primary" size="sm" iconRight={<I.ChevronR style={{width:13,height:13}}/>}>Get the app</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding:'72px 32px 56px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:48, alignItems:'center' }}>
          <div>
            <Chip tone="primary" bordered>
              <I.ShieldFill style={{width:11,height:11, marginRight:6}}/>
              Anonymous · verified · anchored on-chain
            </Chip>
            <h1 style={{
              margin:'18px 0 0', fontSize:64, lineHeight:1.02, letterSpacing:'-0.035em',
              fontWeight:800, color:'var(--color-foreground)', textWrap:'balance',
            }}>
              The record<br/>
              <span style={{ color:'var(--color-brand-600)' }}>politicians can't ignore.</span>
            </h1>
            <p style={{
              margin:'22px 0 0', maxWidth:560,
              fontSize:18, lineHeight:1.6, color:'var(--color-gray-700)',
              textWrap:'pretty',
            }}>
              Factivist is a decentralised, Aadhaar-verified, tamper-proof platform where Indian citizens
              file civic complaints, endorse each other's, and grade the people elected to fix them — all
              without ever revealing who they are.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:30 }}>
              <Btn variant="solid" tone="primary" size="lg" iconRight={<I.ChevronR style={{width:15,height:15}}/>}>Verify with Aadhaar</Btn>
              <Btn variant="bordered" tone="default" size="lg" icon={<I.FileText style={{width:14,height:14}}/>}>Read the charter</Btn>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:18, marginTop:24, fontSize:12, color:'var(--color-muted-foreground)' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <I.Lock style={{width:13,height:13}}/>
                Aadhaar never leaves your phone
              </span>
              <span>·</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <I.ShieldFill style={{width:13,height:13}}/>
                Open-source · audited Apr 2026
              </span>
            </div>
          </div>

          {/* Hero card stack */}
          <div style={{ position:'relative', height:460 }}>
            {/* Complaint card */}
            <div style={{
              position:'absolute', right:0, top:0, width:380,
              background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:18,
              padding:18, boxShadow:'0 24px 40px -16px rgba(28,25,23,0.18)',
              transform:'rotate(-2deg)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Avatar handle="citizen-K4L2M0" size={28}/>
                <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>citizen-K4L2M0</div>
                <span style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:4, color:'var(--color-success-700)', fontSize:11, fontWeight:600 }}>
                  <I.ShieldFill style={{width:11,height:11}}/>
                  Anchored
                </span>
              </div>
              <Chip tone="danger" sm>Police misconduct</Chip>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--color-foreground)', marginTop:10, lineHeight:1.4 }}>
                FIR refused at Powai station for complaint against local builder
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, fontSize:11, color:'var(--color-muted-foreground)' }}>
                <I.MapPin style={{width:11,height:11}}/>
                <span>Powai · Mumbai South</span>
                <span>·</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                  <I.ArrowUp style={{width:11,height:11, color:'var(--color-brand-600)'}}/>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--color-foreground)' }}>412</span>
                </span>
              </div>
            </div>

            {/* Report card */}
            <div style={{
              position:'absolute', left:0, top:130, width:340,
              background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:18,
              padding:18, boxShadow:'0 24px 40px -16px rgba(28,25,23,0.18)',
              transform:'rotate(1.5deg)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <Chip tone="default" sm bordered>MP · Lok Sabha</Chip>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>2024 – present</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6 }}>
                <GradeBadge grade="C+" tone="warning"/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.2 }}>Anant V. Kulkarni</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>Mumbai South · Maharashtra</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:14 }}>
                {[
                  { v:'38%', l:'attendance', t:'danger' },
                  { v:'47d',  l:'response',   t:'warning' },
                  { v:'6/17', l:'broken',     t:'danger' },
                ].map((m,i) => (
                  <div key={i} style={{
                    padding:'8px 10px', background:'var(--color-muted)',
                    border:'1px solid var(--color-border)', borderRadius:8,
                  }}>
                    <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em',
                      color: m.t==='danger' ? 'var(--color-danger-700)' : 'var(--color-warning-700)' }}>{m.v}</div>
                    <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:2 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anchor receipt */}
            <div style={{
              position:'absolute', right:30, bottom:0, width:260,
              background:'var(--color-gray-950)', color:'var(--color-gray-100)',
              border:'1px solid var(--color-gray-800)', borderRadius:16,
              padding:14, boxShadow:'0 24px 40px -16px rgba(28,25,23,0.30)',
              transform:'rotate(2deg)',
              fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.65,
            }}>
              <div style={{ color:'var(--color-success-400)', display:'inline-flex', alignItems:'center', gap:6, fontSize:10, letterSpacing:'0.06em', fontWeight:600 }}>
                <I.ShieldFill style={{width:11,height:11}}/>
                ON-CHAIN RECEIPT
              </div>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:3 }}>
                <span style={{ color:'var(--color-gray-500)' }}>tx</span>
                <span>0x4ae9d3…f2c3</span>
                <span style={{ color:'var(--color-gray-500)', marginTop:6 }}>state-hash</span>
                <span>h7Hw2x…q8K1</span>
                <span style={{ color:'var(--color-gray-500)', marginTop:6 }}>polygon · block 71,184,200</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat ticker */}
      <TickerRow items={[
        { label:'COMPLAINTS · LIFETIME', value:'1,42,488', tone:'var(--color-brand-500)' },
        { label:'VERIFIED CITIZENS',      value:'1,84,212', tone:'var(--color-success-500)' },
        { label:'ANCHORED ON POLYGON',    value:'1,18,940', tone:'var(--color-success-500)' },
        { label:'LEADERS GRADED',         value:'2,418',    tone:'var(--color-warning-500)' },
        { label:'CONSTITUENCIES',         value:'543 LS / 4,182 AS', tone:'var(--color-brand-500)' },
      ]}/>

      {/* How it works */}
      <section style={{ padding:'72px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 44px' }}>
          <Overline>How it works</Overline>
          <h2 style={{
            margin:'10px 0 0', fontSize:36, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1,
            textWrap:'balance',
          }}>
            From one phone in a tier-3 town<br/>to a record the State has to read.
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
          {[
            { n:'01', t:'Verify in private', d:'Aadhaar QR is read on-device. A zero-knowledge proof tells us you are real, 18+, and unique — never who you are.', icon:'ShieldFill', tone:'brand' },
            { n:'02', t:'File a complaint',  d:'Pick a category, draft the facts. Attach an FIR copy, an RTI reply, a photo. We strip metadata before publishing.', icon:'FileText', tone:'foreground' },
            { n:'03', t:'Endorse · debate',  d:'Other verified citizens endorse if they have first-hand knowledge. Llama Guard moderates against caste/communal abuse.', icon:'MessageSq', tone:'foreground' },
            { n:'04', t:'Hold leaders accountable', d:'Aggregated, anchored, summarised into report cards that grade every MP and MLA on what their constituency actually says.', icon:'Ranking', tone:'foreground' },
          ].map((s,i) => {
            const IconC = I[s.icon];
            return (
              <div key={s.n} style={{
                padding:'22px 22px 26px', background:'var(--color-card)',
                border:'1px solid var(--color-border)', borderRadius:16,
                display:'flex', flexDirection:'column', gap:14,
                position:'relative', overflow:'hidden',
              }}>
                {i === 0 && <div style={{
                  position:'absolute', inset:0,
                  background:'linear-gradient(160deg, var(--color-brand-50) 0%, transparent 60%)',
                  pointerEvents:'none',
                }}/>}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  position:'relative',
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:12,
                    background: s.tone === 'brand' ? 'var(--color-brand-500)' : 'var(--color-foreground)',
                    color: 'var(--color-background)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <IconC style={{width:20,height:20}}/>
                  </div>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:11,
                    color:'var(--color-muted-foreground)', letterSpacing:'0.06em',
                  }}>{s.n}</span>
                </div>
                <div style={{ position:'relative' }}>
                  <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.2 }}>{s.t}</div>
                  <p style={{ margin:'8px 0 0', fontSize:13, lineHeight:1.6, color:'var(--color-gray-700)' }}>{s.d}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy story */}
      <section style={{
        background:'var(--color-gray-950)', color:'var(--color-gray-50)',
        padding:'88px 32px', position:'relative', overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:0,
          background:
            'radial-gradient(ellipse at 30% 20%, oklch(0.30 0.16 250 / 0.4) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at 70% 80%, oklch(0.25 0.10 250 / 0.3) 0%, transparent 50%)',
          pointerEvents:'none',
        }}/>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:48, position:'relative', alignItems:'center' }}>
          <div>
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-brand-400)', letterSpacing:'0.06em', fontWeight:600 }}>THE PRIVACY PROMISE</span>
            <h2 style={{ margin:'12px 0 0', fontSize:42, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
              The State cannot subpoena what we do not store.
            </h2>
            <p style={{ margin:'20px 0 0', fontSize:16, lineHeight:1.65, color:'var(--color-gray-300)', textWrap:'pretty' }}>
              Every complaint is hashed and anchored on Polygon before it shows up in your feed.
              Your identity stays in a Groth16 proof that proves uniqueness without revealing it.
              We don't have a backend that can be raided.
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:'28px 0 0', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                'IPFS-hosted complaint payloads — no central server holds the originals',
                'EXIF / metadata stripped from uploads on-device, not server-side',
                'Phone numbers, emails, real names — collected nowhere, not even encrypted',
                'Source code audited by Trail of Bits and Chaitin Tech, Apr 2026',
              ].map((t,i) => (
                <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:14 }}>
                  <I.Check style={{width:16,height:16, color:'var(--color-brand-400)', flexShrink:0, marginTop:2}}/>
                  <span style={{ color:'var(--color-gray-200)' }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Privacy diagram */}
          <div style={{
            padding:24, borderRadius:20,
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.08)',
            backdropFilter:'blur(8px)',
          }}>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-gray-500)', letterSpacing:'0.06em', marginBottom:14 }}>
              ZKP FLOW · ONE COMPLAINT
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { l:'1. Citizen drafts complaint', d:'Body, attachments, category. Local only.', live:true },
                { l:'2. Identity proof attached', d:'Aadhaar nullifier hash · proves unique, not who', live:true },
                { l:'3. Metadata stripped',       d:'EXIF, location, device, time-zone',  live:true },
                { l:'4. Encrypted blob → IPFS',   d:'CID emitted. Body never enters our servers.',  live:true },
                { l:'5. CID + nullifier anchored', d:'tx 0x4ae9d3…f2c3 · Polygon block 71,184,200', live:true },
                { l:'6. Indexed in feed',        d:'Surface in app · endorsements aggregate', live:true },
              ].map((step, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'10px 14px',
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.06)',
                  borderRadius:10,
                }}>
                  <span style={{
                    width:8, height:8, borderRadius:'50%',
                    background: step.live ? 'var(--color-success-500)' : 'var(--color-gray-700)',
                    boxShadow: step.live ? '0 0 8px var(--color-success-500)' : 'none',
                    flexShrink:0,
                  }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--color-gray-100)' }}>{step.l}</div>
                    <div style={{ fontSize:11, color:'var(--color-gray-500)', marginTop:2, fontFamily:'var(--font-mono)' }}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured grades */}
      <section style={{ padding:'72px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, gap:12 }}>
          <div>
            <Overline>Report cards · updated weekly</Overline>
            <h2 style={{ margin:'10px 0 0', fontSize:36, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1 }}>
              Where your constituency stands.
            </h2>
          </div>
          <Btn variant="bordered" tone="default" size="md" iconRight={<I.ChevronR style={{width:13,height:13}}/>}>Browse 2,418 leaders</Btn>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {window.fvDataExtra.leaders.map(l => (
            <div key={l.id} style={{
              padding:'18px', background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:16,
              display:'flex', flexDirection:'column', gap:12,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Chip tone="default" sm bordered>{l.role}</Chip>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'var(--color-gray-800)' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:l.partyColor }}/>
                  {l.party}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <GradeBadge grade={l.grade} tone={l.gradeTone}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.2 }}>{l.name}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{l.constituency} · {l.state}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  { v: l.attendance+'%', label:'attend.' },
                  { v: l.responseTimeDays+'d', label:'respond' },
                  { v: l.promisesBroken+'/'+l.promisesTotal, label:'broken' },
                ].map((m,i) => (
                  <div key={i} style={{
                    padding:'7px 8px', background:'var(--color-muted)',
                    border:'1px solid var(--color-border)', borderRadius:8, textAlign:'center',
                  }}>
                    <div style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>{m.v}</div>
                    <div style={{ fontSize:9, color:'var(--color-muted-foreground)', marginTop:2, letterSpacing:'0.04em', textTransform:'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'8px 32px 96px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{
          padding:'56px 56px',
          borderRadius:24,
          background:'linear-gradient(160deg, var(--color-brand-600) 0%, var(--color-brand-800) 100%)',
          color:'#fff', position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', inset:0,
            background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.18) 0%, transparent 50%)',
            pointerEvents:'none',
          }}/>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:32, alignItems:'center' }}>
            <div>
              <span style={{ fontSize:11, fontFamily:'var(--font-mono)', letterSpacing:'0.08em', opacity:0.75 }}>SEASON 1 · OPEN BETA</span>
              <h2 style={{ margin:'10px 0 0', fontSize:42, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
                One citizen, one voice, one anchored record.
              </h2>
              <p style={{ margin:'16px 0 0', fontSize:15, lineHeight:1.6, opacity:0.85, maxWidth:560 }}>
                Verify in under a minute. No name, no email, no phone number — just an anonymous handle and the right to file, endorse, and grade.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button style={{
                padding:'14px 18px', borderRadius:14, border:0, cursor:'pointer', fontFamily:'inherit',
                background:'#fff', color:'var(--color-brand-700)',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                fontSize:14, fontWeight:700,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
                  <I.ShieldFill style={{width:16,height:16}}/>
                  Get the Android app
                </span>
                <I.ChevronR style={{width:14,height:14}}/>
              </button>
              <button style={{
                padding:'14px 18px', borderRadius:14, border:'1px solid rgba(255,255,255,0.30)', cursor:'pointer', fontFamily:'inherit',
                background:'transparent', color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                fontSize:14, fontWeight:600,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
                  <I.FileText style={{width:16,height:16}}/>
                  Get press credentials
                </span>
                <I.ChevronR style={{width:14,height:14}}/>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop:'1px solid var(--color-border)', padding:'28px 32px',
        background:'var(--color-card)',
      }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, flexWrap:'wrap' }}>
          <FvWordmark size={22}/>
          <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--color-muted-foreground)' }}>
            {['Charter','Whitepaper','GitHub','Trust report','Contact','© 2026 Factivist Foundation, Pune'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

Object.assign(window, { LandingScreen });
