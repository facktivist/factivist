// Factivist — Mobile companions for the Discovery / Me / Attestation flows.

// ─── Mobile · Discovery feed ────────────────────────────────────────
const MobileDiscoveryFeed = () => {
  const feed = window.fvDataExtra.feed.slice(0, 4);
  const [sort, setSort] = React.useState('hot');
  return (
    <MPhonePage>
      <div style={{
        padding:'12px 14px 8px', borderBottom:'1px solid var(--color-border)',
        background:'var(--color-card)', position:'sticky', top:0, zIndex:5,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>FEED</div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.02em', marginTop:2 }}>Mumbai South</div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <button style={{
              width:34, height:34, borderRadius:10, border:'1px solid var(--color-border)',
              background:'var(--color-card)', cursor:'pointer',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.Search style={{ width:14, height:14 }}/></button>
            <button style={{
              width:34, height:34, borderRadius:10, border:'1px solid var(--color-border)',
              background:'var(--color-card)', cursor:'pointer',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><I.Filter style={{ width:14, height:14 }}/></button>
          </div>
        </div>
        {/* sort pills */}
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:2 }}>
          {[
            { id:'hot',  label:'Hot',  icon:'Flash' },
            { id:'new',  label:'New',  icon:'Sparkles' },
            { id:'top',  label:'Top',  icon:'ArrowUp' },
            { id:'stuck',label:'Stuck',icon:'Calendar' },
          ].map(s => {
            const IconC = I[s.icon] || I.Sparkles;
            const isActive = sort === s.id;
            return (
              <button key={s.id} onClick={()=>setSort(s.id)} style={{
                flexShrink:0, padding:'6px 12px', borderRadius:9999, fontFamily:'inherit', cursor:'pointer',
                background: isActive ? 'var(--color-foreground)' : 'var(--color-muted)',
                color: isActive ? 'var(--color-background)' : 'var(--color-foreground)',
                border:'1px solid ' + (isActive ? 'var(--color-foreground)' : 'var(--color-border)'),
                fontSize:11.5, fontWeight:600,
                display:'inline-flex', alignItems:'center', gap:5,
              }}>
                <IconC style={{ width:10, height:10 }}/>{s.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ flex:1, padding:'12px 12px 90px', display:'flex', flexDirection:'column', gap:10, overflow:'auto' }}>
        {feed.map(c => (
          <article key={c.id} style={{
            padding:'14px 14px', borderRadius:14,
            background:'var(--color-card)', border:'1px solid var(--color-border)',
            display:'flex', flexDirection:'column', gap:10,
          }}>
            <header style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--color-muted-foreground)' }}>
              <Avatar handle={c.by} size={22}/>
              <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--color-foreground)' }}>{c.by}</span>
              <I.ShieldFill style={{ width:9, height:9, color:'var(--color-brand-600)' }}/>
              <span>· {c.when}</span>
              <span style={{ marginLeft:'auto' }}><StatusPill status={c.status}/></span>
            </header>
            <div style={{ display:'flex', gap:10 }}>
              <span style={{
                width:3, alignSelf:'stretch', borderRadius:99, flexShrink:0,
                background: SEVERITY_COLOR[c.severity] || 'var(--color-gray-300)',
              }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:5, marginBottom:5, flexWrap:'wrap', alignItems:'center' }}>
                  <Chip tone="default" sm bordered>{c.category}</Chip>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3, color:'var(--color-foreground)' }}>{c.title}</div>
                <div style={{ fontSize:12, color:'var(--color-gray-700)', marginTop:5, lineHeight:1.55,
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.body}</div>
              </div>
            </div>
            {c.criticalSoon && (
              <div style={{
                padding:'7px 10px', borderRadius:8,
                background:'var(--color-danger-50)', border:'1px solid var(--color-danger-200)',
                display:'flex', alignItems:'center', gap:7,
              }}>
                <I.Flash style={{ width:11, height:11, color:'var(--color-danger-600)' }}/>
                <span style={{ fontSize:11, color:'var(--color-danger-800)' }}><strong>16 to Critical</strong> · {c.trend}</span>
              </div>
            )}
            {c.status === 'Resolved' && (
              <div style={{
                padding:'7px 10px', borderRadius:8,
                background:'var(--color-success-50)', border:'1px solid var(--color-success-200)',
                display:'flex', alignItems:'center', gap:7,
              }}>
                <I.Check style={{ width:11, height:11, color:'var(--color-success-700)' }}/>
                <span style={{ fontSize:11, color:'var(--color-success-800)' }}>Attested by 17 citizens · Anchored as resolved</span>
              </div>
            )}
            <footer style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              paddingTop:8, borderTop:'1px solid var(--color-border)' }}>
              <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--color-muted-foreground)' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <I.ArrowUp style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.endorsements.toLocaleString()}</span>
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <I.MessageSq style={{ width:11, height:11 }}/>
                  <span style={{ fontFamily:'var(--font-mono)' }}>{c.comments}</span>
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <I.Paperclip style={{ width:11, height:11 }}/>
                  <span style={{ fontFamily:'var(--font-mono)' }}>{c.evidence}</span>
                </span>
              </div>
              {c.status !== 'Resolved' && (
                <button style={{
                  padding:'5px 10px', borderRadius:8, border:'1px solid var(--color-border)',
                  background:'var(--color-card)', cursor:'pointer', fontFamily:'inherit',
                  fontSize:11, fontWeight:600, color:'var(--color-foreground)',
                  display:'inline-flex', alignItems:'center', gap:5,
                }}>
                  <I.ArrowUp style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                  Endorse
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>
      <MBottomTabs active="home"/>
    </MPhonePage>
  );
};

// ─── Mobile · Profile / Me ──────────────────────────────────────────
const MobileProfileMe = () => {
  const me = window.fvDataExtra.me;
  const currentTier = SCORE_TIERS.slice().reverse().find(t => me.score >= t.threshold) || SCORE_TIERS[0];
  const nextTier = SCORE_TIERS.find(t => t.threshold > me.score);
  const progress = nextTier
    ? ((me.score - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100
    : 100;
  const [tab, setTab] = React.useState('complaints');

  return (
    <MPhonePage>
      <MTopBar title="Me" sub={me.handle}
        right={<Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 90px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Identity */}
        <div style={{
          padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Avatar handle={me.handle} size={52}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:600, color:'var(--color-brand-700)' }}>
                <I.ShieldFill style={{ width:10, height:10 }}/> VERIFIED CITIZEN
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, marginTop:2 }}>{me.handle}</div>
              <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{me.constituency} · joined {me.joined}</div>
            </div>
          </div>
          {/* Score */}
          <div style={{
            marginTop:12, padding:'10px 12px', borderRadius:10,
            background:'var(--color-muted)', border:'1px solid var(--color-border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>CIVIC SCORE</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:2 }}>
                  <span style={{ fontSize:22, fontWeight:800, color:currentTier.color, letterSpacing:'-0.02em' }}>{me.score}</span>
                  <Chip tone="default" sm bordered>{currentTier.name}</Chip>
                </div>
              </div>
              {nextTier && (
                <div style={{ textAlign:'right', fontSize:10, color:'var(--color-muted-foreground)' }}>
                  <span style={{ fontFamily:'var(--font-mono)' }}>{me.scoreToNext}</span> to {nextTier.name}
                </div>
              )}
            </div>
            <div style={{ height:5, background:'var(--color-gray-200)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ width: Math.min(100, progress) + '%', height:'100%', background: currentTier.color }}/>
            </div>
          </div>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:12 }}>
            <Kpi value={me.filed}    label="Filed"/>
            <Kpi value={me.endorsed} label="Endorsed"/>
            <Kpi value={me.attested} label="Attested" tone="success"/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:5, padding:3, background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:9999 }}>
          {[
            { id:'complaints', label:'Complaints' },
            { id:'activity',   label:'Activity' },
            { id:'badges',     label:'Badges' },
          ].map(t => {
            const isA = tab === t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flex:1, padding:'7px 0', borderRadius:9999, border:0, cursor:'pointer', fontFamily:'inherit',
                background: isA ? 'var(--color-foreground)' : 'transparent',
                color: isA ? 'var(--color-background)' : 'var(--color-foreground)',
                fontSize:11.5, fontWeight:600,
              }}>{t.label}</button>
            );
          })}
        </div>

        {tab === 'complaints' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {me.myComplaints.map(c => (
              <div key={c.id} style={{
                padding:'11px 12px', borderRadius:11,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)' }}>#{c.id}</span>
                  <StatusPill status={c.status}/>
                </div>
                <div style={{ fontSize:12.5, fontWeight:500, lineHeight:1.4 }}>{c.title}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, fontSize:10, color:'var(--color-muted-foreground)' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                    <I.ArrowUp style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.endorsements}</span>
                  </span>
                  <span>·</span>
                  <span>{c.when}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {me.activity.map((a,i) => {
              const cfg = {
                filed:    { i:'FileText',  c:'var(--color-brand-600)',   bg:'var(--color-brand-50)' },
                endorsed: { i:'ArrowUp',   c:'var(--color-success-700)', bg:'var(--color-success-50)' },
                attested: { i:'Check',     c:'var(--color-warning-700)', bg:'var(--color-warning-50)' },
                comment:  { i:'MessageSq', c:'var(--color-gray-600)',    bg:'var(--color-muted)' },
              }[a.kind];
              const IconC = I[cfg.i] || I.FileText;
              return (
                <div key={i} style={{
                  padding:'10px 12px', borderRadius:10,
                  background:'var(--color-card)', border:'1px solid var(--color-border)',
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background:cfg.bg, color:cfg.c,
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><IconC style={{ width:13, height:13 }}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, lineHeight:1.4 }}>{a.label}</div>
                    <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:3 }}>{a.when} · {a.meta}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'badges' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {me.badges.map(b => {
              const IconC = I[b.icon] || I.ShieldFill;
              return (
                <div key={b.id} style={{
                  padding:12, borderRadius:11,
                  background:'var(--color-muted)', border:'1px solid var(--color-border)',
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:7,
                    background:'var(--color-brand-500)', color:'#fff',
                    display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:6,
                  }}><IconC style={{ width:13, height:13 }}/></div>
                  <div style={{ fontSize:11.5, fontWeight:600, lineHeight:1.25 }}>{b.label}</div>
                  <div style={{ fontSize:9.5, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:3 }}>{b.earned.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Privacy strip */}
        <div style={{
          marginTop:6, padding:14, borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <I.ShieldFill style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
            <span style={{ fontSize:12.5, fontWeight:700, color:'var(--color-brand-900)' }}>Privacy report</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {[
              ['Name', '(none)'],
              ['Phone / email', '(none)'],
              ['Aadhaar', '(never stored)'],
              ['Location', 'Constituency only'],
              ['Nullifier', me.privacy.nullifier],
            ].map(([k,v], i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--color-brand-900)' }}>
                <span>{k}</span>
                <span style={{ fontFamily: k === 'Nullifier' ? 'var(--font-mono)' : 'inherit', fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MBottomTabs active="me"/>
    </MPhonePage>
  );
};

// ─── Mobile · Resolution attestation ────────────────────────────────
const MobileAttestation = () => {
  const a = window.fvDataExtra.attestation;
  const remaining = a.needed - a.attested;
  return (
    <MPhonePage>
      <MTopBar title="Citizen attestation" sub={'#' + a.complaintId + ' · ' + a.category}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 110px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Hero */}
        <div style={{
          padding:14, borderRadius:14,
          background:'var(--color-card)', border:'1px solid var(--color-border)',
        }}>
          <div style={{ display:'flex', gap:5, marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
            <Chip tone="warning" sm>Resolution claimed</Chip>
            <Chip tone="default" sm bordered>{a.severity}</Chip>
          </div>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.015em', lineHeight:1.3 }}>{a.title}</div>
          <div style={{
            marginTop:12, padding:10, borderRadius:10,
            background:'var(--color-muted)', border:'1px solid var(--color-border)',
            fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.55,
          }}>
            <strong>{a.resolutionClaimedBy}</strong> claims this is resolved on {a.resolutionClaimedOn}. <strong>{remaining} more</strong> attestations needed before it anchors as Resolved.
          </div>
          {/* Ring */}
          <div style={{ display:'flex', justifyContent:'center', marginTop:14 }}>
            <AttestationRing filled={a.attested} total={a.needed} size={170}/>
          </div>
        </div>

        {/* Evidence */}
        <div>
          <Overline>Evidence of resolution</Overline>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            {a.evidence.map(e => {
              const IconC = e.kind === 'Video' ? I.FileText : I.MapPin;
              return (
                <div key={e.label}>
                  <div style={{
                    aspectRatio:'4/3', borderRadius:9, border:'1px solid var(--color-border)',
                    background: e.kind === 'Video' ? 'var(--color-muted)' : 'linear-gradient(135deg, var(--color-gray-200), var(--color-gray-300))',
                    display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
                  }}>
                    <IconC style={{ width:24, height:24, color:'var(--color-gray-600)' }}/>
                    <span style={{
                      position:'absolute', top:6, left:6, padding:'2px 6px',
                      background:'rgba(0,0,0,0.65)', color:'#fff',
                      borderRadius:5, fontSize:8.5, fontWeight:700, letterSpacing:'0.06em', fontFamily:'var(--font-mono)',
                    }}>{e.kind.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:10.5, fontWeight:600, marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent attesters */}
        <div>
          <Overline>Latest attesters · {a.attesters.length}/{a.needed}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:8 }}>
            {a.attesters.slice(0, 3).map(at => (
              <div key={at.handle} style={{
                padding:'9px 11px', borderRadius:10,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <Avatar handle={at.handle} size={26}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, fontWeight:600 }}>{at.handle} <span style={{ color:'var(--color-muted-foreground)', fontWeight:400, marginLeft:4 }}>· {at.when}</span></div>
                  {at.note && <div style={{ fontSize:11.5, color:'var(--color-foreground)', marginTop:3, lineHeight:1.5 }}>{at.note}</div>}
                </div>
                <span style={{
                  width:20, height:20, borderRadius:5, flexShrink:0,
                  background:'var(--color-success-500)', color:'#fff',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><I.Check style={{ width:10, height:10 }}/></span>
              </div>
            ))}
            <button style={{
              padding:'7px', borderRadius:9, border:'1px dashed var(--color-border)',
              background:'transparent', cursor:'pointer', fontFamily:'inherit',
              fontSize:11, color:'var(--color-brand-700)', fontWeight:600,
            }}>See all {a.attesters.length} attesters</button>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          padding:14, borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <I.ShieldFill style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
            <span style={{ fontSize:12.5, fontWeight:700, color:'var(--color-brand-900)' }}>How attestation works</span>
          </div>
          <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:5 }}>
            {[
              '15 distinct verified citizens must attest to anchor as Resolved.',
              '3 disputes freeze the claim and open a moderator appeal.',
              'Original filer cannot attest their own resolution.',
            ].map((l,i) => (
              <li key={i} style={{ display:'flex', gap:8, fontSize:11.5, color:'var(--color-brand-900)', lineHeight:1.55 }}>
                <span style={{ flexShrink:0, fontFamily:'var(--font-mono)', color:'var(--color-brand-700)', fontWeight:600 }}>{String(i+1).padStart(2,'0')}</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{
        position:'sticky', bottom:0, padding:'10px 14px 14px',
        background:'var(--color-card)', borderTop:'1px solid var(--color-border)',
        display:'flex', gap:6,
      }}>
        <button style={{
          flex:1, padding:'11px 8px', borderRadius:11, border:0, cursor:'pointer', fontFamily:'inherit',
          background:'var(--color-success-500)', color:'#fff',
          fontSize:12.5, fontWeight:700,
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
        }}>
          <I.Check style={{ width:13, height:13 }}/> Attest
        </button>
        <button style={{
          flex:1, padding:'11px 8px', borderRadius:11, border:'1px solid var(--color-danger-200)', cursor:'pointer', fontFamily:'inherit',
          background:'var(--color-card)', color:'var(--color-danger-800)',
          fontSize:12.5, fontWeight:700,
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:5,
        }}>
          <I.X style={{ width:13, height:13 }}/> Dispute
        </button>
        <button style={{
          padding:'11px 12px', borderRadius:11, border:'1px solid var(--color-border)', cursor:'pointer', fontFamily:'inherit',
          background:'var(--color-card)', color:'var(--color-foreground)',
          fontSize:12.5, fontWeight:600,
        }}>
          Abstain
        </button>
      </div>
    </MPhonePage>
  );
};

Object.assign(window, { MobileDiscoveryFeed, MobileProfileMe, MobileAttestation });
