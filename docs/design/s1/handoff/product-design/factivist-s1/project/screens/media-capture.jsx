// Factivist — Evidence capture (audio · video · photo)
// A capture surface usable both as a step inside the complaint registration
// and as a standalone modal. Three modes; metadata-strip pipeline visible
// throughout. Right rail explains exactly what's stripped before upload.

const CaptureWaveform = ({ values, height = 96, recording = false }) => {
  // Simulate a live tail by highlighting last quarter when "recording"
  const w = 720;
  const barW = w / values.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display:'block' }}>
      <defs>
        <linearGradient id="cap-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-600)"/>
          <stop offset="100%" stopColor="var(--color-brand-400)"/>
        </linearGradient>
      </defs>
      {values.map((v, i) => {
        const live = recording && i >= values.length * 0.75;
        const h = Math.max(4, v * (height - 16));
        return (
          <rect key={i}
            x={i * barW + 1.5} y={(height - h) / 2}
            width={Math.max(1, barW - 3)} height={h} rx={1.5}
            fill={live ? 'var(--color-danger-500)' : 'url(#cap-grad)'}
          />
        );
      })}
      {recording && (
        <line x1={w * 0.75} x2={w * 0.75} y1={6} y2={height - 6} stroke="var(--color-danger-600)" strokeWidth="1.5" strokeDasharray="4 3"/>
      )}
    </svg>
  );
};

const CaptureTab = ({ icon, label, sub, active, onPick }) => (
  <button onClick={onPick} style={{
    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
    padding:'14px 16px', borderRadius:14, flex:1,
    background: active ? 'var(--color-brand-50)' : 'var(--color-card)',
    border:'1.5px solid ' + (active ? 'var(--color-brand-400)' : 'var(--color-border)'),
    display:'flex', alignItems:'center', gap:12,
  }}>
    <div style={{
      width:36, height:36, borderRadius:10, flexShrink:0,
      background: active ? 'var(--color-brand-500)' : 'var(--color-muted)',
      color: active ? '#fff' : 'var(--color-brand-700)',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
    }}>{icon}</div>
    <div style={{ minWidth:0 }}>
      <div style={{ fontSize:13.5, fontWeight:700 }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{sub}</div>
    </div>
  </button>
);

const RecBadge = ({ rec, time }) => (
  <div style={{
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'6px 12px', borderRadius:9999,
    background: rec ? 'var(--color-danger-500)' : 'var(--color-gray-200)',
    color: rec ? '#fff' : 'var(--color-gray-700)',
    fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:'0.06em',
  }}>
    {rec && <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
    {rec ? 'REC · ' + time : 'IDLE'}
  </div>
);

const StripPill = ({ children, ok=true }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:5,
    padding:'4px 8px', borderRadius:9999,
    background: ok ? 'var(--color-success-100)' : 'var(--color-warning-100)',
    color: ok ? 'var(--color-success-800)' : 'var(--color-warning-900)',
    fontFamily:'var(--font-mono)', fontSize:10.5, fontWeight:600,
  }}>
    {ok ? <I.Check style={{ width:9, height:9 }}/> : <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }}/>}
    {children}
  </span>
);

// ─── Audio capture pane ─────────────────────────────────────────────
const CaptureAudio = ({ rec, onToggle }) => {
  const c = window.fvBatch3.capture;
  return (
    <div style={{
      padding:'24px 26px', borderRadius:18,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <Overline>Audio capture</Overline>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.015em', marginTop:4 }}>
            Record your statement, or a conversation you are part of.
          </div>
        </div>
        <RecBadge rec={rec} time={c.audioSession.duration}/>
      </div>

      <div style={{
        padding:'18px 20px', borderRadius:14,
        background:'linear-gradient(160deg, var(--color-brand-50), var(--color-card))',
        border:'1px solid var(--color-brand-200)', marginBottom:14,
      }}>
        <CaptureWaveform values={c.audioWaveform} recording={rec}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)' }}>
          <span>00:00</span><span>00:32</span><span>01:04</span><span>01:36</span><span style={{ color: rec ? 'var(--color-danger-700)' : 'var(--color-foreground)', fontWeight:700 }}>● {c.audioSession.duration}</span>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <button onClick={onToggle} style={{
          display:'inline-flex', alignItems:'center', gap:10,
          height:56, padding:'0 24px', borderRadius:9999,
          border:0, cursor:'pointer', fontFamily:'inherit',
          background: rec ? 'var(--color-danger-500)' : 'var(--color-foreground)',
          color: rec ? '#fff' : 'var(--color-background)',
          fontSize:15, fontWeight:700,
          boxShadow:'0 8px 22px -10px ' + (rec ? 'var(--color-danger-500)' : 'var(--color-foreground)'),
        }}>
          {rec
            ? <><span style={{ width:14, height:14, borderRadius:3, background:'#fff' }}/> Stop & save</>
            : <><span style={{ width:14, height:14, borderRadius:'50%', background:'var(--color-danger-500)' }}/> Start recording</>
          }
        </button>
        <Btn variant="bordered" tone="default" size="md" icon={<I.Paperclip style={{ width:14, height:14 }}/>}>Upload audio file</Btn>
        <Btn variant="ghost" size="md" icon={<I.Mic style={{ width:14, height:14 }}/>}>Switch mic</Btn>
        <div style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:7 }}>
          <I.Sparkles style={{ width:12, height:12, color:'var(--color-brand-700)' }}/>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>auto-transcript · {c.audioSession.lang}</span>
        </div>
      </div>

      {/* Live transcript */}
      <div style={{ marginTop:18 }}>
        <Overline>Live transcript · IndicSTT</Overline>
        <div style={{
          marginTop:8, padding:'14px 16px', borderRadius:12,
          background:'var(--color-muted)', border:'1px solid var(--color-border)',
          fontSize:13, lineHeight:1.65, color:'var(--color-foreground)', textWrap:'pretty',
        }}>{c.audioSession.transcript}
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--color-border)', display:'flex', gap:6, flexWrap:'wrap' }}>
            {c.audioSession.stripped.map(s => <StripPill key={s}>stripped · {s}</StripPill>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Video capture pane ─────────────────────────────────────────────
const CaptureVideo = ({ rec, onToggle }) => {
  const c = window.fvBatch3.capture;
  return (
    <div style={{
      padding:'24px 26px', borderRadius:18,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <Overline>Video capture</Overline>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.015em', marginTop:4 }}>
            Record what's happening · faces and plates are blurred before upload.
          </div>
        </div>
        <RecBadge rec={rec} time={c.videoSession.duration}/>
      </div>

      {/* Viewport */}
      <div style={{
        position:'relative', borderRadius:14, overflow:'hidden',
        background:'linear-gradient(160deg, #0a0a0a, #1a1a1a)',
        aspectRatio:'16/9',
      }}>
        {/* Fake scene */}
        <svg width="100%" height="100%" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
          <defs>
            <linearGradient id="cap-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3a4a5a"/>
              <stop offset="100%" stopColor="#1a2230"/>
            </linearGradient>
            <linearGradient id="cap-road" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2a2a2a"/>
              <stop offset="100%" stopColor="#0e0e0e"/>
            </linearGradient>
            <filter id="cap-blur"><feGaussianBlur stdDeviation="9"/></filter>
          </defs>
          <rect width="960" height="320" fill="url(#cap-sky)"/>
          <rect y="320" width="960" height="220" fill="url(#cap-road)"/>
          {/* Buildings silhouette */}
          {[60,180,320,460,600,720,860].map((x, i) => (
            <rect key={i} x={x-40} y={140 + (i%3)*20} width={80} height={180 - (i%3)*20} fill="#0c0c10" opacity="0.8"/>
          ))}
          {/* Two pedestrians (blurred faces) */}
          <g transform="translate(380, 360)">
            <rect x="-12" y="0" width="24" height="60" fill="#3b3b3b"/>
            <g filter="url(#cap-blur)"><circle cx="0" cy="-10" r="12" fill="#7a6a55"/></g>
            <text x="0" y="-26" textAnchor="middle" style={{ fontSize:11, fontFamily:'var(--font-mono)' }} fill="#fff">FACE · BLURRED</text>
          </g>
          <g transform="translate(580, 380)">
            <rect x="-12" y="0" width="24" height="55" fill="#444"/>
            <g filter="url(#cap-blur)"><circle cx="0" cy="-10" r="11" fill="#806555"/></g>
            <text x="0" y="-24" textAnchor="middle" style={{ fontSize:11, fontFamily:'var(--font-mono)' }} fill="#fff">FACE · BLURRED</text>
          </g>
          {/* Vehicle with blurred plate */}
          <g transform="translate(760, 410)">
            <rect x="-90" y="-50" width="180" height="60" rx="10" fill="#0e1a2b"/>
            <rect x="-70" y="-10" width="60" height="18" fill="#11151e"/>
            <g filter="url(#cap-blur)"><rect x="-26" y="14" width="56" height="16" fill="#d4d4d4"/></g>
            <text x="2" y="42" textAnchor="middle" style={{ fontSize:10, fontFamily:'var(--font-mono)' }} fill="#fff">PLATE · BLURRED</text>
          </g>
        </svg>

        {/* On-screen overlays */}
        <div style={{ position:'absolute', top:14, left:14, display:'flex', gap:8 }}>
          <span style={{ padding:'4px 10px', borderRadius:6, background:'rgba(0,0,0,0.55)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.04em' }}>
            REAR CAM · 4K · 30fps
          </span>
          <span style={{ padding:'4px 10px', borderRadius:6, background:'rgba(0,0,0,0.55)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:11 }}>
            GPS · OFF
          </span>
        </div>
        <div style={{ position:'absolute', top:14, right:14 }}>
          {rec ? (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:9999, background:'var(--color-danger-500)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }}/>REC {c.videoSession.duration}
            </span>
          ) : (
            <span style={{ padding:'5px 10px', borderRadius:9999, background:'rgba(0,0,0,0.6)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:11 }}>READY</span>
          )}
        </div>

        {/* Bottom controls */}
        <div style={{ position:'absolute', left:0, right:0, bottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
          <button style={{ width:42, height:42, borderRadius:'50%', background:'rgba(0,0,0,0.55)', color:'#fff', border:0, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            <I.Image style={{ width:18, height:18 }}/>
          </button>
          <button onClick={onToggle} style={{
            width:62, height:62, borderRadius:'50%', cursor:'pointer', border:'4px solid #fff',
            background: rec ? 'var(--color-danger-500)' : 'transparent',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}>
            {rec
              ? <span style={{ width:18, height:18, borderRadius:4, background:'#fff' }}/>
              : <span style={{ width:38, height:38, borderRadius:'50%', background:'var(--color-danger-500)' }}/>
            }
          </button>
          <button style={{ width:42, height:42, borderRadius:'50%', background:'rgba(0,0,0,0.55)', color:'#fff', border:0, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            <I.Sparkles style={{ width:18, height:18 }}/>
          </button>
        </div>
      </div>

      {/* Strip status */}
      <div style={{
        marginTop:14, padding:'12px 14px', borderRadius:12,
        background:'var(--color-muted)', border:'1px solid var(--color-border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <I.ShieldFill style={{ width:13, height:13, color:'var(--color-success-700)' }}/>
          <span style={{ fontSize:12.5, fontWeight:700 }}>Frame-by-frame redaction · before any byte leaves this device</span>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {c.videoSession.stripped.map(s => <StripPill key={s}>stripped · {s}</StripPill>)}
          {c.videoSession.blurred.map(s => <StripPill key={s} ok={false}>blurring · {s}</StripPill>)}
        </div>
      </div>
    </div>
  );
};

// ─── Photo capture pane (compact) ───────────────────────────────────
const CapturePhoto = () => (
  <div style={{
    padding:'24px 26px', borderRadius:18,
    background:'var(--color-card)', border:'1px solid var(--color-border)',
  }}>
    <Overline>Photo capture</Overline>
    <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.015em', marginTop:4, marginBottom:14 }}>
      Take a photo · we strip GPS, EXIF and device-ID before upload.
    </div>
    <div style={{
      position:'relative', borderRadius:14, overflow:'hidden',
      background:'linear-gradient(160deg, #1a1a1a, #0a0a0a)', aspectRatio:'4/3',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <I.Image style={{ width:56, height:56, color:'rgba(255,255,255,0.25)' }}/>
      <div style={{ position:'absolute', left:0, right:0, bottom:14, display:'flex', justifyContent:'center', gap:12 }}>
        <button style={{
          width:60, height:60, borderRadius:'50%', cursor:'pointer', border:'4px solid #fff',
          background:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ width:48, height:48, borderRadius:'50%', background:'transparent', border:'2px solid #1a1a1a' }}/>
        </button>
      </div>
    </div>
    <div style={{ marginTop:12, display:'flex', gap:10, flexWrap:'wrap' }}>
      <StripPill>stripped · GPS lat/lon</StripPill>
      <StripPill>stripped · EXIF camera serial</StripPill>
      <StripPill>stripped · timestamp drift</StripPill>
      <StripPill ok={false}>blurring · 3 faces</StripPill>
    </div>
  </div>
);

const MediaCapture = () => {
  const c = window.fvBatch3.capture;
  const [mode, setMode] = React.useState('audio');
  const [rec, setRec] = React.useState(false);

  return (
    <div>
      <MiniHeader trail={<>
        <span>New complaint</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Step 3 of 4</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Capture evidence</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Lock style={{ width:13, height:13 }}/>}>On-device only</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}>Cancel</Btn>
          <Btn variant="solid" tone="primary" size="sm" iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}>Save & continue</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div style={{ marginBottom:18 }}>
          <Overline>Step 3 of 4 · Evidence</Overline>
          <h1 style={{ margin:'8px 0 8px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            Capture evidence — text alone rarely moves a record.
          </h1>
          <p style={{ margin:0, fontSize:14, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:760 }}>
            Audio of the refusal, a 30-second clip of the leak, a photo of the notice board — each one becomes part of the anchored record. We <strong>strip GPS, device-ID, voice biometrics and EXIF</strong> on this device, before a single byte is uploaded.
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          <CaptureTab
            icon={<I.Mic style={{ width:17, height:17 }}/>}
            label="Audio" sub="Voice statement · auto-transcribed"
            active={mode==='audio'} onPick={() => { setMode('audio'); setRec(false); }}/>
          <CaptureTab
            icon={<I.Image style={{ width:17, height:17 }}/>}
            label="Video" sub="Faces & plates blurred on capture"
            active={mode==='video'} onPick={() => { setMode('video'); setRec(false); }}/>
          <CaptureTab
            icon={<I.Image style={{ width:17, height:17 }}/>}
            label="Photo" sub="GPS, EXIF & serial stripped"
            active={mode==='photo'} onPick={() => { setMode('photo'); setRec(false); }}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18, alignItems:'flex-start' }}>
          <div style={{ minWidth:0 }}>
            {mode === 'audio' && <CaptureAudio rec={rec} onToggle={() => setRec(v => !v)}/>}
            {mode === 'video' && <CaptureVideo rec={rec} onToggle={() => setRec(v => !v)}/>}
            {mode === 'photo' && <CapturePhoto/>}

            {/* Captured already this session */}
            <div style={{ marginTop:18 }}>
              <Overline>This session · {c.pending.length} attachments</Overline>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                {c.pending.map(p => {
                  const IconC = p.kind === 'audio' ? I.Mic : I.Image;
                  return (
                    <div key={p.label} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 14px', borderRadius:12,
                      background:'var(--color-card)', border:'1px solid var(--color-border)',
                    }}>
                      <div style={{
                        width:36, height:36, borderRadius:10, flexShrink:0,
                        background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                      }}><IconC style={{ width:15, height:15 }}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:12.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</div>
                        <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:3, display:'inline-flex', alignItems:'center', gap:8 }}>
                          <span>{p.len}</span><span>·</span><span>{p.mb} MB</span><span>·</span>
                          {p.stripping
                            ? <span style={{ color:'var(--color-warning-700)', display:'inline-flex', alignItems:'center', gap:5 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-warning-500)' }}/>stripping…</span>
                            : <StripPill>cleaned · ready</StripPill>}
                        </div>
                      </div>
                      <Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right rail — what we strip */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:24 }}>
            <Card accent>
              <Overline>What we strip · always</Overline>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { k:'GPS lat/lon',           v:'Removed from all media before upload. Constituency tag is your own input.' },
                  { k:'EXIF camera serial',    v:'Phone model and serial are deleted; capture timestamp is rounded to the hour.' },
                  { k:'Voice biometric vector','v':'A speaker-ID embedding is overwritten with zeros after transcription.' },
                  { k:'Device ID',              v:'IMEI, MAC and advertising IDs are never read.' },
                  { k:'Faces & plates',         v:'Detected in-browser and blurred before encoding.' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:10 }}>
                    <span style={{
                      width:22, height:22, borderRadius:7, flexShrink:0,
                      background:'var(--color-brand-100)', color:'var(--color-brand-700)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><I.X style={{ width:10, height:10 }}/></span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:700 }}>{r.k}</div>
                      <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:2, lineHeight:1.5 }}>{r.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Overline>What goes into the anchored record</Overline>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { k:'SHA-256 hash of the file',      v:'Anchored on Polygon for tamper-evidence.' },
                  { k:'Approximate timestamp',          v:'Rounded to the hour. Enough for civic, not enough to identify.' },
                  { k:'Coarse area · constituency tag', v:'From the value you typed, not from the file.' },
                  { k:'Transcript text (audio only)',   v:'IndicSTT · run on-device · post-edit allowed.' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:10 }}>
                    <span style={{
                      width:22, height:22, borderRadius:7, flexShrink:0,
                      background:'var(--color-success-100)', color:'var(--color-success-800)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><I.Check style={{ width:11, height:11 }}/></span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:700 }}>{r.k}</div>
                      <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:2, lineHeight:1.5 }}>{r.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { MediaCapture });
