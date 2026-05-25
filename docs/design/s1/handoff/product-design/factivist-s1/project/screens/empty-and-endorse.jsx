// Factivist — Empty states + Endorse confirmation modal
// Six empty surfaces + one modal. Composable enough to drop into any screen.

const EmptyShell = ({ icon, title, sub, primaryLabel, secondaryLabel, examples, art, accent=false }) => {
  const IconC = icon ? I[icon] : null;
  return (
    <div style={{
      padding:'40px 32px', borderRadius:18,
      background:'var(--color-card)', border:'1px dashed var(--color-border)',
      display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:14,
      maxWidth:560, margin:'0 auto',
    }}>
      {art ? art : IconC && (
        <div style={{
          width:64, height:64, borderRadius:18,
          background: accent ? 'var(--color-brand-50)' : 'var(--color-muted)',
          border: accent ? '1px solid var(--color-brand-200)' : '1px solid var(--color-border)',
          color: accent ? 'var(--color-brand-600)' : 'var(--color-muted-foreground)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <IconC style={{ width:30, height:30 }}/>
        </div>
      )}
      <h3 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1.2, color:'var(--color-foreground)', textWrap:'balance' }}>{title}</h3>
      <p style={{ margin:0, fontSize:13.5, lineHeight:1.6, color:'var(--color-muted-foreground)', textWrap:'pretty', maxWidth:420 }}>{sub}</p>
      {examples && (
        <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
          {examples.map(e => (
            <span key={e} style={{
              padding:'6px 10px', background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:9999,
              fontSize:11.5, color:'var(--color-foreground)', cursor:'pointer',
            }}>{e}</span>
          ))}
        </div>
      )}
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        {primaryLabel && <Btn variant="solid" tone="primary" size="md" icon={<I.Plus style={{ width:13, height:13 }}/>}>{primaryLabel}</Btn>}
        {secondaryLabel && <Btn variant="ghost" size="md">{secondaryLabel}</Btn>}
      </div>
    </div>
  );
};

// Decorative SVG for a few empties — keeps them from feeling repetitive
const FeedArt = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
    <rect x="6" y="14" width="80" height="10" rx="3" fill="var(--color-gray-200)"/>
    <rect x="6" y="30" width="58" height="8" rx="3" fill="var(--color-gray-200)"/>
    <rect x="6" y="48" width="80" height="10" rx="3" fill="var(--color-gray-200)"/>
    <rect x="6" y="64" width="42" height="8" rx="3" fill="var(--color-gray-200)"/>
    <circle cx="100" cy="58" r="20" fill="var(--color-brand-100)" stroke="var(--color-brand-300)" strokeDasharray="2 3"/>
    <path d="M100 50 v16 M92 58 h16" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CommentsArt = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
    <rect x="14" y="16" width="80" height="22" rx="6" fill="var(--color-muted)" stroke="var(--color-border)"/>
    <rect x="22" y="22" width="38" height="4" rx="2" fill="var(--color-gray-300)"/>
    <rect x="22" y="30" width="58" height="4" rx="2" fill="var(--color-gray-300)"/>
    <rect x="30" y="46" width="80" height="22" rx="6" fill="var(--color-brand-50)" stroke="var(--color-brand-200)" strokeDasharray="3 3"/>
    <rect x="38" y="52" width="32" height="4" rx="2" fill="var(--color-brand-300)"/>
    <rect x="38" y="60" width="50" height="4" rx="2" fill="var(--color-brand-300)"/>
  </svg>
);

const SearchArt = () => (
  <svg width="100" height="80" viewBox="0 0 100 80" fill="none">
    <circle cx="42" cy="38" r="24" fill="var(--color-muted)" stroke="var(--color-border)"/>
    <circle cx="42" cy="38" r="14" fill="var(--color-background)" stroke="var(--color-gray-400)" strokeDasharray="2 3"/>
    <line x1="62" y1="56" x2="82" y2="76" stroke="var(--color-gray-500)" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const EmptyStates = () => {
  // Used as an artboard — show all empties on a labeled grid.
  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Design library</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Empty states</span>
      </>} right={<Chip tone="default" sm bordered>6 patterns</Chip>}/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 60px' }}>
        <div style={{ marginBottom:22 }}>
          <Overline>Empty states</Overline>
          <h1 style={{ margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.025em' }}>What you see before you have anything</h1>
          <p style={{ margin:'8px 0 0', maxWidth:680, fontSize:13.5, color:'var(--color-muted-foreground)', lineHeight:1.6 }}>
            Each empty state has to do three jobs: explain why it's empty, suggest one concrete action, and give two example actions that scaffold the next 30 seconds. No exclamation marks. No emoji.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* 01 First-time feed */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>01 · FEED</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· first-time user, just verified</span>
            </div>
            <EmptyShell
              art={<FeedArt/>}
              title="Your feed warms up as you tell it what matters."
              sub="Follow a few constituencies, categories, or POIs and we'll surface anchored complaints as they arrive."
              examples={['Mumbai South','Police misconduct','RTI obstruction','Builder POIs','My pincode']}
              primaryLabel="File the first complaint"
              secondaryLabel="Browse trending"
            />
          </div>

          {/* 02 Search no results */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>02 · SEARCH</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· query returns nothing</span>
            </div>
            <EmptyShell
              art={<SearchArt/>}
              title='Nothing anchored for "powai builder NCR"'
              sub="No verified complaint matched that exact phrase. Try a category, drop a quote, or expand to your state."
              examples={['Police misconduct in Powai','Builder POIs · Mumbai','Try Ask AI instead']}
              primaryLabel="File this as a new complaint"
              secondaryLabel="Save as alert"
            />
          </div>

          {/* 03 Comments empty */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>03 · COMMENTS</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· no thread yet</span>
            </div>
            <EmptyShell
              art={<CommentsArt/>}
              title="Be the first verified voice on this complaint."
              sub="Cite precedent, link an RTI thread, share what your station said. Llama Guard auto-moderates against personal attacks."
              examples={['Cite §154(3) CrPC','Link an RTI thread','Share a similar case']}
              primaryLabel="Write the first comment"
              accent
            />
          </div>

          {/* 04 Notifications inbox zero */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>04 · NOTIFICATIONS</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· inbox zero</span>
            </div>
            <EmptyShell
              icon="Bell"
              title="You're caught up."
              sub="No new responses, milestones, or area alerts since you last checked. We'll buzz you when a complaint you endorsed crosses a threshold."
              primaryLabel="Subscribe to my constituency"
              secondaryLabel="Adjust quiet hours"
            />
          </div>

          {/* 05 Endorse — already endorsed */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>05 · ENDORSE</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· already endorsed</span>
            </div>
            <EmptyShell
              icon="Check"
              title="You've already endorsed this."
              sub="Your endorsement is one of 412 anchored on Polygon. You can't endorse twice — one citizen, one voice, by design."
              examples={['Share this complaint','Endorse a related one','Watch for replies']}
              accent
            />
          </div>

          {/* 06 New citizen — no draft */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>06 · DRAFTS</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· nothing in progress</span>
            </div>
            <EmptyShell
              icon="FileText"
              title="No drafts on this device."
              sub="Drafts live on your phone, never on our servers. Start one — we'll auto-save every few seconds."
              primaryLabel="Start a new complaint"
              secondaryLabel="Browse templates"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Endorse confirmation modal ────────────────────────────────────
const EndorseModal = ({ stage='confirm' }) => {
  // stage: 'confirm' | 'anchoring' | 'done'
  const c = window.fvDataExtra.complaintDetail;
  return (
    <div style={{
      width:480, padding:24, borderRadius:20,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      boxShadow:'0 24px 60px -20px rgba(0,0,0,0.25)',
    }}>
      {stage === 'confirm' && (
        <>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:18 }}>
            <div style={{
              width:44, height:44, borderRadius:12, flexShrink:0,
              background:'var(--color-brand-500)', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.ArrowUp style={{ width:22, height:22 }}/></div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.015em', lineHeight:1.25 }}>Endorse this complaint</div>
              <div style={{ fontSize:12.5, color:'var(--color-muted-foreground)', marginTop:4, lineHeight:1.55 }}>
                Endorsements are anchored to your unique citizen nullifier. One citizen, one endorsement, immutable.
              </div>
            </div>
          </div>

          <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--color-muted-foreground)', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--font-mono)' }}>#{c.id}</span>
              <Chip tone="danger" sm>{c.severity}</Chip>
            </div>
            <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4 }}>{c.title}</div>
          </div>

          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', marginBottom:8 }}>Endorse because…</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                ['firsthand','I have first-hand knowledge of this happening'],
                ['witness',  'I witnessed something similar at the same place'],
                ['evidence', "I have evidence (RTI, FIR, photo) supporting this"],
                ['precedent','I cite a precedent or pattern in the comments'],
              ].map(([k, label], i) => (
                <label key={k} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', borderRadius:10,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  cursor:'pointer',
                }}>
                  <span style={{
                    width:18, height:18, borderRadius:5, flexShrink:0,
                    background: i===0 ? 'var(--color-brand-500)' : 'var(--color-card)',
                    border:'1.5px solid ' + (i===0 ? 'var(--color-brand-500)' : 'var(--color-gray-300)'),
                    color:'#fff',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {i===0 && <I.Check style={{ width:11, height:11 }}/>}
                  </span>
                  <span style={{ fontSize:12.5, color:'var(--color-foreground)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{
            padding:'10px 12px', borderRadius:10, marginBottom:18,
            background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <I.ShieldFill style={{ width:14, height:14, color:'var(--color-brand-600)', flexShrink:0, marginTop:2 }}/>
            <div style={{ fontSize:11.5, color:'var(--color-brand-900)', lineHeight:1.55 }}>
              You will appear as <strong style={{ fontFamily:'var(--font-mono)' }}>{window.fvData.me.handle}</strong>. No personal data is recorded against this endorsement.
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" size="md">Cancel</Btn>
            <Btn variant="solid" tone="primary" size="md" icon={<I.ShieldFill style={{ width:14, height:14 }}/>}>Endorse · anchor on chain</Btn>
          </div>
        </>
      )}

      {stage === 'done' && (
        <>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'18px 0 14px' }}>
            <div style={{
              width:72, height:72, borderRadius:'50%',
              background:'var(--color-success-100)', color:'var(--color-success-700)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.Check style={{ width:32, height:32 }}/></div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em' }}>Endorsement anchored.</div>
              <div style={{ fontSize:13, color:'var(--color-muted-foreground)', marginTop:4, lineHeight:1.55 }}>
                You're the <strong style={{ color:'var(--color-foreground)' }}>{c.endorsements + 1}th</strong> citizen on this complaint.
              </div>
            </div>
          </div>

          <div style={{
            padding:'12px 14px', borderRadius:12,
            background:'var(--color-gray-950)', color:'var(--color-gray-100)',
            border:'1px solid var(--color-gray-800)',
            fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.65, marginBottom:14,
          }}>
            <div style={{ color:'oklch(0.78 0.16 145)', fontWeight:700, letterSpacing:'0.06em', marginBottom:6 }}>RECEIPT</div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'oklch(0.62 0.012 270)' }}>tx</span><span>0x9c2f1a…d4b7</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'oklch(0.62 0.012 270)' }}>block</span><span>71,184,447</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'oklch(0.62 0.012 270)' }}>anchored at</span><span>14 May 12:08 IST</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="ghost" size="md" fullWidth>Done</Btn>
            <Btn variant="solid" tone="primary" size="md" fullWidth iconRight={<I.ChevronR style={{ width:14, height:14 }}/>}>See related complaints</Btn>
          </div>
        </>
      )}
    </div>
  );
};

// Show both endorsement states side-by-side on one artboard
const EndorseFlowArtboard = () => (
  <div style={{
    background: 'var(--color-background)', minHeight:'100%',
    padding:'40px 30px', display:'flex', flexDirection:'column', gap:30,
  }}>
    <div>
      <Overline>Endorse flow</Overline>
      <h1 style={{ margin:'8px 0 0', fontSize:24, fontWeight:800, letterSpacing:'-0.02em' }}>Two states · confirm and anchored</h1>
      <p style={{ margin:'8px 0 0', maxWidth:680, fontSize:13, color:'var(--color-muted-foreground)', lineHeight:1.6 }}>
        Endorsement is a write to the chain. We treat it like one — explicit consent, a reason, a receipt.
      </p>
    </div>
    <div style={{ display:'flex', gap:32, justifyContent:'center', alignItems:'flex-start', flexWrap:'wrap' }}>
      <div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em', marginBottom:8, textAlign:'center' }}>01 · CONFIRM</div>
        <EndorseModal stage="confirm"/>
      </div>
      <div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em', marginBottom:8, textAlign:'center' }}>02 · ANCHORED</div>
        <EndorseModal stage="done"/>
      </div>
    </div>
  </div>
);

Object.assign(window, { EmptyStates, EndorseModal, EndorseFlowArtboard });
