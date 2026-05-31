// Factivist — Resolution Attestation
// 15-citizen consensus to mark a complaint as Resolved.
// Layout: hero (claim) + evidence carousel + decision panel + attester wall.

const AttesterDot = ({ a, i, total }) => {
  // Place each attester as a node on a 15-slot ring.
  const slotsFilled = Math.min(15, total);
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 12px', borderRadius:11,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
    }}>
      <Avatar handle={a.handle} size={28}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600 }}>{a.handle}</span>
          <I.ShieldFill style={{ width:10, height:10, color:'var(--color-brand-600)' }}/>
          <span style={{ fontSize:10, color:'var(--color-muted-foreground)' }}>· {a.when}</span>
        </div>
        {a.note && <div style={{ fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.5 }}>{a.note}</div>}
      </div>
      <span style={{
        width:24, height:24, borderRadius:6, flexShrink:0,
        background:'var(--color-success-500)', color:'#fff',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><I.Check style={{ width:12, height:12 }}/></span>
    </div>
  );
};

// 15-slot ring (decorative progress visualization)
const AttestationRing = ({ filled, total = 15, size = 200 }) => {
  const r = size/2 - 16;
  const cx = size/2, cy = size/2;
  const slotAngle = (2 * Math.PI) / total;
  const dotR = 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="4 4"/>
      {Array.from({ length: total }).map((_, i) => {
        const angle = -Math.PI / 2 + i * slotAngle;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const isFilled = i < filled;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={dotR} fill={isFilled ? 'var(--color-success-500)' : 'var(--color-gray-100)'} stroke={isFilled ? 'var(--color-success-700)' : 'var(--color-border)'} strokeWidth="1.5"/>
            {isFilled && <circle cx={x} cy={y} r={3} fill="#fff"/>}
          </g>
        );
      })}
      <text x={cx} y={cy-4} textAnchor="middle" style={{
        fontFamily:'var(--font-sans)', fontWeight:800, fontSize:34, letterSpacing:'-0.02em',
        fill:'var(--color-foreground)',
      }}>{filled}<tspan style={{ fontSize:18, fill:'var(--color-muted-foreground)' }}>/{total}</tspan></text>
      <text x={cx} y={cy+18} textAnchor="middle" style={{
        fontFamily:'var(--font-mono)', fontSize:9, fill:'var(--color-muted-foreground)', letterSpacing:'0.08em',
      }}>ATTESTED</text>
    </svg>
  );
};

const ResolutionAttestation = () => {
  const a = window.fvDataExtra.attestation;
  const remaining = a.needed - a.attested;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Resolutions</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>#{a.complaintId}</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Citizen attestation</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Open complaint</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px 80px' }}>
        {/* Hero: claim summary + ring */}
        <Card pad={0} style={{ overflow:'hidden', marginBottom:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px' }}>
            <div style={{ padding:'26px 28px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <Chip tone="warning" sm>Resolution claimed</Chip>
                <Chip tone="default" sm bordered>{a.category}</Chip>
                <Chip tone="default" sm bordered>{a.severity}</Chip>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>#{a.complaintId}</span>
              </div>
              <h1 style={{
                margin:0, fontSize:26, fontWeight:800, letterSpacing:'-0.025em',
                lineHeight:1.2, color:'var(--color-foreground)', textWrap:'balance',
              }}>{a.title}</h1>
              <div style={{ fontSize:13, color:'var(--color-foreground)', lineHeight:1.6, textWrap:'pretty' }}>
                <strong>{a.resolutionClaimedBy}</strong> claims this complaint has been resolved.{' '}
                <strong>{a.needed} verified citizens</strong> must independently attest before it's anchored as Resolved on chain.
              </div>
              <div style={{
                padding:'12px 14px', borderRadius:12,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                display:'flex', alignItems:'center', gap:18,
              }}>
                <div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>FILED</div>
                  <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{a.filedOn}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>by {a.filedBy}</div>
                </div>
                <span style={{ flex:1, height:1, background:'var(--color-border)' }}/>
                <div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-success-700)', letterSpacing:'0.06em' }}>CLAIMED RESOLVED</div>
                  <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{a.resolutionClaimedOn}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:2, fontFamily:'var(--font-mono)' }}>by {a.resolutionClaimedBy}</div>
                </div>
              </div>
            </div>
            {/* Ring */}
            <div style={{
              borderLeft:'1px solid var(--color-border)',
              background:'var(--color-muted)',
              padding:'24px 20px',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
            }}>
              <AttestationRing filled={a.attested} total={a.needed} size={200}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)' }}>
                  {remaining} more attestations needed
                </div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:3, fontFamily:'var(--font-mono)' }}>
                  ON-CHAIN ANCHOR AT 15/15
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.4fr) 1fr', gap:20 }}>
          {/* LEFT: evidence + decision */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Evidence */}
            <Card pad={22}>
              <SectionHead
                icon={<I.Paperclip style={{ width:16, height:16 }}/>}
                title={'Evidence of resolution · ' + a.evidence.length}
                subtitle={'Submitted by ' + a.resolutionClaimedBy + '. Metadata stripped on-device.'}
              />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                {a.evidence.map(e => {
                  const IconC = e.kind === 'Video' ? I.FileText : I.MapPin;
                  return (
                    <div key={e.label}>
                      <div style={{
                        aspectRatio:'4/3', borderRadius:10, border:'1px solid var(--color-border)',
                        background: e.kind === 'Video' ? 'var(--color-muted)' : 'linear-gradient(135deg, var(--color-gray-200), var(--color-gray-300))',
                        display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
                      }}>
                        <IconC style={{ width:30, height:30, color:'var(--color-gray-600)' }}/>
                        <span style={{
                          position:'absolute', top:8, left:8, padding:'3px 7px',
                          background:'rgba(0,0,0,0.65)', color:'#fff',
                          borderRadius:6, fontSize:9, fontWeight:700, letterSpacing:'0.06em', fontFamily:'var(--font-mono)',
                        }}>{e.kind.toUpperCase()}</span>
                        {e.duration && <span style={{
                          position:'absolute', bottom:8, right:8, padding:'3px 7px',
                          background:'rgba(0,0,0,0.65)', color:'#fff',
                          borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)',
                        }}>{e.duration}</span>}
                      </div>
                      <div style={{ marginTop:6 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.label}</div>
                        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{e.size}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Decision panel */}
            <Card pad={22}>
              <SectionHead
                icon={<I.Check style={{ width:16, height:16 }}/>}
                title="Your call"
                subtitle="Read the original complaint, look at the evidence, then attest, dispute, or abstain. Each attestation is anchored to your nullifier."
              />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:14 }}>
                {/* Attest */}
                <button style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'14px 16px', borderRadius:14,
                  background:'var(--color-success-50)',
                  border:'2px solid var(--color-success-500)',
                  display:'flex', flexDirection:'column', gap:6,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8,
                      background:'var(--color-success-500)', color:'#fff',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><I.Check style={{ width:14, height:14 }}/></div>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--color-success-800)' }}>Attest resolution</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--color-success-800)', lineHeight:1.55 }}>I've seen the evidence (or witnessed it myself). The complaint is genuinely resolved.</div>
                </button>
                {/* Dispute */}
                <button style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'14px 16px', borderRadius:14,
                  background:'var(--color-card)',
                  border:'2px solid var(--color-border)',
                  display:'flex', flexDirection:'column', gap:6,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8,
                      background:'var(--color-danger-500)', color:'#fff',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><I.X style={{ width:14, height:14 }}/></div>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--color-danger-800)' }}>Dispute</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>The evidence is insufficient or misleading. Block the resolution claim with a counter-note.</div>
                </button>
                {/* Abstain */}
                <button style={{
                  textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                  padding:'14px 16px', borderRadius:14,
                  background:'var(--color-card)',
                  border:'2px solid var(--color-border)',
                  display:'flex', flexDirection:'column', gap:6,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8,
                      background:'var(--color-gray-400)', color:'#fff',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><I.Sparkles style={{ width:14, height:14 }}/></div>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--color-foreground)' }}>Abstain</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>I don't have first-hand knowledge. Pass to another verified citizen.</div>
                </button>
              </div>
              <div>
                <FieldLabel sub="One line, citing what you saw. Optional but strongly preferred — it stays in the public record.">Add a note (optional)</FieldLabel>
                <Input multiline rows={3} placeholder='e.g. "Confirmed via wheelchair-user group at Sion Hospital outpatient dept on 22 May."'/>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:6, display:'inline-flex', alignItems:'center', gap:6 }}>
                  <I.ShieldFill style={{ width:11, height:11, color:'var(--color-brand-600)' }}/>
                  Posting as <strong style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{window.fvData.me.handle}</strong> · cannot be edited after anchor
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                <Btn variant="solid" tone="primary" size="md" icon={<I.ShieldFill style={{ width:14, height:14 }}/>}>Anchor my attestation</Btn>
              </div>
            </Card>
          </div>

          {/* RIGHT: attester wall + meta */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <Card pad={22}>
              <SectionHead
                icon={<I.ArrowUp style={{ width:16, height:16 }}/>}
                title={'Attestation roll · ' + a.attested + '/' + a.needed}
                subtitle="One citizen, one attestation. Anchored on Polygon."
              />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {a.attesters.map((at, i) => <AttesterDot key={at.handle} a={at} i={i} total={a.needed}/>)}
                {/* Empty slots */}
                {Array.from({ length: remaining }).map((_, i) => (
                  <div key={'empty-' + i} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 12px', borderRadius:11,
                    background:'var(--color-muted)',
                    border:'1px dashed var(--color-border)',
                  }}>
                    <div style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background:'var(--color-card)', border:'1px dashed var(--color-border)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <I.ShieldFill style={{ width:13, height:13, color:'var(--color-muted-foreground)' }}/>
                    </div>
                    <span style={{ fontSize:11.5, color:'var(--color-muted-foreground)' }}>Waiting for a verified citizen…</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card pad={22} accent>
              <SectionHead
                icon={<I.ShieldFill style={{ width:16, height:16 }}/>}
                title="How attestation works"
                dense
              />
              <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  '15 distinct verified citizens must independently attest to a fix before it is anchored as Resolved on chain.',
                  'If 3 citizens dispute, the attestation freezes and a community moderator opens an appeal.',
                  'A resolved complaint is immutable — you cannot un-resolve later, but you can file a new complaint citing it.',
                  'The original filer cannot attest their own resolution. Their endorsement does not count.',
                ].map((l, i) => (
                  <li key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55 }}>
                    <span style={{ flexShrink:0, width:18, fontFamily:'var(--font-mono)', color:'var(--color-brand-700)', fontWeight:600 }}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{ flex:1 }}>{l}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ResolutionAttestation, AttestationRing });
