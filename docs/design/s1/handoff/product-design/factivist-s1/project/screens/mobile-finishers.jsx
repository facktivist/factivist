// Factivist — Mobile companions for the Tier 1 + Tier 2 finishers:
// Search, Evidence viewer, Notification prefs, Shareable complaint card,
// Promise tracking deep view.

// ─── Mobile · Search ────────────────────────────────────────────────
const MobileSearch = () => {
  const r = window.fvDataExtra.searchResults;
  const [facet, setFacet] = React.useState('all');
  return (
    <MPhonePage>
      <div style={{
        padding:'12px 14px', borderBottom:'1px solid var(--color-border)',
        background:'var(--color-card)', position:'sticky', top:0, zIndex:5,
        display:'flex', alignItems:'center', gap:8,
      }}>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
          background:'transparent', cursor:'pointer', flexShrink:0,
          display:'inline-flex', alignItems:'center', justifyContent:'center', color:'inherit',
        }}>
          <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
            <I.ChevronR style={{ width:14, height:14 }}/>
          </span>
        </button>
        <div style={{
          flex:1, padding:'8px 11px', borderRadius:10,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
          display:'flex', alignItems:'center', gap:7,
        }}>
          <I.Search style={{ width:13, height:13, color:'var(--color-muted-foreground)' }}/>
          <span style={{ fontSize:12.5, fontWeight:500, color:'var(--color-foreground)' }}>{r.query}</span>
        </div>
      </div>
      {/* Facet scroller */}
      <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid var(--color-border)', background:'var(--color-card)' }}>
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:2 }}>
          {r.facets.map(f => {
            const isA = facet === f.id;
            return (
              <button key={f.id} onClick={()=>setFacet(f.id)} style={{
                flexShrink:0, padding:'5px 10px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
                background: isA ? 'var(--color-foreground)' : 'var(--color-muted)',
                color: isA ? 'var(--color-background)' : 'var(--color-foreground)',
                border:'1px solid ' + (isA ? 'var(--color-foreground)' : 'var(--color-border)'),
                fontSize:11.5, fontWeight:600,
                display:'inline-flex', alignItems:'center', gap:5,
              }}>
                {f.label}
                <span style={{ fontFamily:'var(--font-mono)', fontSize:9, opacity:0.7 }}>{f.n}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ flex:1, padding:'14px 14px 80px', overflow:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <Overline>Complaints · {r.complaints.length}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
            {r.complaints.map(c => (
              <div key={c.id} style={{
                padding:'11px 12px', borderRadius:11,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                  <StatusPill status={c.status}/>
                  <Chip tone="danger" sm>{c.severity}</Chip>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', marginLeft:'auto' }}>#{c.id}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4 }}>
                  <Highlight html={c.title}/>
                </div>
                <div style={{ fontSize:11, color:'var(--color-gray-700)', marginTop:5, lineHeight:1.5,
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  <Highlight html={c.body}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, fontSize:10, color:'var(--color-muted-foreground)' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                    <I.ArrowUp style={{ width:9, height:9, color:'var(--color-brand-600)' }}/>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{c.endorsements}</span>
                  </span>
                  <span>· {c.constituency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Overline>POI · {r.poi.length}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
            {r.poi.map(p => (
              <div key={p.id} style={{
                padding:'11px 12px', borderRadius:11,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:9, flexShrink:0,
                  background:'var(--color-gray-900)', color:'#fff',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                }}>{p.name.split(' ').filter(s=>s[0]!=='"').slice(0,2).map(s=>s[0]).join('')}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:12.5, fontWeight:700 }}>{p.name}</span>
                    <Chip tone="danger" sm>{p.risk}</Chip>
                  </div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2 }}>{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Overline>Court cases · {r.cases.length}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
            {r.cases.map(c => (
              <div key={c.id} style={{
                padding:'11px 12px', borderRadius:11,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10.5, fontWeight:600 }}>{c.id}</span>
                  <Chip tone="warning" sm>{c.status}</Chip>
                </div>
                <div style={{ fontSize:12, fontWeight:500, lineHeight:1.4 }}>
                  <Highlight html={c.matter}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Evidence viewer (full-screen pager) ──────────────────
const MobileEvidenceViewer = () => {
  const files = window.fvDataExtra.viewerEvidence;
  const [idx, setIdx] = React.useState(3); // PDF default
  const f = files[idx];
  return (
    <MPhonePage dark>
      {/* Top bar */}
      <div style={{
        padding:'12px 14px', borderBottom:'1px solid oklch(0.28 0.005 270)',
        background:'oklch(0.135 0.005 270)', color:'#fff',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid oklch(0.30 0.005 270)',
          background:'transparent', cursor:'pointer', color:'inherit', flexShrink:0,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.X style={{ width:14, height:14 }}/></button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'oklch(0.78 0.16 250)', letterSpacing:'0.08em', fontWeight:700 }}>{f.kind.toUpperCase()} · {idx+1}/{files.length}</div>
          <div style={{ fontSize:12.5, fontWeight:600, marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.label}</div>
        </div>
        <button style={{
          width:32, height:32, borderRadius:8, border:'1px solid oklch(0.30 0.005 270)',
          background:'transparent', cursor:'pointer', color:'inherit', flexShrink:0,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}><I.FileText style={{ width:13, height:13 }}/></button>
      </div>

      {/* Viewer */}
      <div style={{ flex:1, padding:14, background:'var(--color-gray-950)', display:'flex', flexDirection:'column' }}>
        {f.kind === 'Image' && (
          <div style={{
            flex:1, background:'linear-gradient(135deg, oklch(0.45 0.04 250), oklch(0.25 0.05 250))',
            borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
          }}>
            <I.Image style={{ width:62, height:62, color:'rgba(255,255,255,0.20)' }}/>
            <span style={{
              position:'absolute', top:10, left:10, padding:'3px 7px',
              background:'rgba(0,0,0,0.55)', color:'#fff', borderRadius:6,
              fontSize:9, fontFamily:'var(--font-mono)', letterSpacing:'0.06em',
            }}>HEIC · 4032×3024</span>
          </div>
        )}
        {f.kind === 'Video' && (
          <div style={{
            flex:1, background:'linear-gradient(135deg, oklch(0.30 0.06 250), oklch(0.12 0.05 27))',
            borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
          }}>
            <button style={{
              width:60, height:60, borderRadius:'50%', border:0, cursor:'pointer',
              background:'rgba(255,255,255,0.92)', color:'#0d0d0d',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <div style={{ position:'absolute', bottom:14, left:14, right:14, padding:'8px 12px', background:'rgba(0,0,0,0.65)', borderRadius:9, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#fff' }}>0:14</span>
              <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.18)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:'20%', height:'100%', background:'var(--color-brand-500)' }}/>
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.6)' }}>{f.duration}</span>
            </div>
          </div>
        )}
        {f.kind === 'Audio' && (
          <div style={{
            flex:1, background:'oklch(0.25 0.08 145)',
            borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          }}>
            <div style={{ width:'100%' }}>
              <div style={{ display:'flex', alignItems:'center', gap:2, height:80, marginBottom:18 }}>
                {Array.from({ length: 36 }, (_, i) => 0.3 + 0.65 * Math.abs(Math.sin(i * 0.6 + Math.cos(i * 0.31)))).map((v,i) => (
                  <span key={i} style={{
                    flex:1, height:(v*100)+'%',
                    background: i < 10 ? 'oklch(0.78 0.16 145)' : 'rgba(255,255,255,0.30)',
                    borderRadius:2,
                  }}/>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button style={{ width:46, height:46, borderRadius:'50%', border:0, cursor:'pointer', background:'#fff', color:'oklch(0.25 0.08 145)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <div style={{ flex:1, fontFamily:'var(--font-mono)', color:'#fff', display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span>0:34</span><span style={{ opacity:0.6 }}>{f.duration}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {f.kind === 'PDF' && (
          <div style={{ flex:1, padding:14, background:'#222', borderRadius:14, overflow:'auto', display:'flex', justifyContent:'center' }}>
            <div style={{ width:'92%', padding:'24px 22px', background:'#fff', color:'#222', borderRadius:4, boxShadow:'0 12px 30px rgba(0,0,0,0.45)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:8.5, color:'#888', letterSpacing:'0.06em' }}>OFFICE OF THE CIC · MUMBAI</div>
              <div style={{ fontSize:14, fontWeight:700, marginTop:6, letterSpacing:'-0.01em' }}>RTI/MZN/2025/0341 — Response</div>
              <div style={{ height:1, background:'#222', margin:'6px 0' }}/>
              <p style={{ margin:0, fontSize:10, lineHeight:1.7 }}>Powai station registered 412 complaints in 2024. FIR refused / converted to NCR in 188 cases.</p>
            </div>
          </div>
        )}
        {(f.kind === 'DOCX' || f.kind === 'PPTX') && (
          <div style={{ flex:1, padding:14, background:'#1c1c1c', borderRadius:14, overflow:'auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{
              width:'92%', aspectRatio: f.kind === 'PPTX' ? '16/9' : '3/4',
              background: f.kind === 'PPTX' ? 'linear-gradient(135deg, oklch(0.22 0.04 250), oklch(0.14 0.06 250))' : '#fff',
              color: f.kind === 'PPTX' ? '#fff' : '#1c1c1c',
              borderRadius:5, padding:'22px 24px', fontFamily: f.kind === 'PPTX' ? 'var(--font-sans)' : 'Georgia, serif',
              boxShadow:'0 12px 30px rgba(0,0,0,0.45)',
            }}>
              {f.kind === 'PPTX' ? (<>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, opacity:0.6, letterSpacing:'0.08em' }}>POWAI HEIGHTS · TIMELINE</div>
                <div style={{ fontSize:18, fontWeight:800, marginTop:8, lineHeight:1.1 }}>2024 · The complaint cluster forms</div>
              </>) : (<>
                <div style={{ fontSize:12, fontWeight:700, textAlign:'center' }}>IN THE COURT OF THE METROPOLITAN MAGISTRATE</div>
                <div style={{ fontSize:11, textAlign:'center', marginTop:3 }}>AT MUMBAI</div>
                <div style={{ marginTop:14, fontSize:11 }}>
                  <strong>APPLICATION UNDER §156(3) CrPC</strong>
                  <p style={{ margin:'6px 0 0', fontSize:10, lineHeight:1.65 }}>The Petitioner submits that on 14.05.2026, an FIR was refused…</p>
                </div>
              </>)}
            </div>
          </div>
        )}
        {(f.kind === 'XLSX' || f.kind === 'CSV') && (
          <div style={{ flex:1, padding:14, background:'#1c1c1c', borderRadius:14, overflow:'auto' }}>
            <div style={{ background:'#fff', borderRadius:4, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)', fontSize:10 }}>
                <tbody>
                  {[
                    ['Date','Visit#','Officer','Outcome'],
                    ['14 May','1','SI Pawar','Refused'],
                    ['15 May','2','SI Pawar','Refused — NCR'],
                    ['15 May','3','SI Pawar','Refused'],
                    ['20 May','—','Insp. Singh','NCR issued'],
                  ].map((r, ri) => (
                    <tr key={ri} style={{ background: ri === 0 ? '#f4f4f4' : '#fff' }}>
                      {r.map((cell, ci) => (
                        <td key={ci} style={{ padding:'6px 8px', borderRight:'1px solid #e5e5e5', borderBottom:'1px solid #e5e5e5', color: ri === 0 ? '#444' : '#222', fontWeight: ri === 0 ? 700 : 400 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {f.kind === 'TXT' && (
          <div style={{ flex:1, padding:14, background:'#0f0f0f', borderRadius:14, overflow:'auto' }}>
            <pre style={{
              margin:0, fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.8, color:'oklch(0.88 0.005 270)', whiteSpace:'pre-wrap',
            }}>{`[00:00:00] Citizen: I want to file a complaint.
[00:00:05] Officer: What is the complaint?
[00:00:08] Citizen: Builder hasn't given possession 44 months.
[00:00:14] Officer: This is civil. Settle privately.
[00:00:18] Citizen: §415 IPC applies.
[00:00:24] Officer: I can't issue NCR today.`}</pre>
          </div>
        )}
      </div>

      {/* Thumbnail rail */}
      <div style={{
        padding:'10px 14px 14px', background:'oklch(0.135 0.005 270)',
        borderTop:'1px solid oklch(0.28 0.005 270)',
        display:'flex', gap:6, overflowX:'auto',
      }}>
        {files.map((file, i) => {
          const s = FMT_STYLE[file.kind] || FMT_STYLE.TXT;
          const isA = i === idx;
          return (
            <button key={file.id} onClick={()=>setIdx(i)} style={{
              width:46, height:54, borderRadius:8, flexShrink:0,
              background:s.bg, color:s.fg,
              border:'2px solid ' + (isA ? 'var(--color-brand-500)' : 'transparent'),
              cursor:'pointer',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-mono)', fontSize:9, fontWeight:800, letterSpacing:'0.06em',
            }}>{s.label}</button>
          );
        })}
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Notification preferences ─────────────────────────────
const MobileNotifPrefs = () => {
  const p = window.fvDataExtra.notifPrefs;
  return (
    <MPhonePage>
      <MTopBar title="Notifications" sub="Settings"/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 60px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Channels */}
        <div style={{
          padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)',
        }}>
          <Overline style={{ marginBottom:10 }}>Channels</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              { k:'push',  l:'Push notifications', s:'On-device · rotating token' },
              { k:'inApp', l:'In-app inbox',       s:'Persistent inbox' },
              { k:'email', l:'Email digest',       s:'Optional · relay supported' },
              { k:'webhook', l:'Webhook (press)',  s:'POST event payloads' },
            ].map(c => (
              <div key={c.k} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 4px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600 }}>{c.l}</div>
                  <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:2 }}>{c.s}</div>
                </div>
                <ToggleSwitch checked={p.channels[c.k]} onChange={()=>{}} size="sm"/>
              </div>
            ))}
          </div>
        </div>

        {/* Digest */}
        <div style={{ padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <Overline style={{ marginBottom:10 }}>Email digest</Overline>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['realtime','hourly','daily','weekly','off'].map(d => (
              <button key={d} style={{
                padding:'7px 11px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
                background: d === p.digests ? 'var(--color-brand-500)' : 'var(--color-muted)',
                color: d === p.digests ? '#fff' : 'var(--color-foreground)',
                border:'1px solid ' + (d === p.digests ? 'var(--color-brand-500)' : 'var(--color-border)'),
                fontSize:11.5, fontWeight:600, textTransform:'capitalize',
              }}>{d}</button>
            ))}
          </div>
        </div>

        {/* Quiet hours */}
        <div style={{ padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <Overline style={{ marginBottom:10 }}>Quiet hours</Overline>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, padding:'8px 10px', borderRadius:8, background:'var(--color-muted)', fontFamily:'var(--font-mono)', fontSize:12.5, textAlign:'center' }}>{p.quietStart}</div>
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>to</span>
            <div style={{ flex:1, padding:'8px 10px', borderRadius:8, background:'var(--color-muted)', fontFamily:'var(--font-mono)', fontSize:12.5, textAlign:'center' }}>{p.quietEnd}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 4px', marginTop:6 }}>
            <ToggleSwitch checked={p.quietHonourCritical} onChange={()=>{}} size="sm"/>
            <span style={{ fontSize:11.5, color:'var(--color-foreground)', flex:1 }}>Always alert on Critical Issues</span>
          </div>
        </div>

        {/* Events */}
        <div>
          <Overline style={{ marginBottom:10 }}>What to notify me about</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {p.rules.slice(0, 6).map(r => (
              <div key={r.id} style={{
                padding:'11px 12px', borderRadius:11,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.3 }}>{r.label}</div>
                  <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:3, lineHeight:1.5 }}>{r.sub}</div>
                </div>
                <ToggleSwitch checked={r.push} onChange={()=>{}} size="sm"/>
              </div>
            ))}
          </div>
        </div>

        {/* Areas */}
        <div style={{ padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <Overline style={{ marginBottom:10 }}>Subscribed areas</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {p.areas.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 4px' }}>
                <I.MapPin style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{a.label}</div>
                  <div style={{ fontSize:10, color:'var(--color-muted-foreground)' }}>{a.kind}</div>
                </div>
                <button style={{ width:26, height:26, borderRadius:7, border:'1px solid var(--color-border)', background:'var(--color-card)', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--color-muted-foreground)' }}>
                  <I.X style={{ width:11, height:11 }}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Shareable Complaint Card sheet ───────────────────────
const MobileShareComplaint = () => {
  const c = window.fvDataExtra.complaintDetail;
  return (
    <MPhonePage>
      <MTopBar title="Share complaint" sub={'#' + c.id} right={
        <Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>
      }/>
      <div style={{
        flex:1, overflow:'auto', padding:'14px 14px 110px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
        background:'var(--color-muted)',
      }}>
        <div style={{ transform:'scale(0.58)', transformOrigin:'top center', height:560 }}>
          <ShareableComplaintPortrait c={c}/>
        </div>
        <Card pad={14} style={{ width:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <I.ShieldFill style={{ width:13, height:13, color:'var(--color-brand-600)' }}/>
            <span style={{ fontSize:12.5, fontWeight:700 }}>Tamper-evident by design</span>
          </div>
          <p style={{ margin:0, fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
            The card is regenerated from the chain. QR carries an anti-spoof seal.
          </p>
        </Card>
      </div>
      <div style={{
        position:'sticky', bottom:0, padding:'14px 14px 18px',
        background:'var(--color-card)', borderTop:'1px solid var(--color-border)',
        borderRadius:'18px 18px 0 0',
      }}>
        <div style={{ width:34, height:4, borderRadius:99, background:'var(--color-gray-300)', margin:'-4px auto 12px' }}/>
        <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Share to</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {['WhatsApp','Twitter','Instagram','Telegram','Email','Download','Copy link','Press pack'].map((l, i) => (
            <button key={l} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
              padding:'9px 4px', borderRadius:11,
              background:'var(--color-muted)', border:'1px solid var(--color-border)',
              cursor:'pointer', fontFamily:'inherit',
            }}>
              <div style={{
                width:34, height:34, borderRadius:9,
                background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}><I.Link style={{ width:14, height:14 }}/></div>
              <span style={{ fontSize:9.5, fontWeight:600 }}>{l}</span>
            </button>
          ))}
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Promise tracking ─────────────────────────────────────
const MobilePromiseTracking = () => {
  const d = window.fvDataExtra.promiseDeep;
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { id:'all',     label:'All',     n:d.summary.total,   color:'var(--color-foreground)' },
    { id:'kept',    label:'Kept',    n:d.summary.kept,    color:'var(--color-success-500)' },
    { id:'partial', label:'Partial', n:d.summary.partial, color:'var(--color-warning-500)' },
    { id:'broken',  label:'Broken',  n:d.summary.broken,  color:'var(--color-danger-500)'  },
  ];
  const shown = filter === 'all' ? d.promises : d.promises.filter(p => p.status === filter);
  return (
    <MPhonePage>
      <MTopBar title="Promises" sub={d.leader.name}/>
      <div style={{ flex:1, overflow:'auto', padding:'14px 14px 60px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Summary */}
        <div style={{ padding:14, borderRadius:14, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <Overline>Manifesto delivery</Overline>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:'-0.02em', marginTop:5 }}>{d.summary.kept} of {d.summary.total} kept</div>
          <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:3 }}>
            {Math.round((d.summary.kept / d.summary.total) * 100)}% delivery · {d.summary.broken} broken · {d.summary.partial} partial
          </div>
          <div style={{ marginTop:12 }}>
            <StackBar segments={[
              { label:'Kept', value:d.summary.kept, color:'var(--color-success-500)' },
              { label:'Partial', value:d.summary.partial, color:'var(--color-warning-500)' },
              { label:'Broken', value:d.summary.broken, color:'var(--color-danger-500)' },
              { label:'Unverified', value:d.summary.unknown, color:'var(--color-gray-300)' },
            ]} height={8}/>
          </div>
        </div>
        {/* Filter pills */}
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:2 }}>
          {filters.map(f => {
            const isA = filter === f.id;
            return (
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{
                flexShrink:0, padding:'6px 11px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
                background: isA ? 'var(--color-foreground)' : 'var(--color-card)',
                color: isA ? 'var(--color-background)' : 'var(--color-foreground)',
                border:'1px solid ' + (isA ? 'var(--color-foreground)' : 'var(--color-border)'),
                fontSize:11.5, fontWeight:600,
                display:'inline-flex', alignItems:'center', gap:6,
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:f.color }}/>
                {f.label}
                <span style={{ fontFamily:'var(--font-mono)', fontSize:10, opacity:0.7 }}>{f.n}</span>
              </button>
            );
          })}
        </div>
        {/* Promises */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {shown.map(p => (
            <div key={p.id} style={{
              padding:'12px 13px', borderRadius:12,
              background:'var(--color-card)', border:'1px solid var(--color-border)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <PromiseChip status={p.status}/>
                <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600,
                  color: p.progress === 100 ? 'var(--color-success-700)' : p.progress > 0 ? 'var(--color-warning-700)' : 'var(--color-danger-700)' }}>{p.progress}%</span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4, color:'var(--color-foreground)' }}>{p.text}</div>
              <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:6, letterSpacing:'0.04em' }}>{p.source}</div>
              <div style={{ marginTop:8, height:4, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                <div style={{
                  width: p.progress + '%', height:'100%',
                  background: p.progress === 100 ? 'var(--color-success-500)' : p.progress > 0 ? 'var(--color-warning-500)' : 'var(--color-danger-500)',
                }}/>
              </div>
              {p.evidence.length > 0 && (
                <div style={{ marginTop:8, padding:'7px 9px', background:'var(--color-muted)', borderRadius:8, fontSize:10.5, color:'var(--color-foreground)', lineHeight:1.5 }}>
                  <strong style={{ fontWeight:600 }}>Latest:</strong> {p.evidence[p.evidence.length - 1].label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MPhonePage>
  );
};

Object.assign(window, {
  MobileSearch, MobileEvidenceViewer, MobileNotifPrefs,
  MobileShareComplaint, MobilePromiseTracking,
});
