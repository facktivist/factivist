// Factivist UI kit — Submit flow and Profile / Report card screens

const { useState: useS2 } = React;

const Stepper = ({ step }) => {
  const steps = ['Category', 'Details', 'Evidence', 'Review'];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{
              width:24, height:24, borderRadius:'50%',
              background: i<step ? 'var(--color-brand-500)' : i===step ? 'var(--color-brand-100)' : 'var(--color-gray-200)',
              color: i<step ? '#fff' : i===step ? 'var(--color-brand-800)' : 'var(--color-gray-600)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:600, border: i===step?'2px solid var(--color-brand-500)':'none',
            }}>
              {i<step ? <I.Check style={{width:12,height:12}}/> : (i+1)}
            </span>
            <span style={{
              fontSize:13, fontWeight: i===step?600:500,
              color: i<=step ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            }}>{s}</span>
          </div>
          {i<steps.length-1 && <span style={{ flex:1, height:1, background: i<step?'var(--color-brand-500)':'var(--color-border)' }}/>}
        </React.Fragment>
      ))}
    </div>
  );
};

const SubmitScreen = ({ categories, onClose, onPublish }) => {
  const [step, setStep] = useS2(0);
  const [cat, setCat] = useS2(null);
  const [severity, setSeverity] = useS2('Medium');
  const [title, setTitle] = useS2('');
  const [body, setBody] = useS2('');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, maxWidth:760, margin:'0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 className="fv-h2" style={{ margin:0 }}>File a complaint</h1>
          <div style={{ fontSize:13, color:'var(--color-muted-foreground)', marginTop:4 }}>
            Anonymous · ZKP-verified · published to Polygon after moderation.
          </div>
        </div>
        <button onClick={onClose} style={{
          width:36, height:36, borderRadius:10, border:'1px solid var(--color-border)',
          background:'var(--color-card)', cursor:'pointer',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.X style={{ width:16, height:16, color:'var(--color-gray-700)'}}/></button>
      </div>

      <div style={{
        background:'var(--color-card)', border:'1px solid var(--color-border)',
        borderRadius:20, padding:24,
      }}>
        <Stepper step={step}/>

        {step===0 && (
          <div>
            <label className="fv-overline" style={{ marginBottom:12, display:'block' }}>Pick a category</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {categories.map(c => (
                <button key={c.id} onClick={()=>setCat(c.id)} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'14px 16px', textAlign:'left',
                  background: cat===c.id ? 'var(--color-brand-50)' : 'var(--color-card)',
                  border: `1px solid ${cat===c.id ? 'var(--color-brand-500)' : 'var(--color-border)'}`,
                  borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:'var(--color-foreground)'}}>{c.label}</div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{c.count.toLocaleString()} complaints</div>
                  </div>
                  {cat===c.id && <I.Check style={{width:16,height:16, color:'var(--color-brand-600)'}}/>}
                </button>
              ))}
            </div>
            <div style={{ marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'var(--color-muted-foreground)'}}>36 categories available</span>
              <Btn variant="solid" tone="primary" disabled={!cat} onClick={()=>setStep(1)}
                iconRight={<I.ChevronR style={{width:14,height:14}}/>}>
                Next
              </Btn>
            </div>
          </div>
        )}

        {step===1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div className="field">
              <label className="fv-label" style={{ marginBottom:6, display:'block' }}>Title</label>
              <div className="field-input" style={inputStyle()}>
                <input value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="What happened? Be specific."
                  style={inputInputStyle()}/>
              </div>
              <div className="field-help" style={helpStyle()}>10–140 characters. Avoid names of private citizens.</div>
            </div>
            <div className="field">
              <label className="fv-label" style={{ marginBottom:6, display:'block' }}>Description</label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6}
                placeholder="Date, location, who was involved (if a public official), what action you've already taken."
                style={{
                  width:'100%', padding:'12px 14px', background:'var(--color-muted)',
                  border:'1px solid transparent', borderRadius:12,
                  fontFamily:'inherit', fontSize:14, color:'var(--color-foreground)',
                  outline:'none', resize:'vertical', lineHeight:1.6,
                }}/>
              <div className="field-help" style={helpStyle()}>EXIF and GPS data are stripped from every upload.</div>
            </div>
            <div className="field">
              <label className="fv-label" style={{ marginBottom:8, display:'block' }}>Severity</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {['Low','Medium','High','Critical'].map(s => (
                  <button key={s} onClick={()=>setSeverity(s)} style={{
                    padding:'8px 14px', borderRadius:9999, cursor:'pointer',
                    background: severity===s ? 'var(--color-brand-500)' : 'var(--color-card)',
                    color: severity===s ? '#fff' : 'var(--color-foreground)',
                    border:`1px solid ${severity===s?'var(--color-brand-500)':'var(--color-border)'}`,
                    fontSize:13, fontWeight:500, fontFamily:'inherit',
                  }}>{s}</button>
                ))}
              </div>
              <div className="field-help" style={helpStyle()}>
                Reserve Critical for life-or-death issues (violence, denial of emergency care).
              </div>
            </div>
            <div className="field">
              <label className="fv-label" style={{ marginBottom:6, display:'block' }}>Constituency</label>
              <div className="field-input" style={inputStyle()}>
                <I.MapPin style={{ width:14, height:14, color:'var(--color-muted-foreground)'}}/>
                <input defaultValue="Mumbai South" style={inputInputStyle()}/>
                <Chip tone="success" sm>auto-detected</Chip>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Btn variant="ghost" onClick={()=>setStep(0)}>Back</Btn>
              <Btn variant="solid" tone="primary" onClick={()=>setStep(2)} disabled={!title || !body}
                iconRight={<I.ChevronR style={{width:14,height:14}}/>}>Next</Btn>
            </div>
          </div>
        )}

        {step===2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <div style={{
                border:'2px dashed var(--color-border)', borderRadius:14, padding:'32px 20px',
                textAlign:'center', background:'var(--color-muted)',
              }}>
                <I.Paperclip style={{ width:24, height:24, color:'var(--color-muted-foreground)', margin:'0 auto'}}/>
                <div style={{ fontSize:14, fontWeight:500, marginTop:10 }}>Drop evidence here</div>
                <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>
                  Photos, audio, PDFs. Max 100 MB per file. Metadata stripped on upload.
                </div>
                <div style={{ marginTop:14 }}>
                  <Btn variant="bordered" tone="default" size="sm">Browse files</Btn>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                {kind:'Audio', label:'station-visit-3.m4a', size:'2.1 MB', stripped:true},
                {kind:'Image', label:'station-refusal-note.jpg', size:'1.4 MB', stripped:true, stripping:false},
                {kind:'Image', label:'pothole-may-12.heic', size:'3.8 MB', stripping:true},
              ].map((f,i) => {
                const Icon = f.kind==='Audio' ? I.Mic : f.kind==='Image' ? I.Image : I.FileText;
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 12px', background:'var(--color-card)',
                    border:'1px solid var(--color-border)', borderRadius:10,
                  }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:'var(--color-muted)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      color:'var(--color-brand-600)' }}>
                      <Icon style={{width:14,height:14}}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{f.label}</div>
                      <div style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>
                        {f.kind} · {f.size}
                      </div>
                    </div>
                    {f.stripping ? (
                      <Chip tone="warning" sm dot>Stripping EXIF…</Chip>
                    ) : (
                      <Chip tone="success" sm><I.Check style={{width:11,height:11}}/> EXIF stripped</Chip>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Btn variant="ghost" onClick={()=>setStep(1)}>Back</Btn>
              <Btn variant="solid" tone="primary" onClick={()=>setStep(3)}
                iconRight={<I.ChevronR style={{width:14,height:14}}/>}>Next</Btn>
            </div>
          </div>
        )}

        {step===3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{
              padding:'14px 16px', background:'var(--color-brand-50)',
              border:'1px solid var(--color-brand-200)', borderRadius:12,
              display:'flex', gap:12, alignItems:'flex-start',
            }}>
              <I.ShieldFill style={{ width:20, height:20, color:'var(--color-brand-600)', flexShrink:0, marginTop:1 }}/>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--color-brand-900)'}}>Anonymous publication</div>
                <div style={{ fontSize:13, color:'var(--color-brand-900)', opacity:0.85, lineHeight:1.55, marginTop:2 }}>
                  Your handle <strong>citizen-7K3F4P</strong> will be linked, not your identity. Llama Guard 3 will pre-screen this submission. Polygon anchor tx will run after publication.
                </div>
              </div>
            </div>
            <div style={{
              padding:16, background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:12,
            }}>
              <div className="fv-overline" style={{ marginBottom:10 }}>Preview</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <Chip tone="primary" bordered sm>{categories.find(c=>c.id===cat)?.label || 'Infrastructure'}</Chip>
                <SeverityPill level={severity}/>
              </div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--color-foreground)'}}>
                {title || 'Your title will appear here.'}
              </div>
              <div style={{ fontSize:13, color:'var(--color-muted-foreground)', lineHeight:1.55, whiteSpace:'pre-wrap' }}>
                {body || 'Your description will appear here.'}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Btn variant="ghost" onClick={()=>setStep(2)}>Back</Btn>
              <Btn variant="solid" tone="primary" onClick={onPublish}
                icon={<I.ShieldFill style={{width:14,height:14}}/>}>Publish</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function inputStyle() {
  return {
    display:'flex', alignItems:'center', gap:8,
    height:44, padding:'0 14px', background:'var(--color-muted)',
    border:'1px solid transparent', borderRadius:12, fontSize:14,
  };
}
function inputInputStyle() {
  return { flex:1, border:0, background:'transparent', outline:'none', fontFamily:'inherit', fontSize:14, color:'var(--color-foreground)' };
}
function helpStyle() {
  return { fontSize:11, color:'var(--color-muted-foreground)', marginTop:6 };
}

// ─── Profile / Report card ─────────────────────────────────────────────
const ProfileScreen = ({ me, onClose }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:18, maxWidth:760, margin:'0 auto', width:'100%' }}>
    <button onClick={onClose} style={{
      alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:4,
      background:'transparent', border:0, color:'var(--color-muted-foreground)',
      fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:0,
    }}>
      <span style={{ transform:'rotate(180deg)', display:'inline-flex'}}><I.ChevronR style={{width:14,height:14}}/></span>
      Back
    </button>

    <div style={{
      background:'linear-gradient(140deg, var(--color-brand-50) 0%, var(--color-card) 60%)',
      border:'1px solid var(--color-brand-200)', borderRadius:20, padding:24,
      display:'flex', gap:18, alignItems:'flex-start',
    }}>
      <Avatar handle={me.handle} size={64} tone="primary"/>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, fontSize:18, color:'var(--color-foreground)'}}>{me.handle}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
            background:'var(--color-brand-500)', color:'#fff', borderRadius:9999, fontSize:11, fontWeight:600 }}>
            <I.ShieldFill style={{ width:11, height:11 }}/>Verified citizen
          </span>
        </div>
        <div style={{ fontSize:13, color:'var(--color-muted-foreground)', marginBottom:14 }}>
          {me.constituency}, {me.state} · verified {me.verifiedAt}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            ['Complaints', me.submissions],
            ['Endorsements', me.endorsements],
            ['Resolved', 3],
            ['Reputation', 'A−'],
          ].map(([l,v]) => (
            <div key={l} style={{ padding:'10px 12px', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:10 }}>
              <div style={{ fontSize:20, fontWeight:700, color:'var(--color-foreground)', letterSpacing:'-0.01em' }}>{v}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Sample constituency report card */}
    <div style={{
      background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:20, padding:20,
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div className="fv-overline" style={{ marginBottom:4 }}>Your constituency · report card</div>
          <h2 className="fv-h3" style={{ margin:0 }}>{me.constituency}</h2>
          <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>MP · Arvind Sawant (Shiv Sena UBT) · 18th Lok Sabha</div>
        </div>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background:'conic-gradient(var(--color-warning-500) 0% 62%, var(--color-gray-200) 62% 100%)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--color-card)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:'var(--color-warning-700)'}}>
            C+
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
        {[
          ['Complaints filed', '412', 'this quarter', 'warning'],
          ['Resolution rate', '34%', '↑ 5% YoY', 'success'],
          ['Attendance', '78%', 'Lok Sabha', 'primary'],
        ].map(([l,v,sub,tone],i)=>(
          <div key={i} style={{ padding:'12px 14px', background:'var(--color-muted)', borderRadius:12, border:'1px solid var(--color-border)' }}>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:700, marginTop:4, color:`var(--color-${tone}-700)`, letterSpacing:'-0.01em' }}>{v}</div>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{sub}</div>
          </div>
        ))}
      </div>
      <div className="fv-overline" style={{ marginBottom:8 }}>Top categories</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[
          ['Infrastructure', 138, 64],
          ['Police misconduct', 96, 44],
          ['Healthcare', 71, 33],
          ['RTI obstruction', 41, 19],
        ].map(([cat,n,pct]) => (
          <div key={cat} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:140, fontSize:13 }}>{cat}</div>
            <div style={{ flex:1, height:8, background:'var(--color-muted)', borderRadius:9999, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:'var(--color-brand-500)', borderRadius:9999 }}/>
            </div>
            <div style={{ width:32, textAlign:'right', fontSize:12, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)'}}>{n}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { SubmitScreen, ProfileScreen });
