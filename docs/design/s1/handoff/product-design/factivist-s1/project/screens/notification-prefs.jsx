// Factivist — Notification preferences (desktop)

const ToggleSwitch = ({ checked, onChange, size='md' }) => {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const k = size === 'sm' ? 14 : 18;
  return (
    <button onClick={()=>onChange?.(!checked)} style={{
      width:w, height:h, borderRadius:99, border:0, cursor:'pointer',
      background: checked ? 'var(--color-brand-500)' : 'var(--color-gray-300)',
      position:'relative', transition:'background 0.15s var(--ease-standard)', padding:0,
    }}>
      <span style={{
        position:'absolute', top:2, left: checked ? (w - k - 2) : 2,
        width:k, height:k, borderRadius:'50%', background:'#fff',
        transition:'left 0.15s var(--ease-standard)',
      }}/>
    </button>
  );
};

const PrefRow = ({ rule }) => {
  const [push, setPush] = React.useState(rule.push);
  const [email, setEmail] = React.useState(rule.email);
  return (
    <div style={{
      padding:'14px 16px', borderRadius:12,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      display:'grid', gridTemplateColumns:'minmax(0,1fr) 80px 80px', alignItems:'center', gap:14,
    }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.3 }}>{rule.label}</div>
        <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:4, lineHeight:1.5 }}>{rule.sub}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <ToggleSwitch checked={push} onChange={setPush} size="sm"/>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>PUSH</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <ToggleSwitch checked={email} onChange={setEmail} size="sm"/>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>EMAIL</span>
      </div>
    </div>
  );
};

const NotificationPrefs = () => {
  const p = window.fvDataExtra.notifPrefs;
  const [channels, setChannels] = React.useState(p.channels);
  const [digest, setDigest] = React.useState(p.digests);

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Me</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Settings</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Notifications</span>
      </>} right={<Btn variant="bordered" tone="default" size="sm">Save changes</Btn>}/>

      <main style={{ maxWidth:920, margin:'0 auto', padding:'28px 24px 80px' }}>
        <div style={{ marginBottom:24 }}>
          <Overline>Settings</Overline>
          <h1 style={{ margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.025em' }}>Notifications</h1>
          <p style={{ margin:'8px 0 0', maxWidth:620, fontSize:13.5, color:'var(--color-muted-foreground)', lineHeight:1.6 }}>
            Anonymous push uses a rotating token, never your handle. Email is opt-in; you can use a one-way relay address if you want delivery without a static email on file.
          </p>
        </div>

        {/* Channels */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <SectionHead
            icon={<I.Bell style={{ width:16, height:16 }}/>}
            title="Channels"
            subtitle="Where we can reach you. None of these tie back to your identity."
          />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
            {[
              { k:'push',    l:'Push notifications', s:'On-device · rotating anonymous token' },
              { k:'inApp',   l:'In-app inbox',       s:'Persistent inbox inside the app' },
              { k:'email',   l:'Email digest',       s:'Optional · one-way relay supported' },
              { k:'webhook', l:'Webhook · for press',s:'POST event payloads to your URL' },
            ].map(c => (
              <div key={c.k} style={{
                padding:'14px 16px', borderRadius:12,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
                display:'flex', alignItems:'flex-start', gap:14,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.l}</div>
                  <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:4, lineHeight:1.5 }}>{c.s}</div>
                </div>
                <ToggleSwitch checked={channels[c.k]} onChange={(v)=>setChannels({ ...channels, [c.k]: v })}/>
              </div>
            ))}
          </div>
        </Card>

        {/* Digest cadence */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <SectionHead
            icon={<I.Calendar style={{ width:16, height:16 }}/>}
            title="Email digest cadence"
            subtitle="Aggregated summary of everything you missed."
          />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8 }}>
            {[
              { k:'realtime', l:'Real-time' },
              { k:'hourly',   l:'Hourly' },
              { k:'daily',    l:'Daily' },
              { k:'weekly',   l:'Weekly' },
              { k:'off',      l:'Off' },
            ].map(d => (
              <button key={d.k} onClick={()=>setDigest(d.k)} style={{
                padding:'10px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                background: digest === d.k ? 'var(--color-brand-500)' : 'var(--color-card)',
                color: digest === d.k ? '#fff' : 'var(--color-foreground)',
                border:'1.5px solid ' + (digest === d.k ? 'var(--color-brand-500)' : 'var(--color-border)'),
                fontSize:12.5, fontWeight:600,
              }}>{d.l}</button>
            ))}
          </div>
        </Card>

        {/* Quiet hours */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <SectionHead
            icon={<I.Lock style={{ width:16, height:16 }}/>}
            title="Quiet hours"
            subtitle="Mute push notifications between these hours."
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.4fr', gap:12, alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginBottom:5, fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>FROM</div>
              <Input value={p.quietStart}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginBottom:5, fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>UNTIL</div>
              <Input value={p.quietEnd}/>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--color-muted)', borderRadius:10, border:'1px solid var(--color-border)' }}>
              <ToggleSwitch checked={p.quietHonourCritical} onChange={()=>{}} size="sm"/>
              <span style={{ fontSize:12, color:'var(--color-foreground)' }}>Always alert on Critical Issues</span>
            </label>
          </div>
        </Card>

        {/* Per-event rules */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <SectionHead
            icon={<I.Sparkles style={{ width:16, height:16 }}/>}
            title="What to notify me about"
            subtitle="One row per event type. Push and email can be toggled independently."
          />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {p.rules.map(r => <PrefRow key={r.id} rule={r}/>)}
          </div>
        </Card>

        {/* Subscribed areas */}
        <Card pad={20} style={{ marginBottom:18 }}>
          <SectionHead
            icon={<I.MapPin style={{ width:16, height:16 }}/>}
            title="Subscribed areas"
            subtitle="Notifications scope to these constituencies, pincodes, and categories."
            right={<Btn variant="ghost" size="sm" icon={<I.Plus style={{ width:12, height:12 }}/>}>Add area</Btn>}
          />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {p.areas.map(a => (
              <div key={a.id} style={{
                padding:'10px 12px', borderRadius:10,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
                display:'flex', alignItems:'center', gap:12,
              }}>
                <I.MapPin style={{ width:14, height:14, color:'var(--color-brand-600)' }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{a.kind} · {a.count} complaints this term</div>
                </div>
                <Btn variant="ghost" size="sm" icon={<I.X style={{ width:11, height:11 }}/>}/>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12 }}>
            <Overline style={{ marginBottom:8 }}>Categories</Overline>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {p.categories.map(c => (
                <Chip key={c.id} tone="primary" sm bordered>{c.label} <I.X style={{ width:10, height:10, marginLeft:5, opacity:0.55 }}/></Chip>
              ))}
              <button style={{
                padding:'4px 10px', borderRadius:9999,
                border:'1px dashed var(--color-border)', background:'transparent',
                cursor:'pointer', fontFamily:'inherit', fontSize:11.5,
                color:'var(--color-brand-700)', fontWeight:600,
              }}>+ add category</button>
            </div>
          </div>
        </Card>

        {/* Privacy footer */}
        <Card pad={20} accent>
          <SectionHead
            icon={<I.ShieldFill style={{ width:16, height:16 }}/>}
            title="What we don't do"
            dense
          />
          <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
            {[
              'Push tokens rotate every 14 days and never bind to your nullifier.',
              'Email is delivered through a relay so we never log your real address.',
              'Webhook payloads strip your handle unless you opt-in per event.',
              'You can wipe every channel from the Privacy controls page.',
            ].map((l,i) => (
              <li key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55 }}>
                <I.Check style={{ width:12, height:12, color:'var(--color-brand-700)', flexShrink:0, marginTop:3 }}/>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
};

Object.assign(window, { NotificationPrefs, ToggleSwitch });
