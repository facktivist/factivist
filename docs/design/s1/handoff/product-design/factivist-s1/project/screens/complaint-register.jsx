// Factivist — Complaint Registration (desktop)
// 4-step flow on one screen with sticky progress rail + content panel.
//   01 Category & severity
//   02 Title & body
//   03 Evidence & location
//   04 Review & anchor

const STEP_TITLES = [
  'Category & severity',
  'Tell us what happened',
  'Evidence & location',
  'Review & anchor',
];

const SeverityCard = ({ level, label, sub, selected, onPick }) => {
  const tones = {
    Low:      { bg:'var(--color-success-50)', fg:'var(--color-success-800)', dot:'var(--color-success-500)' },
    Medium:   { bg:'var(--color-warning-50)', fg:'var(--color-warning-900)', dot:'var(--color-warning-500)' },
    High:     { bg:'var(--color-danger-50)',  fg:'var(--color-danger-800)',  dot:'var(--color-danger-500)'  },
    Critical: { bg:'var(--color-danger-100)', fg:'var(--color-danger-900)',  dot:'var(--color-danger-600)'  },
  }[label];
  const isSel = selected === label;
  return (
    <button onClick={() => onPick(label)} style={{
      textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      padding:'14px 16px', borderRadius:14,
      background: isSel ? tones.bg : 'var(--color-card)',
      border:'2px solid ' + (isSel ? tones.dot : 'var(--color-border)'),
      display:'flex', flexDirection:'column', gap:6,
      transition:'all 0.15s var(--ease-standard)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background:tones.dot }}/>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--color-foreground)' }}>{label}</span>
        <span style={{
          marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10,
          color:'var(--color-muted-foreground)', letterSpacing:'0.04em',
        }}>L{level}</span>
      </div>
      <div style={{ fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.5 }}>{sub}</div>
    </button>
  );
};

const ProgressRail = ({ step, onJump }) => (
  <div style={{
    position:'sticky', top:24,
    padding:'4px 0',
    display:'flex', flexDirection:'column', gap:4,
  }}>
    <Overline style={{ marginBottom:14 }}>File a complaint</Overline>
    {STEP_TITLES.map((label, i) => {
      const state = i < step ? 'done' : i === step ? 'current' : 'pending';
      return (
        <button key={i} onClick={() => onJump(i)} disabled={i > step} style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 14px', borderRadius:12,
          background: state === 'current' ? 'var(--color-card)' : 'transparent',
          border: '1px solid ' + (state === 'current' ? 'var(--color-border)' : 'transparent'),
          cursor: i <= step ? 'pointer' : 'default',
          fontFamily:'inherit', textAlign:'left',
          opacity: state === 'pending' ? 0.6 : 1,
        }}>
          <span style={{
            width:24, height:24, borderRadius:'50%', flexShrink:0,
            background: state === 'done' ? 'var(--color-brand-500)'
                      : state === 'current' ? 'var(--color-foreground)'
                      : 'var(--color-gray-200)',
            color: state === 'done' || state === 'current' ? 'var(--color-background)'
                  : 'var(--color-gray-700)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)',
          }}>
            {state === 'done' ? <I.Check style={{width:11,height:11}}/> : i+1}
          </span>
          <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>
            <span style={{
              fontFamily:'var(--font-mono)', fontSize:10,
              color:'var(--color-muted-foreground)', letterSpacing:'0.06em',
            }}>STEP {String(i+1).padStart(2,'0')}</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', marginTop:1 }}>{label}</span>
          </div>
        </button>
      );
    })}
    <div style={{ marginTop:14, padding:'12px 14px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <I.Lock style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
        <span style={{ fontSize:12, fontWeight:600 }}>Anonymous draft</span>
      </div>
      <div style={{ fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
        Encrypted to your phone until you anchor on chain. Nothing leaves until step 04.
      </div>
    </div>
  </div>
);

const FieldLabel = ({ children, required, sub }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)' }}>{children}</span>
      {required && <span style={{ fontSize:11, color:'var(--color-danger-600)', fontWeight:700 }}>·</span>}
    </div>
    {sub && <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:3, lineHeight:1.5 }}>{sub}</div>}
  </div>
);

const Input = ({ value, onChange, placeholder, multiline=false, rows=3 }) => {
  const baseStyle = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:'1px solid var(--color-border)', background:'var(--color-card)',
    color:'var(--color-foreground)', fontFamily:'inherit', fontSize:14, lineHeight:1.55,
    outline:'none', boxSizing:'border-box', resize:'vertical',
  };
  if (multiline) {
    return <textarea value={value} onChange={(e)=>onChange?.(e.target.value)} placeholder={placeholder} rows={rows} style={baseStyle}/>;
  }
  return <input value={value} onChange={(e)=>onChange?.(e.target.value)} placeholder={placeholder} style={baseStyle}/>;
};

// ─── Step 1 — Category & Severity ─────────────────────────────────
const CategoryGrid = ({ value, onPick }) => {
  const cats = window.fvDataExtra.categoriesFull;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
      {cats.map(c => {
        const isSel = value === c.id;
        const IconC = I[c.icon] || I.FileText;
        return (
          <button key={c.id} onClick={() => onPick(c.id)} style={{
            display:'flex', alignItems:'flex-start', gap:12,
            padding:'14px 14px', borderRadius:12,
            background: isSel ? 'var(--color-brand-50)' : 'var(--color-card)',
            border:'1.5px solid ' + (isSel ? 'var(--color-brand-500)' : 'var(--color-border)'),
            cursor:'pointer', fontFamily:'inherit', textAlign:'left',
            transition:'all 0.15s var(--ease-standard)',
          }}>
            <div style={{
              width:30, height:30, borderRadius:8, flexShrink:0,
              background: isSel ? 'var(--color-brand-500)' : 'var(--color-muted)',
              color: isSel ? '#fff' : 'var(--color-foreground)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><IconC style={{ width:15, height:15 }}/></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.3 }}>{c.label}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4, lineHeight:1.5 }}>{c.examples}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const Step1 = ({ d, setD }) => (
  <>
    <FieldLabel required>Pick a category</FieldLabel>
    <CategoryGrid value={d.category} onPick={(v)=>setD({ ...d, category: v })}/>
    <div style={{ marginTop:24 }}>
      <FieldLabel required sub="Higher severity is reviewed faster and routed to specialised verifier pools. Be honest — exaggeration is moderated.">Severity</FieldLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <SeverityCard level={1} label="Low"      sub="Inconvenience. No imminent harm."             selected={d.severity} onPick={(v)=>setD({ ...d, severity:v })}/>
        <SeverityCard level={2} label="Medium"   sub="Material loss or service denial."             selected={d.severity} onPick={(v)=>setD({ ...d, severity:v })}/>
        <SeverityCard level={3} label="High"     sub="Statutory violation or safety risk."          selected={d.severity} onPick={(v)=>setD({ ...d, severity:v })}/>
        <SeverityCard level={4} label="Critical" sub="Threat to life, liberty, or systemic harm."  selected={d.severity} onPick={(v)=>setD({ ...d, severity:v })}/>
      </div>
    </div>
  </>
);

// ─── Step 2 — Title & Body ─────────────────────────────────────────
const Step2 = ({ d, setD }) => {
  const wc = (d.body || '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <>
      <FieldLabel required sub="One sentence the platform can carry into a headline. No names of victims, no caste, no slurs.">Headline</FieldLabel>
      <Input value={d.title} onChange={(v)=>setD({ ...d, title:v })} placeholder="What happened, in one line"/>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--color-muted-foreground)' }}>
        <span>{d.title.length}/140 characters</span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:'var(--color-success-700)' }}>
          <I.Check style={{ width:11, height:11 }}/> Llama Guard pre-check: clean
        </span>
      </div>

      <div style={{ marginTop:24 }}>
        <FieldLabel required sub="Tell the story: when, where, who was involved (by role, not victim names). Cite section / case law if you know it.">Full account</FieldLabel>
        <Input value={d.body} onChange={(v)=>setD({ ...d, body:v })} placeholder="Walk us through what happened, in order." multiline rows={10}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--color-muted-foreground)' }}>
          <span>{wc} words · ~{Math.max(1, Math.round(wc/220))} min read</span>
          <span>Markdown supported · citations auto-detected</span>
        </div>
      </div>

      {/* AI assist callout */}
      <div style={{
        marginTop:20, padding:'14px 16px',
        background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)', borderRadius:12,
        display:'flex', gap:14, alignItems:'flex-start',
      }}>
        <div style={{
          width:32, height:32, borderRadius:10, flexShrink:0,
          background:'var(--color-brand-500)', color:'#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.Sparkles style={{ width:15, height:15 }}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--color-brand-900)' }}>AI structure assist</div>
          <div style={{ fontSize:12, color:'var(--color-brand-900)', marginTop:4, lineHeight:1.55 }}>
            Found <strong>3 citations</strong> in your draft (§154(3) CrPC, Lalita Kumari 2013, RTI Act §6).
            Want me to format them as a precedent block at the end?
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <Btn variant="solid" tone="primary" size="sm">Yes, format</Btn>
            <Btn variant="ghost" size="sm">No thanks</Btn>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Step 3 — Evidence & Location ──────────────────────────────────
const EvidenceRow = ({ a }) => {
  const iconMap = { Audio:'Megaphone', Image:'MapPin', PDF:'FileText', Video:'FileText' };
  const IconC = I[iconMap[a.kind]] || I.FileText;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'10px 12px', borderRadius:10,
      border:'1px solid var(--color-border)', background:'var(--color-card)',
    }}>
      <div style={{
        width:32, height:32, borderRadius:8, flexShrink:0,
        background:'var(--color-muted)', color:'var(--color-brand-600)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><IconC style={{ width:14, height:14 }}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>{a.label}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>{a.size}</span>
        </div>
        <div style={{ fontSize:11, color: a.stripping ? 'var(--color-warning-700)' : 'var(--color-success-700)', marginTop:3, display:'inline-flex', alignItems:'center', gap:5 }}>
          {a.stripping
            ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-warning-500)' }}/> Stripping metadata…</>
            : <><I.Check style={{ width:11, height:11 }}/> EXIF stripped on device</>}
        </div>
      </div>
      <button style={{
        width:28, height:28, borderRadius:8, border:'1px solid var(--color-border)',
        background:'var(--color-card)', cursor:'pointer',
        color:'var(--color-muted-foreground)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><I.X style={{ width:13, height:13 }}/></button>
    </div>
  );
};

const Step3 = ({ d, setD }) => (
  <>
    <FieldLabel sub="Audio, video, photos, RTI replies, FIR copies. We strip EXIF, location and device tags on-device before anchoring.">Evidence</FieldLabel>
    <div style={{
      padding:'24px 18px', borderRadius:14,
      border:'2px dashed var(--color-border)', background:'var(--color-muted)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:8, textAlign:'center',
    }}>
      <div style={{
        width:40, height:40, borderRadius:12,
        background:'var(--color-card)', border:'1px solid var(--color-border)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        color:'var(--color-brand-600)',
      }}><I.Paperclip style={{ width:18, height:18 }}/></div>
      <div style={{ fontSize:13, fontWeight:600 }}>Drag files in, or pick from device</div>
      <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>Up to 12 attachments · 25 MB each · auto-stripped before upload</div>
      <Btn variant="bordered" tone="default" size="sm" icon={<I.Paperclip style={{ width:12, height:12 }}/>}>Choose files</Btn>
    </div>

    <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
      {d.attachments.map(a => <EvidenceRow key={a.label} a={a}/>)}
    </div>

    <div style={{ marginTop:24 }}>
      <FieldLabel sub="We use only your state + pincode for routing. Exact location is never published, only used to verify you're in the constituency.">Location · routing only</FieldLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginBottom:5 }}>Pincode</div>
          <Input value={d.location.pincode} onChange={(v)=>setD({ ...d, location:{...d.location, pincode:v}})}/>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginBottom:5 }}>Ward / locality</div>
          <Input value={d.location.ward} onChange={(v)=>setD({ ...d, location:{...d.location, ward:v}})}/>
        </div>
      </div>
      <div style={{
        marginTop:12, padding:'12px 14px', background:'var(--color-card)',
        border:'1px solid var(--color-border)', borderRadius:12,
        display:'flex', alignItems:'center', gap:12,
      }}>
        <I.MapPin style={{ width:16, height:16, color:'var(--color-brand-600)' }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:'var(--color-foreground)' }}>
            Routing to <strong>{d.location.constituency}</strong> · <strong>{d.location.state}</strong>
          </div>
          <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:2 }}>
            Resolved from pincode {d.location.pincode}. Edit if wrong.
          </div>
        </div>
      </div>
    </div>

    <div style={{ marginTop:24 }}>
      <FieldLabel sub="Tag the people or institutions you are accusing. Each tag creates or updates a POI dossier — verified citizens cross-check the linkage.">Accused parties</FieldLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {d.accused.map((a,i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 12px', borderRadius:10,
            background:'var(--color-card)', border:'1px solid var(--color-border)',
          }}>
            <Chip tone="danger" sm bordered>{a.kind}</Chip>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)' }}>{a.name}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>
                {a.badge || a.role || a.org}
                {a.poi && <span style={{ marginLeft:8, color:'var(--color-brand-700)', fontFamily:'var(--font-mono)' }}>· {a.poi}</span>}
              </div>
            </div>
            {a.poi && (
              <Chip tone="primary" sm>
                <I.Link style={{ width:11, height:11, marginRight:5 }}/>
                linked POI
              </Chip>
            )}
            <button style={{
              width:28, height:28, borderRadius:8, border:'1px solid var(--color-border)',
              background:'var(--color-card)', cursor:'pointer',
              color:'var(--color-muted-foreground)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.X style={{ width:13, height:13 }}/></button>
          </div>
        ))}
        <button style={{
          padding:'10px 12px', borderRadius:10,
          border:'1px dashed var(--color-border)', background:'transparent',
          cursor:'pointer', fontFamily:'inherit',
          color:'var(--color-brand-700)', fontSize:12, fontWeight:600,
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <I.Plus style={{ width:12, height:12 }}/>
          Tag another person, office or company
        </button>
      </div>
    </div>
  </>
);

// ─── Step 4 — Review & Anchor ──────────────────────────────────────
const Step4 = ({ d }) => {
  const cat = window.fvDataExtra.categoriesFull.find(c => c.id === d.category);
  return (
    <>
      <div style={{
        padding:'18px 20px', borderRadius:14,
        background:'var(--color-card)', border:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
          <Chip tone="danger" bordered sm>{cat?.label} · {d.subCategory}</Chip>
          <Chip tone="warning" bordered sm>{d.severity}</Chip>
          <Chip tone="default" bordered sm>{d.location.constituency}</Chip>
        </div>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.015em', lineHeight:1.3, color:'var(--color-foreground)' }}>
          {d.title}
        </div>
        <div style={{ fontSize:13, color:'var(--color-gray-700)', marginTop:12, lineHeight:1.65, whiteSpace:'pre-line', textWrap:'pretty' }}>
          {d.body}
        </div>
        <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:14, fontSize:11, color:'var(--color-muted-foreground)' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <I.Paperclip style={{ width:11, height:11 }}/>
            {d.attachments.length} attachments
          </span>
          <span>·</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <I.MapPin style={{ width:11, height:11 }}/>
            {d.location.ward}
          </span>
          <span>·</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <I.Flash style={{ width:11, height:11 }}/>
            {d.accused.length} accused parties
          </span>
        </div>
      </div>

      {/* Pre-anchor checklist */}
      <div style={{ marginTop:20 }}>
        <FieldLabel sub="Before we anchor the hash on Polygon, confirm each:">Anchor checklist</FieldLabel>
        {[
          'I have first-hand knowledge or documentary evidence for what I am claiming.',
          'I have not named victims, minors, or revealed caste/community identifiers.',
          'I understand that anchored complaints are immutable and cannot be deleted.',
          'I have read and accept the Citizen Charter and moderation rules.',
        ].map((t, i) => (
          <label key={i} style={{
            display:'flex', alignItems:'flex-start', gap:10,
            padding:'10px 12px', borderRadius:10,
            background:'var(--color-card)', border:'1px solid var(--color-border)',
            marginBottom:6, cursor:'pointer',
          }}>
            <span style={{
              width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
              background:'var(--color-brand-500)', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.Check style={{ width:11, height:11 }}/></span>
            <span style={{ fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.55 }}>{t}</span>
          </label>
        ))}
      </div>

      {/* Anchor box */}
      <div style={{
        marginTop:20, padding:'18px 20px', borderRadius:14,
        background:'var(--color-gray-950)', color:'var(--color-gray-100)',
        border:'1px solid var(--color-gray-800)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <I.ShieldFill style={{ width:14, height:14, color:'oklch(0.78 0.16 145)' }}/>
          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', letterSpacing:'0.06em', color:'oklch(0.78 0.16 145)' }}>READY TO ANCHOR</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.65 }}>
          <div>
            <div style={{ color:'oklch(0.62 0.012 270)' }}>complaint hash</div>
            <div>h7Hw2x…q8K1</div>
          </div>
          <div>
            <div style={{ color:'oklch(0.62 0.012 270)' }}>nullifier (you)</div>
            <div>n4Fk2c…m8j2</div>
          </div>
          <div>
            <div style={{ color:'oklch(0.62 0.012 270)' }}>chain</div>
            <div>Polygon zkEVM · block ~71.2M</div>
          </div>
          <div>
            <div style={{ color:'oklch(0.62 0.012 270)' }}>estimated gas</div>
            <div>0.00 (sponsored)</div>
          </div>
        </div>
      </div>
    </>
  );
};

const ComplaintRegister = ({ initialStep = 0 }) => {
  const [step, setStep] = React.useState(initialStep);
  const [d, setD] = React.useState(window.fvDataExtra.draftComplaint);

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Submit</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>New complaint</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm">Save draft</Btn>
          <Btn variant="ghost" size="sm" icon={<I.X style={{width:13,height:13}}/>}>Discard</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px', display:'grid', gridTemplateColumns:'260px minmax(0,1fr)', gap:32 }}>
        <ProgressRail step={step} onJump={setStep}/>

        <div>
          <div style={{ marginBottom:18 }}>
            <Overline>Step {String(step+1).padStart(2,'0')} of 04</Overline>
            <h1 style={{
              margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.15,
              textWrap:'balance', color:'var(--color-foreground)',
            }}>
              {STEP_TITLES[step]}
            </h1>
          </div>

          <Card pad={26}>
            {step === 0 && <Step1 d={d} setD={setD}/>}
            {step === 1 && <Step2 d={d} setD={setD}/>}
            {step === 2 && <Step3 d={d} setD={setD}/>}
            {step === 3 && <Step4 d={d}/>}
          </Card>

          <div style={{ marginTop:18, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <Btn variant="ghost" size="md" disabled={step===0}
                 onClick={()=>setStep(Math.max(0, step-1))}
                 icon={<span style={{ transform:'rotate(180deg)', display:'inline-flex' }}><I.ChevronR style={{ width:14, height:14 }}/></span>}>
              Previous
            </Btn>
            {step < 3
              ? <Btn variant="solid" tone="primary" size="md" onClick={()=>setStep(step+1)} iconRight={<I.ChevronR style={{ width:14, height:14 }}/>}>Continue</Btn>
              : <Btn variant="solid" tone="primary" size="md" icon={<I.ShieldFill style={{ width:14, height:14 }}/>}>Anchor on chain</Btn>}
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ComplaintRegister });
