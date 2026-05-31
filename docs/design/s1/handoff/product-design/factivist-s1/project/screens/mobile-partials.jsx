// Factivist — Mobile companions for the partial-fill batch.
//   MobileConsensus · MobileEvidenceStrip · MobileTrending
//   MobileSubscriptions · MobilePromiseIngest

// ─── Mobile · Consensus metrics ───────────────────────────────────────
const MobileConsensus = () => {
  const c = window.fvBatch3.consensus;
  const maxFunnel = Math.max(...c.funnel.map(f => f.n));
  return (
    <MPhonePage>
      <MTopBar title="Consensus health" sub={c.constituency + ' · AC ' + c.code}
        right={<Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 28px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Headline */}
        <div style={{
          padding:'14px 14px', borderRadius:14,
          background:'linear-gradient(140deg, var(--color-brand-50), var(--color-card) 70%)',
          border:'1px solid var(--color-brand-200)',
        }}>
          <Overline>Verified citizens</Overline>
          <div style={{ marginTop:6, display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.025em', color:'var(--color-brand-700)', lineHeight:1 }}>{c.verifiedCitizens.toLocaleString()}</span>
            <span style={{ fontSize:12, color:'var(--color-muted-foreground)' }}>{Math.round((c.monthlyActive / c.verifiedCitizens) * 100)}% active</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { l:'Active 30d',         v: c.monthlyActive.toLocaleString(),                          sub:'citizens this month' },
            { l:'No-show',            v: Math.round(c.noShowRate * 100) + '%',                       sub:'never endorsed' },
            { l:'→ 100 endorsements', v: c.medianEndorseToHundred.hours + 'h ' + c.medianEndorseToHundred.mins + 'm', sub:'median, from filing' },
            { l:'Time to resolved',   v: c.medianResolveDays + 'd',                                  sub:'median, after attest' },
          ].map((k, i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:12, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--color-muted-foreground)', letterSpacing:'0.06em' }}>{k.l.toUpperCase()}</div>
              <div style={{ marginTop:4, fontSize:18, fontWeight:800, letterSpacing:'-0.02em' }}>{k.v}</div>
              <div style={{ marginTop:2, fontSize:10, color:'var(--color-muted-foreground)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <Card pad={14}>
          <Overline>Funnel · verified → active → contributor</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:10 }}>
            {c.funnel.map((f, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:4 }}>
                  <span style={{ fontWeight:600 }}>{f.stage}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{f.n.toLocaleString()}</span>
                </div>
                <div style={{ height:10, borderRadius:99, background:'var(--color-gray-100)', overflow:'hidden' }}>
                  <div style={{ width:((f.n / maxFunnel) * 100) + '%', height:'100%', background:f.color }}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Category participation (compact) */}
        <Card pad={14}>
          <Overline>Where citizens endorse</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
            {c.categoryParticipation.map(r => (
              <div key={r.cat}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:3 }}>
                  <span style={{ fontWeight:600 }}>{r.cat}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{r.pct}%</span>
                </div>
                <RowBar value={r.pct} max={100} color="var(--color-brand-500)" height={5}/>
              </div>
            ))}
          </div>
        </Card>

        {/* Health signals */}
        <Card pad={14}>
          <Overline>Signals</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
            {c.healthSignals.map((s, i) => (
              <div key={i} style={{
                padding:'10px 12px', borderRadius:10,
                background: s.tone === 'warning' ? 'var(--color-warning-50)' : s.tone === 'success' ? 'var(--color-success-50)' : 'var(--color-muted)',
                border:'1px solid ' + (s.tone === 'warning' ? 'var(--color-warning-200)' : s.tone === 'success' ? 'var(--color-success-200)' : 'var(--color-border)'),
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%',
                    background: s.tone === 'warning' ? 'var(--color-warning-500)' : s.tone === 'success' ? 'var(--color-success-500)' : 'var(--color-gray-400)' }}/>
                  <span style={{ fontSize:11.5, fontWeight:700 }}>{s.label}</span>
                </div>
                <div style={{ marginTop:4, fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.5 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Evidence strip ──────────────────────────────────────────
const MobileEvidenceStrip = () => {
  const rows = [
    { k:'GPS coordinates',     before:'19.1212, 72.9080', after:'removed', tone:'stripped' },
    { k:'Camera make · model', before:'Xiaomi · Redmi Note 11', after:'removed', tone:'stripped' },
    { k:'Camera serial',       before:'XR202209A8F4D2C1', after:'removed', tone:'stripped' },
    { k:'Capture timestamp',   before:'2026-05-18 14:32 IST', after:'2026-05-18 14:00 IST · rounded', tone:'rounded' },
    { k:'Original filename',   before:'IMG_20260518_1432_ATM.jpg', after:'evidence-1.jpg', tone:'renamed' },
    { k:'Device-ID hash',      before:'a18e-2d4f-91cd-7e21', after:'removed', tone:'stripped' },
    { k:'Face redaction',      before:'2 faces present', after:'blurred', tone:'added' },
  ];
  const toneColor = (t) => ({ stripped:'var(--color-muted-foreground)', rounded:'var(--color-warning-800)', renamed:'var(--color-warning-800)', added:'var(--color-success-800)' }[t]);
  const toneBg = (t) => ({ stripped:'var(--color-gray-100)', rounded:'var(--color-warning-50)', renamed:'var(--color-warning-50)', added:'var(--color-success-50)' }[t]);
  return (
    <MPhonePage>
      <MTopBar title="Strip confirmation" sub="Photo · before vs after"
        right={<Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 110px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{
          padding:'14px 14px', borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
        }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--color-brand-800)', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.08em', fontWeight:700 }}>
            <I.ShieldFill style={{ width:11, height:11 }}/>NOT UPLOADED YET
          </div>
          <div style={{ marginTop:6, fontSize:16, fontWeight:800, letterSpacing:'-0.015em', lineHeight:1.2 }}>
            Here's exactly what we stripped.
          </div>
          <div style={{ marginTop:6, fontSize:11.5, lineHeight:1.5, color:'var(--color-foreground)' }}>
            11 sensitive fields found · <strong>8 removed</strong>, 1 rounded, 2 renamed. Approve to anchor.
          </div>
        </div>

        {/* Photo preview */}
        <div style={{
          aspectRatio:'4/3', borderRadius:12, overflow:'hidden',
          background:'linear-gradient(160deg, #1a1a1a, #0a0a0a)',
          position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <I.Image style={{ width:42, height:42, color:'rgba(255,255,255,0.3)' }}/>
          <div style={{ position:'absolute', left:10, bottom:10, display:'flex', gap:5, flexWrap:'wrap' }}>
            <span style={{ padding:'3px 7px', borderRadius:6, background:'rgba(0,0,0,0.6)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:9.5 }}>GPS · STRIPPED</span>
            <span style={{ padding:'3px 7px', borderRadius:6, background:'rgba(0,0,0,0.6)', color:'#fff', fontFamily:'var(--font-mono)', fontSize:9.5 }}>2 FACES BLURRED</span>
          </div>
        </div>

        {/* Diff list */}
        <Card pad={0} style={{ overflow:'hidden' }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              padding:'12px 14px',
              borderTop: i ? '1px solid var(--color-border)' : '0',
            }}>
              <div style={{ fontSize:11.5, fontWeight:700, marginBottom:6 }}>{r.k}</div>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0, padding:'8px 10px', borderRadius:8, background:'var(--color-danger-50)', border:'1px solid var(--color-danger-200)' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--color-danger-800)', letterSpacing:'0.04em', fontWeight:700 }}>BEFORE</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-danger-800)', marginTop:2, lineHeight:1.4, textDecoration:'line-through', wordBreak:'break-word' }}>{r.before}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:18, color:'var(--color-muted-foreground)' }}>
                  <I.ChevronR style={{ width:11, height:11 }}/>
                </div>
                <div style={{ flex:1, minWidth:0, padding:'8px 10px', borderRadius:8, background: toneBg(r.tone), border:'1px solid var(--color-border)' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color: toneColor(r.tone), letterSpacing:'0.04em', fontWeight:700 }}>AFTER</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color: toneColor(r.tone), marginTop:2, lineHeight:1.4, wordBreak:'break-word', fontStyle: r.tone === 'stripped' ? 'italic' : 'normal' }}>{r.after}</div>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{
        position:'sticky', bottom:0,
        padding:'10px 12px 14px', background:'var(--color-card)',
        borderTop:'1px solid var(--color-border)',
        display:'flex', gap:8,
      }}>
        <Btn variant="bordered" tone="default" size="md" fullWidth icon={<I.X style={{ width:13, height:13 }}/>}>Reject</Btn>
        <Btn variant="solid" tone="primary" size="md" fullWidth icon={<I.Check style={{ width:13, height:13 }}/>}>Approve</Btn>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Trending heat ───────────────────────────────────────────
const MobileTrending = () => {
  const t = window.fvBatch3.trending;
  const [win, setWin] = React.useState('7d');
  const states = Object.entries(t.statesByWindow[win]);
  const max = Math.max(...states.map(([, v]) => v));
  return (
    <MPhonePage>
      <MTopBar title="Trending" sub={'Last ' + win}
        right={<Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 28px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Window switcher */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:4, padding:3, background:'var(--color-muted)', borderRadius:11, border:'1px solid var(--color-border)' }}>
          {t.windows.map(w => (
            <button key={w} onClick={() => setWin(w)} style={{
              padding:'8px 6px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
              background: w === win ? 'var(--color-card)' : 'transparent',
              border: w === win ? '1px solid var(--color-border)' : '1px solid transparent',
              fontWeight: w === win ? 700 : 500, fontSize:11.5,
              color: w === win ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
            }}>{w}</button>
          ))}
        </div>

        {/* Heat grid */}
        <Card pad={14}>
          <Overline>State activity</Overline>
          <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
            {states.map(([code, score]) => {
              const ratio = score / max;
              const bg = `oklch(${0.92 - ratio * 0.32} ${0.04 + ratio * 0.20} 27)`;
              const fg = ratio > 0.6 ? '#fff' : 'var(--color-foreground)';
              return (
                <div key={code} style={{ padding:'10px 8px', borderRadius:9, background:bg, color:fg, border:'1px solid var(--color-border)' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, fontWeight:700, letterSpacing:'0.04em' }}>{code}</div>
                  <div style={{ fontSize:14, fontWeight:800, marginTop:2 }}>{Math.round(score * 100)}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Spiking */}
        <Card pad={14}>
          <Overline>Spiking now</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {t.spiking.map(s => (
              <div key={s.key} style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, lineHeight:1.3 }}>{s.title}</div>
                    <div style={{ marginTop:2, fontSize:10, color:'var(--color-muted-foreground)' }}>{s.constituency} · {s.count.toLocaleString()} {s.when}</div>
                  </div>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:800, color:'var(--color-danger-700)' }}>{s.delta}</span>
                </div>
                <div style={{ marginTop:6 }}>
                  <MiniSpark values={t.sparkSeries[s.key]} color="var(--color-danger-600)" width={320} height={26}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cooling */}
        <Card pad={14}>
          <Overline>Cooling</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
            {t.cooling.map(s => (
              <div key={s.key} style={{ padding:'9px 11px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{s.title}</div>
                  <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginTop:2 }}>{s.constituency}</div>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:800, color:'var(--color-success-700)' }}>{s.delta}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Subscriptions ───────────────────────────────────────────
const MobileSubscriptions = () => {
  const s = window.fvBatch3.subs;
  return (
    <MPhonePage>
      <MTopBar title="Subscriptions" sub={s.items.length + ' active'}
        right={<Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 28px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Delivery row */}
        <div style={{
          padding:'12px 14px', borderRadius:12,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-brand-800)', letterSpacing:'0.06em', fontWeight:700 }}>QUIET HOURS</div>
            <div style={{ fontSize:12.5, fontWeight:700, marginTop:2 }}>{s.quietHours}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-brand-800)', letterSpacing:'0.06em', fontWeight:700 }}>DIGEST</div>
            <div style={{ fontSize:12.5, fontWeight:700, marginTop:2 }}>{s.digest}</div>
          </div>
        </div>

        {/* Counters */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:5 }}>
          {[
            { k:'Compl.', v:s.summary.complaints },
            { k:'Lead.',  v:s.summary.leaders },
            { k:'Cases',  v:s.summary.cases },
            { k:'POI',    v:s.summary.accused },
            { k:'Const.', v:s.summary.constituencies },
          ].map((k, i) => (
            <div key={i} style={{ padding:'8px 5px', borderRadius:9, background:'var(--color-card)', border:'1px solid var(--color-border)', textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em' }}>{k.v}</div>
              <div style={{ fontSize:9, color:'var(--color-muted-foreground)', marginTop:2 }}>{k.k}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {s.items.map(it => {
            const meta = SUB_KIND_LABEL[it.type];
            const IconC = I[meta.icon] || I.FileText;
            return (
              <div key={it.type + '-' + it.id} style={{
                padding:'12px 12px', borderRadius:12,
                background:'var(--color-card)', border:'1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{
                    width:30, height:30, borderRadius:8, flexShrink:0,
                    background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><IconC style={{ width:14, height:14 }}/></div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                      <Chip tone="default" sm bordered>{meta.label}</Chip>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--color-muted-foreground)' }}>{it.updated}</span>
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, lineHeight:1.35 }}>{it.title}</div>
                  </div>
                  <span style={{ width:30, height:18, borderRadius:99, flexShrink:0, position:'relative',
                    background: it.on ? 'var(--color-brand-500)' : 'var(--color-gray-300)' }}>
                    <span style={{ position:'absolute', top:2, left: it.on ? 14 : 2, width:14, height:14, borderRadius:'50%', background:'#fff' }}/>
                  </span>
                </div>
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {it.triggers.slice(0,3).map(t => (
                    <Chip key={t} tone="primary" sm bordered>{TRIGGER_LABELS[t] || t}</Chip>
                  ))}
                  {it.triggers.length > 3 && <span style={{ fontSize:10.5, color:'var(--color-muted-foreground)', alignSelf:'center' }}>+{it.triggers.length - 3}</span>}
                </div>
                <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'var(--color-muted-foreground)' }}>Push {it.push ? '✓' : '·'} · Email {it.email ? '✓' : '·'}</span>
                  <button style={{ background:'transparent', border:0, color:'var(--color-muted-foreground)', cursor:'pointer', fontFamily:'inherit', fontSize:11, padding:'2px 6px' }}>Edit triggers →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MPhonePage>
  );
};

// ─── Mobile · Promise ingest ──────────────────────────────────────────
const MobilePromiseIngest = () => {
  const p = window.fvBatch3.promiseIngest;
  return (
    <MPhonePage>
      <MTopBar title="Promise sources" sub={p.leader}
        right={<Btn variant="ghost" size="sm" icon={<I.Plus style={{ width:13, height:13 }}/>}/>}/>
      <div style={{ flex:1, overflow:'auto', padding:'12px 14px 28px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Aggregate row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:5 }}>
          {[
            { k:'Parsed',    v:p.aggregate.promisesParsed, c:'var(--color-brand-700)' },
            { k:'Verified',  v:p.aggregate.verified,        c:'var(--color-success-700)' },
            { k:'Partial',   v:p.aggregate.partial,         c:'var(--color-warning-700)' },
            { k:'Disputed',  v:p.aggregate.disputed,        c:'var(--color-danger-700)' },
            { k:'Withdrawn', v:p.aggregate.withdrawn,       c:'var(--color-foreground)' },
          ].map((k, i) => (
            <div key={i} style={{ padding:'8px 5px', borderRadius:9, background:'var(--color-card)', border:'1px solid var(--color-border)', textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em', color:k.c }}>{k.v}</div>
              <div style={{ fontSize:8.5, color:'var(--color-muted-foreground)', marginTop:2, letterSpacing:'0.04em', textTransform:'uppercase' }}>{k.k}</div>
            </div>
          ))}
        </div>

        {/* Sources */}
        <Card pad={14}>
          <Overline>Sources · {p.sources.length}</Overline>
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
            {p.sources.map(s => {
              const tone = SOURCE_KIND_TONE[s.kind] || SOURCE_KIND_TONE['Manifesto PDF'];
              const IconC = I[tone.i] || I.FileText;
              return (
                <div key={s.id} style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:'var(--color-brand-50)', color:tone.c, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                      <IconC style={{ width:14, height:14 }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                        <Chip tone="default" sm bordered>{s.kind}</Chip>
                        {s.status === 'verified' && <Chip tone="success" sm>verified</Chip>}
                        {s.status === 'partial' && <Chip tone="warning" sm>partial</Chip>}
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.3 }}>{s.label}</div>
                      <div style={{ marginTop:4, fontSize:10.5, color:'var(--color-muted-foreground)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span>{s.ingestedOn}</span><span>·</span>
                        <span><strong style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)' }}>{s.extractedPromises}</strong> promises</span><span>·</span>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontFamily:'var(--font-mono)' }}>
                          <I.ShieldFill style={{ width:9, height:9, color:'var(--color-brand-700)' }}/>{s.anchor}
                        </span>
                      </div>
                      {s.note && <div style={{ marginTop:6, fontSize:10.5, color:'var(--color-warning-900)' }}>{s.note}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sample promise chain */}
        <Card pad={14} accent>
          <Overline>One promise · evidence chain</Overline>
          <div style={{ marginTop:8, display:'flex', alignItems:'flex-start', gap:8 }}>
            <PromiseChip status={p.samplePromise.status}/>
            <div style={{ fontSize:12.5, fontWeight:700, lineHeight:1.4 }}>{p.samplePromise.text}</div>
          </div>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
            {p.samplePromise.chain.map((step, i, arr) => {
              const IconC = I[CHAIN_ICON[step.kind] || 'FileText'];
              return (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', position:'relative' }}>
                  <div style={{
                    width:24, height:24, borderRadius:7, flexShrink:0, position:'relative', zIndex:1,
                    background:'var(--color-card)', color:'var(--color-brand-700)', border:'1px solid var(--color-brand-200)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><IconC style={{ width:11, height:11 }}/></div>
                  {i < arr.length - 1 && <span style={{ position:'absolute', left:12, top:24, bottom:-8, width:2, background:'var(--color-brand-200)' }}/>}
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:11.5, fontWeight:700 }}>{step.label}</div>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--color-muted-foreground)' }}>{step.ts}</span>
                    </div>
                    <div style={{ marginTop:3, fontSize:11, color:'var(--color-foreground)', lineHeight:1.45 }}>{step.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </MPhonePage>
  );
};

Object.assign(window, { MobileConsensus, MobileEvidenceStrip, MobileTrending, MobileSubscriptions, MobilePromiseIngest });
