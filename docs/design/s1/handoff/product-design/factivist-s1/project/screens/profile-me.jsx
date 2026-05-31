// Factivist — Me / Profile (desktop)
// "Your civic record." Two-column.
//   LEFT: identity + civic score + my complaints + activity timeline
//   RIGHT: badges, privacy report, account settings entry points

const SCORE_TIERS = [
  { name:'Citizen',  threshold:0,    color:'var(--color-gray-500)' },
  { name:'Engaged',  threshold:500,  color:'var(--color-brand-500)' },
  { name:'Trusted',  threshold:1000, color:'var(--color-success-600)' },
  { name:'Custodian',threshold:2500, color:'var(--color-warning-700)' },
];

const ActivityRow = ({ a }) => {
  const cfg = {
    filed:    { icon:'FileText', color:'var(--color-brand-600)',   bg:'var(--color-brand-50)',    label:'Filed' },
    endorsed: { icon:'ArrowUp',  color:'var(--color-success-700)', bg:'var(--color-success-50)',  label:'Endorsed' },
    attested: { icon:'Check',    color:'var(--color-warning-700)', bg:'var(--color-warning-50)',  label:'Attested resolution' },
    comment:  { icon:'MessageSq',color:'var(--color-gray-600)',    bg:'var(--color-muted)',       label:'Commented' },
  }[a.kind];
  const IconC = I[cfg.icon] || I.FileText;
  return (
    <div style={{
      display:'flex', gap:12, alignItems:'flex-start',
      padding:'12px 14px', borderRadius:12,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
    }}>
      <div style={{
        width:32, height:32, borderRadius:9, flexShrink:0,
        background:cfg.bg, color:cfg.color,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><IconC style={{ width:14, height:14 }}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontSize:11, fontWeight:600, color:cfg.color, fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>{cfg.label.toUpperCase()}</span>
          <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· {a.when}</span>
        </div>
        <div style={{ fontSize:13, color:'var(--color-foreground)', lineHeight:1.4 }}>{a.label}</div>
        {a.meta && <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4, fontFamily:'var(--font-mono)' }}>{a.meta}</div>}
      </div>
    </div>
  );
};

const ProfileMe = () => {
  const me = window.fvDataExtra.me;
  const currentTier = SCORE_TIERS.slice().reverse().find(t => me.score >= t.threshold) || SCORE_TIERS[0];
  const nextTier = SCORE_TIERS.find(t => t.threshold > me.score);
  const progress = nextTier
    ? ((me.score - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100
    : 100;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Me</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>{me.handle}</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share my page</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Settings</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Identity strip */}
        <Card pad={0} style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px' }}>
            <div style={{ padding:'26px 28px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <Avatar handle={me.handle} size={72}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:'var(--color-brand-700)', fontSize:11, fontWeight:600 }}>
                      <I.ShieldFill style={{ width:11, height:11 }}/>
                      Verified citizen
                    </span>
                    <Chip tone="default" sm bordered>{me.constituency}</Chip>
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color:'var(--color-foreground)' }}>{me.handle}</div>
                  <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:4 }}>
                    Joined {me.joined} · {me.state}
                  </div>
                </div>
              </div>

              {/* Civic score */}
              <div style={{
                padding:'14px 16px', background:'var(--color-muted)',
                border:'1px solid var(--color-border)', borderRadius:14,
                display:'flex', flexDirection:'column', gap:10,
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>CIVIC SCORE</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:4 }}>
                      <span style={{ fontSize:30, fontWeight:800, letterSpacing:'-0.02em', color: currentTier.color }}>{me.score}</span>
                      <Chip tone="default" sm bordered>{currentTier.name}</Chip>
                    </div>
                  </div>
                  {nextTier && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>NEXT</div>
                      <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{nextTier.name}</div>
                      <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{me.scoreToNext} to go</div>
                    </div>
                  )}
                </div>
                <div style={{ height:6, background:'var(--color-gray-200)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width: Math.min(100, progress) + '%', height:'100%', background: currentTier.color }}/>
                </div>
              </div>
            </div>

            {/* Right: counts */}
            <div style={{
              borderLeft:'1px solid var(--color-border)',
              background:'var(--color-muted)',
              padding:'26px 24px',
              display:'flex', flexDirection:'column', gap:14,
            }}>
              <Overline>This term</Overline>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Kpi value={me.filed}     label="Complaints filed"/>
                <Kpi value={me.endorsed}  label="Endorsements given"/>
                <Kpi value={me.attested}  label="Resolutions attested" tone="success"/>
                <Kpi value={me.followers + ' / ' + me.following} label="Followers · following"/>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.4fr) 1fr', gap:20 }}>
          {/* LEFT — complaints + activity */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card pad={22}>
              <SectionHead
                icon={<I.FileText style={{ width:16, height:16 }}/>}
                title="My complaints"
                subtitle={me.myComplaints.length + ' anchored · ' + me.myComplaints.filter(c=>c.status==='Resolved').length + ' resolved'}
                right={<div style={{ display:'flex', gap:5 }}>
                  <Chip tone="primary" sm bordered>All</Chip>
                  <Chip tone="default" sm bordered>Open</Chip>
                  <Chip tone="default" sm bordered>Resolved</Chip>
                </div>}
              />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {me.myComplaints.map(c => (
                  <button key={c.id} style={{
                    textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                    padding:'12px 14px', borderRadius:12,
                    background:'var(--color-card)', border:'1px solid var(--color-border)',
                    display:'grid', gridTemplateColumns:'minmax(0,1fr) auto auto auto', alignItems:'center', gap:12,
                  }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                        <StatusPill status={c.status}/>
                      </div>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--color-foreground)', lineHeight:1.4 }}>{c.title}</div>
                    </div>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12 }}>
                      <I.ArrowUp style={{ width:12, height:12, color:'var(--color-brand-600)' }}/>
                      <span style={{ fontFamily:'var(--font-mono)' }}>{c.endorsements}</span>
                    </span>
                    <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{c.when}</span>
                    <I.ChevronR style={{ width:13, height:13, color:'var(--color-muted-foreground)' }}/>
                  </button>
                ))}
              </div>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.Sparkles style={{ width:16, height:16 }}/>}
                title="Activity"
                subtitle="Filing, endorsing, attesting. Visible only to you."
              />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {me.activity.map((a, i) => <ActivityRow key={i} a={a}/>)}
              </div>
            </Card>
          </div>

          {/* RIGHT — privacy, badges, settings */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card pad={22} accent>
              <SectionHead
                icon={<I.ShieldFill style={{ width:16, height:16 }}/>}
                title="Privacy report"
                subtitle="What the platform actually knows about you."
                dense
              />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { l:'Name on file',     v:'(none)' },
                  { l:'Phone / email',    v:'(none)' },
                  { l:'Aadhaar number',   v:'(never stored)' },
                  { l:'Location accuracy',v:'Constituency only' },
                  { l:'Your nullifier',   v:me.privacy.nullifier, mono:true },
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderTop: i===0 ? 'none' : '1px solid var(--color-brand-200)' }}>
                    <span style={{ fontSize:11.5, color:'var(--color-brand-900)' }}>{r.l}</span>
                    <span style={{ fontSize:11.5, fontWeight:600, color:'var(--color-brand-900)', fontFamily: r.mono ? 'var(--font-mono)' : 'inherit' }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>} style={{ marginTop:10 }}>Read the Trust Report</Btn>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.Sparkles style={{ width:16, height:16 }}/>}
                title="Badges"
                subtitle={me.badges.length + ' earned'}
                dense
              />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                {me.badges.map(b => {
                  const IconC = I[b.icon] || I.ShieldFill;
                  return (
                    <div key={b.id} style={{
                      padding:'12px 12px', borderRadius:12,
                      background:'var(--color-muted)', border:'1px solid var(--color-border)',
                      display:'flex', flexDirection:'column', gap:6,
                    }}>
                      <div style={{
                        width:32, height:32, borderRadius:8,
                        background:'var(--color-brand-500)', color:'#fff',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                      }}><IconC style={{ width:14, height:14 }}/></div>
                      <div>
                        <div style={{ fontSize:11.5, fontWeight:600, lineHeight:1.3 }}>{b.label}</div>
                        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:2 }}>EARNED {b.earned.toUpperCase()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card pad={22}>
              <SectionHead
                icon={<I.Sparkles style={{ width:16, height:16 }}/>}
                title="Account"
                dense
              />
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {[
                  ['Bell',       'Notification preferences', 'Categories, quiet hours, alerts'],
                  ['MapPin',     'Subscribed areas',         '3 constituencies · 2 categories'],
                  ['Lock',       'Privacy controls',         'Visibility, blocking, data export'],
                  ['ShieldFill', 'Verification',             'Re-verify · backup keys'],
                  ['FileText',   'Citizen Charter',          'Read and reaffirm'],
                ].map(([icon, label, sub], i) => {
                  const IconC = I[icon] || I.FileText;
                  return (
                    <button key={i} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 12px', borderRadius:10,
                      background:'transparent', border:0, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    }}
                      onMouseEnter={(e)=>{ e.currentTarget.style.background = 'var(--color-muted)'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.background = 'transparent'; }}>
                      <IconC style={{ width:15, height:15, color:'var(--color-brand-600)' }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                        <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{sub}</div>
                      </div>
                      <I.ChevronR style={{ width:13, height:13, color:'var(--color-muted-foreground)' }}/>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ProfileMe });
