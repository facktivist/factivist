// Factivist — Mobile companions for every desktop screen + the new
// complaint / endorse / empty surfaces.
//
// Phone width is 360. Content is laid out as a vertical scroll page with
// a sticky mini header. Each component is named MobileXxx.

// ─── Tiny helpers ────────────────────────────────────────────────────
const MTopBar = ({ title, sub, right, icon, dark=false }) => (
  <div style={{
    padding:'14px 16px', borderBottom:'1px solid var(--color-border)',
    background: dark ? 'var(--color-gray-950)' : 'var(--color-card)',
    color: dark ? 'var(--color-gray-50)' : 'var(--color-foreground)',
    display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:5,
  }}>
    <button style={{
      width:32, height:32, borderRadius:8,
      border:'1px solid ' + (dark ? 'rgba(255,255,255,0.12)' : 'var(--color-border)'),
      background:'transparent', cursor:'pointer', flexShrink:0,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      color:'inherit',
    }}>
      <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
        <I.ChevronR style={{ width:14, height:14 }}/>
      </span>
    </button>
    {icon && (
      <div style={{
        width:28, height:28, borderRadius:8, flexShrink:0,
        background: dark ? 'rgba(255,255,255,0.08)' : 'var(--color-muted)',
        color: dark ? '#fff' : 'var(--color-brand-600)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>{icon}</div>
    )}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
      {sub && <div style={{ fontSize:11, color: dark ? 'rgba(255,255,255,0.6)' : 'var(--color-muted-foreground)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const MBottomTabs = ({ active = 'home' }) => {
  const tabs = [
    { id:'home',    label:'Feed',     icon:'Search' },
    { id:'explore', label:'Explore',  icon:'MapPin' },
    { id:'submit',  label:'',         icon:'Plus', primary:true },
    { id:'alerts',  label:'Alerts',   icon:'Bell' },
    { id:'me',      label:'Me',       icon:'ShieldFill' },
  ];
  return (
    <div style={{
      position:'sticky', bottom:0, padding:'8px 8px 10px', background:'var(--color-card)',
      borderTop:'1px solid var(--color-border)',
      display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4,
    }}>
      {tabs.map(t => {
        const IconC = I[t.icon] || I.Search;
        if (t.primary) {
          return (
            <div key={t.id} style={{ display:'flex', justifyContent:'center', alignItems:'center' }}>
              <button style={{
                width:48, height:48, borderRadius:14, border:0, cursor:'pointer',
                background:'var(--color-brand-500)', color:'#fff',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 18px -8px var(--color-brand-500)',
              }}><IconC style={{ width:20, height:20 }}/></button>
            </div>
          );
        }
        const isActive = t.id === active;
        return (
          <button key={t.id} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            padding:'8px 0', border:0, background:'transparent', cursor:'pointer',
            color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            fontFamily:'inherit',
          }}>
            <IconC style={{ width:18, height:18 }}/>
            <span style={{ fontSize:10, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// shared page frame
const MPhonePage = ({ children, dark=false }) => (
  <div style={{
    background: dark ? 'var(--color-gray-950)' : 'var(--color-background)',
    color: dark ? 'var(--color-gray-50)' : 'var(--color-foreground)',
    minHeight:'100%', display:'flex', flexDirection:'column',
  }}>
    {children}
  </div>
);

// ─── 1) Mobile · Complaint Register (single-pager, segmented header) ─
const MobileComplaintRegister = () => {
  const d = window.fvDataExtra.draftComplaint;
  const [step, setStep] = React.useState(2); // show step 3 by default for visual richness
  const steps = ['Category','Story','Evidence','Review'];

  return (
    <MPhonePage>
      <MTopBar title="New complaint" sub={`Step ${step+1} of 4 · ${steps[step]}`}
        right={<Btn variant="ghost" size="sm">Save</Btn>}/>
      <div style={{ padding:'10px 14px 4px' }}>
        <div style={{ display:'flex', gap:5 }}>
          {steps.map((_, i) => (
            <span key={i} style={{
              flex:1, height:4, borderRadius:99,
              background: i <= step ? 'var(--color-brand-500)' : 'var(--color-gray-200)',
            }}/>
          ))}
        </div>
      </div>
      <div style={{ flex:1, padding:'18px 14px 16px', overflow:'auto', display:'flex', flexDirection:'column', gap:18 }}>
        <div>
          <Overline>Tagged so far</Overline>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
            <Chip tone="danger" sm>Police misconduct</Chip>
            <Chip tone="warning" sm bordered>Critical</Chip>
            <Chip tone="default" sm bordered>Mumbai North-East</Chip>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12.5, fontWeight:600, marginBottom:6 }}>Evidence · 4 attached</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {d.attachments.map(a => {
              const IconC = a.kind === 'Audio' ? I.Megaphone : a.kind === 'PDF' ? I.FileText : I.MapPin;
              return (
                <div key={a.label} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'9px 11px',
                  background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:10,
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:7, flexShrink:0,
                    background:'var(--color-muted)', color:'var(--color-brand-600)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><IconC style={{ width:13, height:13 }}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.label}</div>
                    <div style={{ fontSize:10, color: a.stripping ? 'var(--color-warning-700)':'var(--color-success-700)', display:'inline-flex', alignItems:'center', gap:4, marginTop:2 }}>
                      {a.stripping ? <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--color-warning-500)' }}/> : <I.Check style={{ width:9, height:9 }}/>}
                      {a.stripping ? 'Stripping…' : 'EXIF stripped'}
                    </div>
                  </div>
                </div>
              );
            })}
            <button style={{
              padding:'10px', borderRadius:10, border:'1px dashed var(--color-border)',
              background:'transparent', cursor:'pointer', fontFamily:'inherit',
              color:'var(--color-brand-700)', fontSize:12, fontWeight:600,
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
            }}><I.Paperclip style={{ width:11, height:11 }}/>Add another</button>
          </div>
        </div>

        <div>
          <div style={{ fontSize:12.5, fontWeight:600, marginBottom:6 }}>Routing</div>
          <div style={{
            padding:'12px 14px', borderRadius:12,
            background:'var(--color-muted)', border:'1px solid var(--color-border)',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <I.MapPin style={{ width:14, height:14, color:'var(--color-brand-600)' }}/>
            <div style={{ flex:1, fontSize:12 }}>
              <div><strong>{d.location.constituency}</strong></div>
              <div style={{ color:'var(--color-muted-foreground)', marginTop:2 }}>pin {d.location.pincode} · {d.location.ward}</div>
            </div>
            <button style={{ background:'transparent', border:0, color:'var(--color-brand-700)', fontFamily:'inherit', fontSize:11, fontWeight:600, cursor:'pointer' }}>Edit</button>
          </div>
        </div>

        <div style={{
          padding:'12px 14px', borderRadius:12,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
          display:'flex', gap:10, alignItems:'flex-start',
        }}>
          <I.ShieldFill style={{ width:13, height:13, color:'var(--color-brand-600)', flexShrink:0, marginTop:2 }}/>
          <div style={{ fontSize:11.5, color:'var(--color-brand-900)', lineHeight:1.55 }}>
            Your draft is encrypted on this phone. Nothing reaches the chain until you tap <strong>Anchor</strong>.
          </div>
        </div>
      </div>
      <div style={{ padding:'10px 14px 16px', borderTop:'1px solid var(--color-border)', background:'var(--color-card)', display:'flex', gap:8 }}>
        <Btn variant="bordered" tone="default" size="md" onClick={()=>setStep(Math.max(0, step-1))}>Back</Btn>
        <Btn variant="solid" tone="primary" size="md" fullWidth iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}
          onClick={()=>setStep(Math.min(3, step+1))}>
          Continue to Review
        </Btn>
      </div>
    </MPhonePage>
  );
};

// ─── 2) Mobile · Complaint View ──────────────────────────────────────
const MobileComplaintView = () => {
  const c = window.fvDataExtra.complaintDetail;
  const progress = Math.min(100, (c.endorsements / c.endorsementsToCritical) * 100);
  return (
    <MPhonePage>
      <MTopBar title={'#' + c.id} sub={c.category + ' · ' + c.subCategory}
        right={<Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share</Btn>}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 90px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Status row */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <StatusPill status={c.status}/>
          <Chip tone="danger" sm bordered>{c.severity}</Chip>
        </div>
        {/* Title */}
        <h2 style={{ margin:0, fontSize:19, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.25 }}>{c.title}</h2>
        {/* meta */}
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--color-muted-foreground)' }}>
          <Avatar handle={c.submittedBy} size={22}/>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{c.submittedBy}</span>
          <I.ShieldFill style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>
          <span>·</span>
          <span>{c.constituency}</span>
        </div>
        {/* Body */}
        <div style={{ fontSize:13.5, lineHeight:1.7, color:'var(--color-foreground)', whiteSpace:'pre-line', textWrap:'pretty' }}>
          {c.body}
        </div>
        {/* Endorse bar */}
        <div style={{
          padding:'14px', borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-brand-800)', letterSpacing:'0.06em' }}>ENDORSEMENTS</div>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--color-brand-900)', letterSpacing:'-0.02em', marginTop:2 }}>
                {c.endorsements.toLocaleString()}
                <span style={{ fontSize:11, fontWeight:500, color:'var(--color-brand-700)', marginLeft:6 }}>/ {c.endorsementsToCritical.toLocaleString()}</span>
              </div>
            </div>
            <Btn variant="solid" tone="primary" size="md" icon={<I.ArrowUp style={{ width:13, height:13 }}/>}>Endorse</Btn>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.5)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width: progress + '%', height:'100%', background:'var(--color-brand-700)' }}/>
          </div>
          <div style={{ fontSize:10, color:'var(--color-brand-900)', marginTop:6, fontFamily:'var(--font-mono)' }}>
            +{c.endorsementsLastDay} in last 24h · {Math.round(progress)}% to CRITICAL
          </div>
        </div>

        {/* Lifecycle */}
        <div>
          <Overline>Lifecycle</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
            {c.workflow.map(w => (
              <div key={w.id} style={{
                display:'flex', alignItems:'flex-start', gap:10,
                padding:'9px 11px', borderRadius:10,
                background: w.state === 'current' ? 'var(--color-brand-50)' : 'var(--color-card)',
                border:'1px solid ' + (w.state === 'current' ? 'var(--color-brand-200)' : 'var(--color-border)'),
              }}>
                <span style={{
                  width:18, height:18, borderRadius:'50%', flexShrink:0,
                  background: w.state === 'done' ? 'var(--color-success-500)'
                            : w.state === 'current' ? 'var(--color-brand-500)'
                            : w.state === 'partial' ? 'var(--color-warning-500)' : 'var(--color-gray-200)',
                  color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
                  marginTop:2,
                }}>
                  {w.state === 'done' && <I.Check style={{ width:9, height:9 }}/>}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{w.label}</div>
                  <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:2, lineHeight:1.5 }}>{w.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence */}
        <div>
          <Overline>Evidence · {c.evidence.length}</Overline>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            {c.evidence.slice(0,4).map(a => {
              const IconC = a.kind === 'Audio' ? I.Megaphone : a.kind === 'PDF' ? I.FileText : I.MapPin;
              return (
                <div key={a.label} style={{ display:'flex', flexDirection:'column' }}>
                  <div style={{
                    aspectRatio:'4/3',
                    background: a.kind === 'Audio' ? 'var(--color-brand-100)' : a.kind === 'PDF' ? 'var(--color-danger-50)' : 'var(--color-muted)',
                    borderRadius:10, border:'1px solid var(--color-border)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <IconC style={{ width:22, height:22, color: a.kind === 'Audio' ? 'var(--color-brand-700)' : a.kind === 'PDF' ? 'var(--color-danger-700)' : 'var(--color-gray-600)' }}/>
                  </div>
                  <div style={{ fontSize:10.5, fontWeight:600, marginTop:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked POI */}
        <div style={{
          padding:'12px', borderRadius:12,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{
            width:36, height:36, borderRadius:9, flexShrink:0,
            background:'var(--color-gray-900)', color:'var(--color-gray-50)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:12,
          }}>PR</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600 }}>{c.linkedPOI.name}</div>
            <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)' }}>{c.linkedPOI.related} related complaints</div>
          </div>
          <I.ChevronR style={{ width:13, height:13, color:'var(--color-muted-foreground)' }}/>
        </div>
      </div>

      {/* sticky CTA */}
      <div style={{
        position:'sticky', bottom:0, padding:'10px 14px 14px',
        background:'var(--color-card)', borderTop:'1px solid var(--color-border)',
        display:'flex', gap:8,
      }}>
        <Btn variant="bordered" tone="default" size="md" icon={<I.MessageSq style={{ width:13, height:13 }}/>}>{c.comments}</Btn>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.ArrowUp style={{ width:14, height:14 }}/>}>
          Endorse · {c.endorsements}
        </Btn>
      </div>
    </MPhonePage>
  );
};

// ─── 3) Mobile · Endorse modal (confirm + done states) ──────────────
const MobileEndorse = ({ stage = 'confirm' }) => {
  const c = window.fvDataExtra.complaintDetail;
  return (
    <MPhonePage>
      {/* Dimmed page background visible behind the modal */}
      <div style={{
        position:'relative', flex:1, padding:'14px',
        background:'rgba(0,0,0,0.45)',
        backgroundImage:'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), linear-gradient(140deg, var(--color-muted), var(--color-card))',
        display:'flex', alignItems:'flex-end',
      }}>
        <div style={{
          width:'100%', borderRadius:'18px 18px 6px 6px',
          background:'var(--color-card)', border:'1px solid var(--color-border)',
          padding:'14px', boxShadow:'0 -16px 40px -10px rgba(0,0,0,0.35)',
          display:'flex', flexDirection:'column', gap:14,
        }}>
          <div style={{ width:32, height:4, borderRadius:99, background:'var(--color-gray-300)', alignSelf:'center', margin:'-4px 0 4px' }}/>
          {stage === 'confirm' && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:'var(--color-brand-500)', color:'#fff',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><I.ArrowUp style={{ width:16, height:16 }}/></div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.015em' }}>Endorse this complaint?</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>Anchored to your unique nullifier.</div>
                </div>
              </div>
              <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                  <Chip tone="danger" sm>{c.severity}</Chip>
                </div>
                <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.4 }}>{c.title}</div>
              </div>
              <div>
                <div style={{ fontSize:11.5, fontWeight:600, marginBottom:6 }}>I'm endorsing because…</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {['I have first-hand knowledge','I witnessed something similar','I have evidence to attach'].map((l, i) => (
                    <label key={i} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'9px 10px',
                      background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:9, cursor:'pointer',
                    }}>
                      <span style={{
                        width:16, height:16, borderRadius:4, flexShrink:0,
                        background: i===0 ? 'var(--color-brand-500)':'var(--color-card)',
                        border:'1.5px solid ' + (i===0 ? 'var(--color-brand-500)':'var(--color-gray-300)'),
                        display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff',
                      }}>
                        {i===0 && <I.Check style={{ width:10, height:10 }}/>}
                      </span>
                      <span style={{ fontSize:12 }}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <Btn variant="ghost" size="md" fullWidth>Cancel</Btn>
                <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.ShieldFill style={{ width:13, height:13 }}/>}>Anchor</Btn>
              </div>
            </>
          )}
          {stage === 'done' && (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'4px 0' }}>
                <div style={{
                  width:60, height:60, borderRadius:'50%',
                  background:'var(--color-success-100)', color:'var(--color-success-700)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><I.Check style={{ width:28, height:28 }}/></div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.02em' }}>Anchored.</div>
                  <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:4 }}>You're the {c.endorsements+1}th citizen on this complaint.</div>
                </div>
              </div>
              <div style={{
                padding:'10px 12px', borderRadius:10,
                background:'var(--color-gray-950)', color:'var(--color-gray-100)',
                border:'1px solid var(--color-gray-800)', fontFamily:'var(--font-mono)', fontSize:10.5, lineHeight:1.65,
              }}>
                <div style={{ color:'oklch(0.78 0.16 145)', fontWeight:700, letterSpacing:'0.04em', marginBottom:5 }}>RECEIPT</div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'oklch(0.62 0.012 270)' }}>tx</span><span>0x9c2f1a…d4b7</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'oklch(0.62 0.012 270)' }}>block</span><span>71,184,447</span></div>
              </div>
              <Btn variant="solid" tone="primary" size="md" fullWidth iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}>See related</Btn>
            </>
          )}
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── 4) Mobile · Empty states (3 variants stacked) ──────────────────
const MobileEmptyStates = () => (
  <MPhonePage>
    <MTopBar title="Empty states" sub="Mobile · 3 patterns"/>
    <div style={{ padding:'18px 14px 30px', display:'flex', flexDirection:'column', gap:22 }}>
      {/* Feed empty */}
      <div style={{
        padding:'28px 18px', borderRadius:16,
        background:'var(--color-card)', border:'1px dashed var(--color-border)',
        display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:10,
      }}>
        <FeedArt/>
        <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em', lineHeight:1.2, textWrap:'balance' }}>Your feed warms up as you follow.</div>
        <div style={{ fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.55, textWrap:'pretty' }}>Follow a few constituencies or categories and complaints arrive as they're anchored.</div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'center', marginTop:4 }}>
          <Chip tone="default" sm bordered>Mumbai South</Chip>
          <Chip tone="default" sm bordered>Police misconduct</Chip>
          <Chip tone="default" sm bordered>RTI</Chip>
        </div>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.Plus style={{ width:12, height:12 }}/>}>File the first complaint</Btn>
      </div>
      {/* Inbox empty */}
      <div style={{
        padding:'28px 18px', borderRadius:16,
        background:'var(--color-card)', border:'1px dashed var(--color-border)',
        display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:10,
      }}>
        <div style={{
          width:52, height:52, borderRadius:14,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
          color:'var(--color-muted-foreground)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.Bell style={{ width:24, height:24 }}/></div>
        <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em' }}>You're caught up.</div>
        <div style={{ fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>We'll buzz you when a complaint you endorsed crosses a threshold or gets a response.</div>
        <Btn variant="bordered" tone="default" size="md" fullWidth>Subscribe to my area</Btn>
      </div>
      {/* Comments empty */}
      <div style={{
        padding:'28px 18px', borderRadius:16,
        background:'var(--color-brand-50)', border:'1px dashed var(--color-brand-200)',
        display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:10,
      }}>
        <CommentsArt/>
        <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em' }}>Be the first verified voice.</div>
        <div style={{ fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55 }}>Cite precedent, link an RTI, or share what your station said. Llama Guard auto-moderates abuse.</div>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.MessageSq style={{ width:13, height:13 }}/>}>Write the first comment</Btn>
      </div>
    </div>
  </MPhonePage>
);

// ─── 5) Mobile · Accused profile ────────────────────────────────────
const MobileAccused = () => {
  const a = window.fvDataExtra.accused;
  return (
    <MPhonePage>
      <MTopBar title={a.name} sub={a.role}/>
      <div style={{ padding:'16px 14px 80px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* hero */}
        <div style={{
          padding:14, borderRadius:14,
          background:'var(--color-card)', border:'1px solid var(--color-border)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:56, height:56, borderRadius:14, flexShrink:0,
              background:'var(--color-gray-900)', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              fontSize:20, fontWeight:700, letterSpacing:'-0.02em',
            }}>PR</div>
            <div style={{ flex:1, minWidth:0 }}>
              <Chip tone="danger" sm>Risk · {a.risk}</Chip>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em', marginTop:4, lineHeight:1.2 }}>{a.name}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>First flagged {a.firstFlagged}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:12 }}>
            <Kpi value={a.metrics.complaints} label="Complaints"/>
            <Kpi value={a.metrics.verified}    label="Verified"/>
            <Kpi value={a.metrics.open}        label="Open" tone="danger"/>
          </div>
          <div style={{ fontSize:12.5, lineHeight:1.6, color:'var(--color-foreground)', marginTop:12 }}>{a.summary}</div>
        </div>
        {/* timeline */}
        <div>
          <Overline>Timeline</Overline>
          <ol style={{ listStyle:'none', padding:0, margin:'10px 0 0', position:'relative' }}>
            <span style={{ position:'absolute', left:6, top:8, bottom:8, width:2, background:'var(--color-border)' }}/>
            {a.timeline.slice(0,5).map((t,i) => (
              <li key={i} style={{ paddingLeft:24, paddingBottom:14, position:'relative' }}>
                <span style={{
                  position:'absolute', left:0, top:4,
                  width:14, height:14, borderRadius:'50%',
                  background: t.tone === 'danger' ? 'var(--color-danger-500)'
                           : t.tone === 'warning' ? 'var(--color-warning-500)'
                           : 'var(--color-gray-400)',
                  border:'3px solid var(--color-background)', boxSizing:'content-box',
                }}/>
                <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>{t.at.toUpperCase()}</div>
                <div style={{ fontSize:12.5, marginTop:3, lineHeight:1.5 }}>{t.label}</div>
              </li>
            ))}
          </ol>
        </div>
        {/* linked complaints */}
        <div>
          <Overline>Linked complaints · {a.linkedComplaints.length}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
            {a.linkedComplaints.slice(0,3).map(lc => (
              <div key={lc.id} style={{
                padding:'10px 12px', borderRadius:10,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{lc.id}</span>
                  <StatusChip status={lc.status}/>
                </div>
                <div style={{ fontSize:12, fontWeight:500, lineHeight:1.4 }}>{lc.title}</div>
                <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', display:'inline-flex', alignItems:'center', gap:4, marginTop:5 }}>
                  <I.ArrowUp style={{ width:10, height:10 }}/><span style={{ fontFamily:'var(--font-mono)' }}>{lc.endorsements}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── 6) Mobile · AI Chat ────────────────────────────────────────────
const MobileAiChat = () => {
  const t = window.fvDataExtra.aiThread;
  return (
    <MPhonePage>
      <MTopBar title="Ask AI" sub="Grounded in anchored complaints"
        icon={<I.Sparkles style={{ width:14, height:14 }}/>}/>
      <div style={{ flex:1, padding:'16px 14px 90px', display:'flex', flexDirection:'column', gap:14, overflow:'auto' }}>
        {/* user query */}
        <div style={{ alignSelf:'flex-end', maxWidth:'85%' }}>
          <div style={{
            padding:'10px 14px', borderRadius:14, borderTopRightRadius:4,
            background:'var(--color-brand-500)', color:'#fff',
            fontSize:13, lineHeight:1.55, fontWeight:500,
          }}>{t.query}</div>
        </div>
        {/* AI response */}
        <div style={{ display:'flex', gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:9, flexShrink:0,
            background:'var(--color-brand-500)', color:'#fff',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}><I.Sparkles style={{ width:13, height:13 }}/></div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginBottom:5 }}>
              factivist · Llama 3.3 70B
            </div>
            <div style={{
              padding:'10px 12px', borderRadius:14, borderTopLeftRadius:4,
              background:'var(--color-card)', border:'1px solid var(--color-border)',
              fontSize:12.5, lineHeight:1.6, color:'var(--color-foreground)', whiteSpace:'pre-line',
            }}>
              {t.answer.split('\n\n').slice(0,2).join('\n\n').replace(/\*\*(.+?)\*\*/g,'$1')}
            </div>
            {/* sources */}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em', marginBottom:6 }}>
                {t.sources.length} SOURCES
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {t.sources.map(s => (
                  <div key={s.id} style={{
                    padding:'8px 10px', borderRadius:9,
                    background:'var(--color-card)', border:'1px solid var(--color-border)',
                  }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{s.id}</div>
                    <div style={{ fontSize:11.5, fontWeight:600, lineHeight:1.4, marginTop:2 }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* suggestions */}
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:5 }}>
              {t.suggestions.slice(0,2).map((s,i) => (
                <button key={i} style={{
                  textAlign:'left', padding:'8px 11px', borderRadius:9,
                  background:'transparent', border:'1px solid var(--color-border)',
                  cursor:'pointer', fontFamily:'inherit', fontSize:11.5,
                  color:'var(--color-foreground)',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  <I.Sparkles style={{ width:11, height:11, color:'var(--color-brand-600)', flexShrink:0 }}/>
                  <span style={{ flex:1 }}>{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* composer */}
      <div style={{ padding:'10px 14px 14px', background:'var(--color-card)', borderTop:'1px solid var(--color-border)', display:'flex', gap:6 }}>
        <div style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)', fontSize:12, color:'var(--color-muted-foreground)' }}>
          Ask about complaints, leaders, RTIs…
        </div>
        <button style={{
          width:42, height:42, borderRadius:12, border:0, cursor:'pointer',
          background:'var(--color-brand-500)', color:'#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.Sparkles style={{ width:15, height:15 }}/></button>
      </div>
    </MPhonePage>
  );
};

// ─── 7) Mobile · Constituency explorer ──────────────────────────────
const MobileConstituency = () => {
  const states = (window.fvIndiaStateSummary || []).slice(0, 30);
  const stateData = window.fvStatesByName || {};
  return (
    <MPhonePage>
      <MTopBar title="Constituencies" sub="4,182 ACs · all-India"/>
      <div style={{ padding:'12px 14px 80px', display:'flex', flexDirection:'column', gap:12, flex:1, overflow:'auto' }}>
        {/* search */}
        <div style={{
          padding:'10px 12px', borderRadius:12,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          <I.Search style={{ width:14, height:14, color:'var(--color-muted-foreground)' }}/>
          <span style={{ fontSize:12.5, color:'var(--color-muted-foreground)' }}>Pincode, AC, MLA name</span>
        </div>
        {/* mini India map */}
        <div style={{
          padding:'8px', borderRadius:14,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
        }}>
          <div style={{ aspectRatio:'1/1', position:'relative' }}>
            <IndiaMap width={310} height={310} stateData={stateData} selectedState={null} colorBy="volume" onSelect={()=>{}} onHoverAC={()=>{}}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px 2px' }}>
            <HeatLegend palette="volume" label="VOLUME"/>
            <Btn variant="ghost" size="sm">Fullscreen</Btn>
          </div>
        </div>
        {/* top states list */}
        <div>
          <Overline>Top states · by volume</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
            {states
              .map(s => ({ ...s, ...stateData[s.name] }))
              .sort((a,b) => (b.complaints||0) - (a.complaints||0))
              .slice(0, 8).map((s, i) => (
              <button key={s.name} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:10,
                cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', width:16 }}>{String(i+1).padStart(2,'0')}</span>
                <span style={{ flex:1, fontSize:12.5, fontWeight:500 }}>{s.name.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase())}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-foreground)', fontWeight:600 }}>{(s.complaints || 0).toLocaleString()}</span>
                <I.ChevronR style={{ width:12, height:12, color:'var(--color-muted-foreground)' }}/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── 8) Mobile · Judicial ───────────────────────────────────────────
const MobileJudicial = () => {
  const j = window.fvDataExtra.judicial;
  const adj = j.hearings.filter(h => h.tag === 'Adjourned').length;
  return (
    <MPhonePage>
      <MTopBar title={j.case.id} sub={j.case.court}/>
      <div style={{ padding:'14px 14px 60px', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{
          padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            <Chip tone="danger" sm>Adjourned · {adj}×</Chip>
            <Chip tone="default" sm bordered>{j.case.section}</Chip>
          </div>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.2 }}>{j.case.matter}</div>
          <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4 }}>Before {j.case.judge}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:12 }}>
            <Kpi value={j.case.age + 'd'} label="Age"/>
            <Kpi value={j.case.nextDate} label="Next listing" tone="warning"/>
          </div>
        </div>
        {/* timeline */}
        <div>
          <Overline>Hearings · {j.hearings.length}</Overline>
          <ol style={{ listStyle:'none', padding:0, margin:'10px 0 0', position:'relative' }}>
            <span style={{ position:'absolute', left:6, top:8, bottom:8, width:2, background:'var(--color-border)' }}/>
            {j.hearings.slice(0,5).map((h,i) => (
              <li key={i} style={{ paddingLeft:24, paddingBottom:14, position:'relative' }}>
                <span style={{
                  position:'absolute', left:0, top:4,
                  width:14, height:14, borderRadius:'50%',
                  background: h.tag === 'Adjourned' ? 'var(--color-warning-500)' : h.tag === 'Order' ? 'var(--color-success-500)' : h.tag === 'Listed' ? 'var(--color-brand-500)' : 'var(--color-gray-400)',
                  border:'3px solid var(--color-background)', boxSizing:'content-box',
                }}/>
                <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>
                  <span>{h.at.toUpperCase()}</span>
                  <HearingTag tag={h.tag}/>
                </div>
                <div style={{ fontSize:12, marginTop:5, lineHeight:1.5 }}>{h.label}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── 9) Mobile · Comments thread ────────────────────────────────────
const MobileComments = () => {
  const t = window.fvDataExtra.thread;
  return (
    <MPhonePage>
      <MTopBar title={'#' + t.complaintId} sub="Discussion · most endorsed"
        right={<Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, padding:'14px 14px 90px', overflow:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)', display:'flex', gap:10, alignItems:'center' }}>
          <I.FileText style={{ width:14, height:14, color:'var(--color-brand-600)' }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>IN REPLY TO #{t.complaintId}</div>
            <div style={{ fontSize:12, fontWeight:600, lineHeight:1.4, marginTop:2 }}>{t.title}</div>
          </div>
        </div>
        {t.nodes.slice(0,3).map(n => (
          <div key={n.id}>
            {!n.system && !n.removed && (
              <div style={{ display:'flex', gap:10 }}>
                <Avatar handle={n.handle} size={28}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{n.handle}</span>
                    {n.verified && <I.ShieldFill style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>}
                    <span style={{ fontSize:10, color:'var(--color-muted-foreground)' }}>· {n.when}</span>
                  </div>
                  <div style={{ fontSize:12.5, lineHeight:1.6 }}>{n.body}</div>
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    <button style={{
                      padding:'4px 9px', borderRadius:7, border:'1px solid var(--color-border)',
                      background:'var(--color-card)', cursor:'pointer', fontFamily:'inherit',
                      fontSize:11, color:'var(--color-foreground)', fontWeight:600,
                      display:'inline-flex', alignItems:'center', gap:5,
                    }}>
                      <I.ArrowUp style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                      <span style={{ fontFamily:'var(--font-mono)' }}>{n.votes}</span>
                    </button>
                    <button style={{
                      padding:'4px 9px', borderRadius:7, border:0,
                      background:'transparent', cursor:'pointer', fontFamily:'inherit',
                      fontSize:11, color:'var(--color-muted-foreground)',
                      display:'inline-flex', alignItems:'center', gap:5,
                    }}>
                      <I.MessageSq style={{ width:11, height:11 }}/> Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
            {n.system && (
              <div style={{
                padding:'10px 12px', borderRadius:10,
                background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
                display:'flex', gap:8, alignItems:'flex-start',
                fontSize:11.5, color:'var(--color-brand-900)', lineHeight:1.55,
              }}>
                <I.Sparkles style={{ width:12, height:12, color:'var(--color-brand-600)', flexShrink:0, marginTop:2 }}/>
                <div>
                  <strong>Pattern detector</strong>
                  <div style={{ marginTop:2 }}>{n.body}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 14px 14px', background:'var(--color-card)', borderTop:'1px solid var(--color-border)', display:'flex', gap:6 }}>
        <Avatar handle={window.fvData.me.handle} size={32}/>
        <div style={{ flex:1, padding:'10px 12px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)', fontSize:12, color:'var(--color-muted-foreground)' }}>
          Add a verified citizen comment…
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── 10) Mobile · Analytics ─────────────────────────────────────────
const MobileAnalytics = () => (
  <MPhonePage>
    <MTopBar title="Analytics" sub="Press dashboard · last 12 months"
      right={<Btn variant="ghost" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}/>}/>
    <div style={{ padding:'14px 14px 60px', display:'flex', flexDirection:'column', gap:14 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <Kpi value="1.42L" label="Complaints" sub="+18% YoY" tone="brand"/>
        <Kpi value="38%"   label="Resolution rate" tone="success"/>
        <Kpi value="47d"   label="Median response" tone="warning"/>
        <Kpi value="2,418" label="Leaders graded"/>
      </div>
      {/* trend */}
      <div style={{ padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
        <Overline>Volume · monthly</Overline>
        <div style={{ marginTop:8 }}>
          <Spark values={[0.3,0.34,0.38,0.42,0.46,0.50,0.54,0.60,0.66,0.74,0.84,0.92]} color="var(--color-brand-500)" width={300} height={60}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:6 }}>
          <span>JUN '25</span><span>MAY '26</span>
        </div>
      </div>
      {/* top categories */}
      <div>
        <Overline>By category</Overline>
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { c:'Infrastructure',    n:31420, p:0.95 },
            { c:'Police misconduct', n:21118, p:0.65 },
            { c:'RTI obstruction',   n:16121, p:0.50 },
            { c:'Healthcare',        n:13418, p:0.40 },
            { c:'Environment',       n:7220,  p:0.22 },
          ].map(r => (
            <div key={r.c} style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 50px', alignItems:'center', gap:8 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{r.c}</div>
                <RowBar value={r.p*100} max={100} height={5}/>
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', textAlign:'right' }}>{(r.n/1000).toFixed(1)}k</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MPhonePage>
);

// ─── 11) Mobile · Landing ───────────────────────────────────────────
const MobileLanding = () => (
  <MPhonePage>
    <div style={{
      padding:'16px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
      borderBottom:'1px solid var(--color-border)', background:'var(--color-card)',
    }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
        <FvMark size={26}/>
        <span style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em' }}>Factivist</span>
      </div>
      <Btn variant="ghost" size="sm">Sign in</Btn>
    </div>
    <div style={{ flex:1, overflow:'auto', padding:'24px 18px 30px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <Chip tone="primary" sm bordered>Anonymous · verified · on-chain</Chip>
        <h1 style={{ margin:'14px 0 0', fontSize:32, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
          The record<br/><span style={{ color:'var(--color-brand-600)' }}>politicians can't ignore.</span>
        </h1>
        <p style={{ margin:'12px 0 0', fontSize:13.5, lineHeight:1.65, color:'var(--color-gray-700)' }}>
          Aadhaar-verified, ZKP-anonymous civic complaints — anchored on Polygon, summarised into report cards your MP can't argue with.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:18 }}>
          <Btn variant="solid" tone="primary" size="lg" fullWidth iconRight={<I.ChevronR style={{ width:14, height:14 }}/>}>Verify with Aadhaar</Btn>
          <Btn variant="bordered" tone="default" size="md" fullWidth>Browse without an account</Btn>
        </div>
      </div>
      {/* card preview */}
      <div style={{
        padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <Avatar handle="citizen-K4L2M0" size={22}/>
          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>citizen-K4L2M0</span>
          <Chip tone="success" sm><I.ShieldFill style={{ width:9, height:9, marginRight:4 }}/>Anchored</Chip>
        </div>
        <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4 }}>FIR refused at Powai station for complaint against local builder</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, fontSize:10.5, color:'var(--color-muted-foreground)' }}>
          <I.MapPin style={{ width:10, height:10 }}/> Mumbai South
          <span>·</span>
          <I.ArrowUp style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>412</span>
        </div>
      </div>
      {/* metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <Kpi value="1.42L" label="Complaints" tone="brand"/>
        <Kpi value="1.84L" label="Verified citizens" tone="success"/>
        <Kpi value="2,418" label="Leaders graded" tone="warning"/>
        <Kpi value="4,182" label="Constituencies"/>
      </div>
      {/* how it works */}
      <div>
        <Overline>How it works</Overline>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
          {[
            ['01','Verify in private',   'Aadhaar QR on-device. ZKP says you are real, never who.'],
            ['02','File a complaint',     'Pick a category, draft the facts, attach evidence.'],
            ['03','Endorse · debate',     'Other verified citizens endorse and discuss.'],
            ['04','Hold leaders to it',   'Aggregated into report cards for every MP and MLA.'],
          ].map(([n,t,d]) => (
            <div key={n} style={{
              padding:'12px 14px', borderRadius:12,
              background:'var(--color-card)', border:'1px solid var(--color-border)',
              display:'flex', gap:12,
            }}>
              <span style={{
                fontFamily:'var(--font-mono)', fontSize:11,
                color:'var(--color-muted-foreground)', flexShrink:0, marginTop:2,
              }}>{n}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{t}</div>
                <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:3, lineHeight:1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </MPhonePage>
);

Object.assign(window, {
  MobileComplaintRegister, MobileComplaintView, MobileEndorse,
  MobileEmptyStates, MobileAccused, MobileAiChat, MobileConstituency,
  MobileJudicial, MobileComments, MobileAnalytics, MobileLanding,
});
