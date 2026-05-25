// Factivist — Partial-fill screens (desktop)
//   ConsensusMetrics      · §2.5  constituency civic-health dashboard
//   EvidenceStrip         · §2.1  before/after EXIF + GPS strip diff
//   TrendingHeat          · §2.7  time-windowed heat map + spiking rail
//   SubscriptionsManager  · phase 3, per-complaint + per-leader subscriptions
//   PromiseIngest         · §2.3  provenance trail for every promise

// ─── Helpers ─────────────────────────────────────────────────────────
const FunnelBar = ({ stage, n, max, color }) => {
  const w = (n / max) * 100;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ fontWeight:600 }}>{stage}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{n.toLocaleString()}</span>
      </div>
      <div style={{ height:14, borderRadius:99, background:'var(--color-gray-100)', overflow:'hidden' }}>
        <div style={{ width: w + '%', height:'100%', background: color, transition:'width 0.4s var(--ease-emphasized)' }}/>
      </div>
    </div>
  );
};

// Simple bar series chart (week × value), no axis decorations
const BarSeries = ({ values, height = 110, color = 'var(--color-brand-500)' }) => {
  const max = Math.max(...values.map(v => v.v));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, padding:'4px 0' }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, justifyContent:'flex-end' }}>
          <div style={{
            width:'100%', borderRadius:'4px 4px 0 0',
            height: Math.max(2, (v.v / max) * (height - 22)) + 'px',
            background: i === values.length - 1 ? 'var(--color-foreground)' : color,
            transition:'height 0.3s var(--ease-emphasized)',
          }}/>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--color-muted-foreground)' }}>{v.week}</div>
        </div>
      ))}
    </div>
  );
};

// ─── 1. Consensus metrics (desktop) ──────────────────────────────────
const ConsensusMetrics = () => {
  const c = window.fvBatch3.consensus;
  const maxFunnel = Math.max(...c.funnel.map(f => f.n));
  return (
    <div>
      <MiniHeader trail={<>
        <span>Constituency</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{c.constituency}</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Consensus health</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Calendar style={{ width:13, height:13 }}/>}>Last 30 days</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export CSV</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div style={{ marginBottom:18 }}>
          <Overline>Consensus health · {c.constituency} · AC {c.code} · pin {c.pin}</Overline>
          <h1 style={{ margin:'8px 0 8px', fontSize:32, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            {c.verifiedCitizens.toLocaleString()} verified citizens · {c.monthlyActive.toLocaleString()} active this month.
          </h1>
          <p style={{ margin:0, fontSize:14, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:820, textWrap:'pretty' }}>
            Endorse rate, no-show rate, attestation throughput. The numbers behind every chip you see in the feed — exposed so journalists, election monitors and the platform itself can read each other's homework.
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:18 }}>
          <Kpi value={c.verifiedCitizens.toLocaleString()} label="Verified citizens" sub="all-time"            tone="brand"/>
          <Kpi value={Math.round((c.monthlyActive / c.verifiedCitizens) * 100) + '%'} label="Active 30d"      sub={c.monthlyActive.toLocaleString() + ' citizens'} tone="success"/>
          <Kpi value={c.medianEndorseToHundred.hours + 'h ' + c.medianEndorseToHundred.mins + 'm'} label="Median time to 100 endorsements" sub="from filing"/>
          <Kpi value={c.medianResolveDays + 'd'} label="Median time to attested-resolved" sub="of those that reach 15-citizen consensus" tone="warning"/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:18, alignItems:'flex-start' }}>
          {/* LEFT */}
          <div style={{ display:'flex', flexDirection:'column', gap:18, minWidth:0 }}>
            {/* Funnel */}
            <Card>
              <SectionHead icon={<I.Ranking style={{ width:15, height:15 }}/>}
                title="Citizen funnel · verified → active → contributor"
                subtitle="Where the constituency leaks. Read top to bottom — every drop is a participation gap." dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:6 }}>
                {c.funnel.map((f, i) => (<FunnelBar key={i} {...f} max={maxFunnel}/>))}
              </div>
              <div style={{
                marginTop:14, padding:'12px 14px', borderRadius:12,
                background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
                display:'flex', alignItems:'flex-start', gap:10,
              }}>
                <I.Sparkles style={{ width:13, height:13, color:'var(--color-brand-700)', flexShrink:0, marginTop:3 }}/>
                <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>
                  <strong>{Math.round((c.monthlyActive / c.verifiedCitizens) * 100)}% activation</strong> · {(100 - Math.round((c.monthlyActive / c.verifiedCitizens) * 100))}% of verified citizens did not endorse anything this month. Most are dormant after the first 30 days post-verification — a one-tap re-engagement notification at day 28 cuts no-shows by ~12 points elsewhere.
                </div>
              </div>
            </Card>

            {/* Endorsement velocity */}
            <Card>
              <SectionHead icon={<I.TrendingUp style={{ width:15, height:15 }}/>}
                title="Weekly endorsements · 8 weeks"
                subtitle="All categories · totals per week"
                right={<div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.02em' }}>{c.weeklyEndorseSeries[c.weeklyEndorseSeries.length-1].v.toLocaleString()}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:'var(--color-success-700)' }}>+14.8% w/w</span>
                </div>} dense/>
              <BarSeries values={c.weeklyEndorseSeries}/>
            </Card>

            {/* Category participation */}
            <Card>
              <SectionHead icon={<I.Filter style={{ width:15, height:15 }}/>}
                title="Where the constituency endorses · by category"
                subtitle="Percentage of active citizens who endorsed at least one in this category" dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {c.categoryParticipation.map(r => (
                  <div key={r.cat} style={{ display:'grid', gridTemplateColumns:'180px 1fr 90px 90px', gap:14, alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{r.cat}</div>
                    <RowBar value={r.pct} max={100} color="var(--color-brand-500)" height={8}/>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700 }}>{r.pct}%</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--color-muted-foreground)', textAlign:'right' }}>{r.n.toLocaleString()} citizens</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Card accent>
              <Overline>No-show rate</Overline>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8 }}>
                <span style={{ fontSize:46, fontWeight:800, letterSpacing:'-0.03em', color:'var(--color-brand-700)', lineHeight:1 }}>{Math.round(c.noShowRate * 100)}%</span>
                <span style={{ fontSize:12, color:'var(--color-muted-foreground)' }}>verified · never endorsed</span>
              </div>
              <div style={{ marginTop:12, height:10, borderRadius:99, background:'var(--color-gray-200)', overflow:'hidden' }}>
                <div style={{ width:(c.noShowRate * 100) + '%', height:'100%', background:'var(--color-warning-500)' }}/>
              </div>
              <div style={{ marginTop:10, fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.5 }}>
                Roughly <strong>{Math.round(c.verifiedCitizens * c.noShowRate).toLocaleString()}</strong> citizens are verified but inactive. Half register and never come back; one in four returns once for a single endorse.
              </div>
            </Card>

            <Card>
              <SectionHead icon={<I.ShieldFill style={{ width:14, height:14 }}/>} title="Health signals" subtitle="Anomalies the consensus service is watching" dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {c.healthSignals.map((s, i) => (
                  <div key={i} style={{
                    padding:'10px 12px', borderRadius:10,
                    background: s.tone === 'warning' ? 'var(--color-warning-50)' : s.tone === 'success' ? 'var(--color-success-50)' : 'var(--color-muted)',
                    border:'1px solid ' + (s.tone === 'warning' ? 'var(--color-warning-200)' : s.tone === 'success' ? 'var(--color-success-200)' : 'var(--color-border)'),
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%',
                        background: s.tone === 'warning' ? 'var(--color-warning-500)' : s.tone === 'success' ? 'var(--color-success-500)' : 'var(--color-gray-400)' }}/>
                      <span style={{ fontSize:12, fontWeight:700 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.5 }}>{s.detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Overline>Other levers</Overline>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { l:'Endorsements per active citizen',  v: c.averageEndorsementsPerCitizen.toFixed(1) },
                  { l:'Sybil clusters flagged',           v: c.sybilFlags },
                  { l:'Moderation hold rate',             v: (c.moderationHoldRate * 100).toFixed(1) + '%' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:8, background:'var(--color-muted)' }}>
                    <span style={{ fontSize:11.5, color:'var(--color-muted-foreground)' }}>{r.l}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700 }}>{r.v}</span>
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

// ─── 2. Evidence strip confirmation ──────────────────────────────────
const EvidenceStrip = () => {
  // Before/after rows: raw metadata vs cleaned
  const original = [
    { k:'File',                v:'IMG_20260518_1432_ATM.jpg' },
    { k:'GPS coordinates',     v:'19.1212° N, 72.9080° E', flagged:true },
    { k:'GPS altitude',        v:'14 m above MSL',          flagged:true },
    { k:'Camera make · model', v:'Xiaomi · Redmi Note 11',  flagged:true },
    { k:'Camera serial',       v:'XR202209A8F4D2C1',         flagged:true },
    { k:'Lens',                v:'8.6 mm f/1.8' },
    { k:'Capture timestamp',   v:'2026-05-18 14:32:08 IST', flagged:'partial' },
    { k:'Time-zone offset',    v:'+05:30',                  flagged:true },
    { k:'Original filename',   v:'IMG_20260518_1432_ATM.jpg', flagged:true },
    { k:'Device-ID hash',      v:'a18e-2d4f-91cd-7e21',     flagged:true },
    { k:'EXIF software',       v:'MIUI Camera 4.5.3.6',     flagged:true },
    { k:'Image dimensions',    v:'4080 × 3072 · 3.2 MB' },
  ];
  const cleaned = [
    { k:'File hash',           v:'sha-256:7c81…a2ff' },
    { k:'GPS coordinates',     v:'·  removed', stripped:true },
    { k:'GPS altitude',        v:'·  removed', stripped:true },
    { k:'Camera make · model', v:'·  removed', stripped:true },
    { k:'Camera serial',       v:'·  removed', stripped:true },
    { k:'Lens',                v:'8.6 mm f/1.8 · kept' },
    { k:'Capture timestamp',   v:'2026-05-18 14:00 IST · rounded to the hour', rounded:true },
    { k:'Time-zone offset',    v:'·  removed', stripped:true },
    { k:'Original filename',   v:'evidence-1.jpg · renamed', renamed:true },
    { k:'Device-ID hash',      v:'·  removed', stripped:true },
    { k:'EXIF software',       v:'·  removed', stripped:true },
    { k:'Image dimensions',    v:'4080 × 3072 · 3.2 MB · kept' },
    { k:'Face redaction',      v:'2 faces blurred', added:true },
    { k:'Constituency tag',    v:'Mumbai South · pin 400001 · from your input', added:true },
    { k:'Anchor (after publish)', v:'queued · Polygon block ETA ~7 min', added:true },
  ];

  return (
    <div>
      <MiniHeader trail={<>
        <span>New complaint</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Step 3 of 4</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Evidence strip confirmation</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Download strip report</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}>Replace file</Btn>
          <Btn variant="solid" tone="primary" size="sm" iconRight={<I.ChevronR style={{ width:13, height:13 }}/>}>Looks right · continue</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div style={{ marginBottom:18 }}>
          <Overline>Strip confirmation · 1 of 4 attachments</Overline>
          <h1 style={{ margin:'8px 0 6px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            Here's exactly what we stripped from your file.
          </h1>
          <p style={{ margin:0, fontSize:14, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:820, textWrap:'pretty' }}>
            The platform pulled <strong>11 fields</strong> from your photo — 8 fully removed, 1 rounded, 2 renamed — before adding a few we want on the anchored record. <strong>Nothing here has been uploaded yet.</strong> Reject and we discard the whole thing.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'flex-start' }}>
          {/* BEFORE */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <Overline style={{ color:'var(--color-danger-700)' }}>Original · on your device</Overline>
              <Chip tone="danger" sm>11 sensitive fields</Chip>
            </div>
            <div style={{
              display:'grid', gridTemplateColumns:'140px 1fr', gap:0,
              border:'1px solid var(--color-border)', borderRadius:12, overflow:'hidden',
              background:'var(--color-card)',
            }}>
              {original.map((r, i) => (
                <React.Fragment key={i}>
                  <div style={{
                    padding:'10px 12px', fontSize:11.5, color:'var(--color-muted-foreground)',
                    borderTop: i ? '1px solid var(--color-border)' : '0',
                    borderRight:'1px solid var(--color-border)',
                    background: i % 2 ? 'var(--color-muted)' : 'transparent',
                  }}>{r.k}</div>
                  <div style={{
                    padding:'10px 14px', fontSize:12, fontFamily:'var(--font-mono)',
                    borderTop: i ? '1px solid var(--color-border)' : '0',
                    color: r.flagged ? 'var(--color-danger-800)' : 'var(--color-foreground)',
                    background: r.flagged === true ? 'var(--color-danger-50)' : r.flagged === 'partial' ? 'var(--color-warning-50)' : i % 2 ? 'var(--color-muted)' : 'transparent',
                    textDecoration: r.flagged === true ? 'line-through' : 'none',
                  }}>{r.v}</div>
                </React.Fragment>
              ))}
            </div>
          </Card>

          {/* AFTER */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <Overline style={{ color:'var(--color-success-700)' }}>Cleaned · ready to anchor</Overline>
              <Chip tone="success" sm>8 stripped · 2 renamed · 1 rounded</Chip>
            </div>
            <div style={{
              display:'grid', gridTemplateColumns:'140px 1fr', gap:0,
              border:'1px solid var(--color-border)', borderRadius:12, overflow:'hidden',
              background:'var(--color-card)',
            }}>
              {cleaned.map((r, i) => (
                <React.Fragment key={i}>
                  <div style={{
                    padding:'10px 12px', fontSize:11.5, color:'var(--color-muted-foreground)',
                    borderTop: i ? '1px solid var(--color-border)' : '0',
                    borderRight:'1px solid var(--color-border)',
                    background: i % 2 ? 'var(--color-muted)' : 'transparent',
                  }}>{r.k}</div>
                  <div style={{
                    padding:'10px 14px', fontSize:12, fontFamily:'var(--font-mono)',
                    borderTop: i ? '1px solid var(--color-border)' : '0',
                    color: r.stripped ? 'var(--color-muted-foreground)' :
                           r.added ? 'var(--color-success-800)' :
                           r.rounded || r.renamed ? 'var(--color-warning-800)' :
                           'var(--color-foreground)',
                    background: r.stripped ? 'var(--color-gray-100)' :
                                r.added ? 'var(--color-success-50)' :
                                r.rounded || r.renamed ? 'var(--color-warning-50)' :
                                i % 2 ? 'var(--color-muted)' : 'transparent',
                    fontStyle: r.stripped ? 'italic' : 'normal',
                  }}>{r.v}</div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        </div>

        <div style={{
          marginTop:18, padding:'16px 20px', borderRadius:14,
          background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
            <I.ShieldFill style={{ width:20, height:20, color:'var(--color-brand-700)', flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>Nothing has been uploaded yet.</div>
              <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55, marginTop:2 }}>
                The original file stays on your device. Only the cleaned bytes leave when you publish. The strip report on the right is what goes into the anchor — auditable, hash-linked, citable.
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="bordered" tone="default" size="md" icon={<I.X style={{ width:14, height:14 }}/>}>Reject & re-take</Btn>
            <Btn variant="solid" tone="primary" size="md" icon={<I.Check style={{ width:14, height:14 }}/>}>Looks right · approve strip</Btn>
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── 3. Trending / heat map (desktop) ────────────────────────────────
// Tiny utility — sparkline normalised 0..1
const MiniSpark = ({ values, color = 'var(--color-brand-500)', width = 120, height = 30 }) => {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - (v / max) * height]).map(p => p.map(x => x.toFixed(1)).join(',')).join(' L');
  return (
    <svg width={width} height={height} style={{ display:'block' }}>
      <path d={'M' + pts} fill="none" stroke={color} strokeWidth="1.6"/>
    </svg>
  );
};

const HeatChoropleth = ({ states, byWindow, window }) => {
  // Simple radial dot layout — we don't have a state map for the trending
  // screen, so we use a compact bubble lattice keyed by state code. Sizes
  // and colors come from the activity score in `byWindow[window]`.
  const items = Object.entries(byWindow[window]).map(([code, score]) => ({
    code, score, label: STATE_NAMES[code] || code,
  }));
  const max = Math.max(...items.map(i => i.score));
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
      {items.map(s => {
        const ratio = s.score / max;
        const bg = `oklch(${0.92 - ratio * 0.32} ${0.04 + ratio * 0.20} 27)`;
        const fg = ratio > 0.6 ? '#fff' : 'var(--color-foreground)';
        return (
          <div key={s.code} style={{
            padding:'14px 12px', borderRadius:12,
            background:bg, color:fg, border:'1px solid var(--color-border)',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>{s.code}</div>
            <div style={{ marginTop:4, fontSize:12.5, fontWeight:600 }}>{s.label}</div>
            <div style={{ marginTop:6, fontFamily:'var(--font-mono)', fontSize:13, fontWeight:800 }}>{Math.round(s.score * 100)}</div>
          </div>
        );
      })}
    </div>
  );
};
const STATE_NAMES = { MH:'Maharashtra', KA:'Karnataka', TN:'Tamil Nadu', DL:'Delhi', WB:'West Bengal', GJ:'Gujarat', AP:'Andhra Pradesh', KL:'Kerala', RJ:'Rajasthan', UP:'Uttar Pradesh' };

const TrendingHeat = () => {
  const t = window.fvBatch3.trending;
  const [win, setWin] = React.useState('7d');
  const spiking = t.spiking;
  const cooling = t.cooling;
  const cats = t.hottestCategoriesByWindow['7d'];

  return (
    <div>
      <MiniHeader trail={<>
        <span>Explore</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Trending</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}>Category</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Subscribe to digest</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Title row */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:18, flexWrap:'wrap', marginBottom:18 }}>
          <div>
            <Overline>Trending issues · India</Overline>
            <h1 style={{ margin:'8px 0 6px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
              What India is endorsing — right now.
            </h1>
            <p style={{ margin:0, fontSize:13.5, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:760 }}>
              The story of the {win === '24h' ? 'last 24 hours' : win === '7d' ? 'last 7 days' : win === '30d' ? 'last 30 days' : 'last 90 days'} — by state, by category, by spike rate. Updated continuously from the anchored record.
            </p>
          </div>
          {/* Window switcher */}
          <div style={{ display:'flex', gap:4, padding:4, background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:12 }}>
            {t.windows.map(w => (
              <button key={w} onClick={() => setWin(w)} style={{
                padding:'8px 14px', borderRadius:9, cursor:'pointer', fontFamily:'inherit',
                background: w === win ? 'var(--color-card)' : 'transparent',
                border: w === win ? '1px solid var(--color-border)' : '1px solid transparent',
                fontWeight: w === win ? 700 : 500, fontSize:12.5,
                color: w === win ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              }}>{w}</button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18, alignItems:'flex-start' }}>
          {/* LEFT — heatmap + category bars */}
          <div style={{ display:'flex', flexDirection:'column', gap:18, minWidth:0 }}>
            <Card>
              <SectionHead icon={<I.MapPin style={{ width:15, height:15 }}/>}
                title="State activity · normalised score 0–100"
                subtitle={'Window · ' + win + ' · darker = more complaints filed, endorsed, or anchored'} dense/>
              <div style={{ marginTop:10 }}>
                <HeatChoropleth states={Object.keys(t.statesByWindow[win])} byWindow={t.statesByWindow} window={win}/>
              </div>
              <div style={{
                marginTop:12, padding:'10px 12px', borderRadius:10,
                background:'var(--color-muted)', border:'1px solid var(--color-border)',
                display:'flex', alignItems:'center', gap:10, fontSize:11.5, color:'var(--color-muted-foreground)',
              }}>
                <I.Sparkles style={{ width:12, height:12, color:'var(--color-brand-700)' }}/>
                The choropleth normalises within the selected window, so a 24h spike doesn't look like a 90d trend. Compare windows to see acceleration.
              </div>
            </Card>

            <Card>
              <SectionHead icon={<I.Ranking style={{ width:15, height:15 }}/>}
                title="Hottest categories · last 7 days" subtitle="By volume of endorsed complaints" dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {cats.map(r => {
                  const max = Math.max(...cats.map(x => x.n));
                  return (
                    <div key={r.cat} style={{ display:'grid', gridTemplateColumns:'200px 1fr 80px 80px', gap:14, alignItems:'center' }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{r.cat}</div>
                      <RowBar value={r.n} max={max} color="var(--color-brand-500)" height={8}/>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, textAlign:'right' }}>{r.n.toLocaleString()}</div>
                      <div style={{
                        fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, textAlign:'right',
                        color: r.delta.startsWith('-') ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                      }}>{r.delta}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* RIGHT — spiking + cooling */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Card>
              <SectionHead icon={<I.TrendingUp style={{ width:15, height:15 }}/>}
                title="Spiking now" subtitle="Issues accelerating fastest in this window" dense
                right={<Chip tone="danger" sm bordered>{spiking.length} hot</Chip>}/>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {spiking.map(s => (
                  <button key={s.key} style={{
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    padding:'10px 12px', borderRadius:10,
                    background:'var(--color-muted)', border:'1px solid var(--color-border)',
                    display:'grid', gridTemplateColumns:'1fr 90px 60px', gap:10, alignItems:'center',
                  }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.35 }}>{s.title}</div>
                      <div style={{ marginTop:3, fontSize:10.5, color:'var(--color-muted-foreground)', display:'flex', gap:6 }}>
                        <span>{s.constituency}</span><span>·</span><span>{s.count.toLocaleString()} endorses {s.when}</span>
                      </div>
                    </div>
                    <MiniSpark values={t.sparkSeries[s.key]} color="var(--color-danger-600)"/>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:800, color:'var(--color-danger-700)', textAlign:'right' }}>{s.delta}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHead icon={<I.TrendingUp style={{ width:15, height:15 }}/>}
                title="Cooling" subtitle="What the public is moving on from" dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {cooling.map(s => (
                  <div key={s.key} style={{
                    padding:'10px 12px', borderRadius:10,
                    background:'var(--color-muted)', border:'1px solid var(--color-border)',
                    display:'grid', gridTemplateColumns:'1fr 90px 60px', gap:10, alignItems:'center',
                  }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600 }}>{s.title}</div>
                      <div style={{ marginTop:3, fontSize:10.5, color:'var(--color-muted-foreground)' }}>{s.constituency} · {s.count.toLocaleString()} endorses {s.when}</div>
                    </div>
                    <MiniSpark values={t.sparkSeries[s.key]} color="var(--color-success-600)"/>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:800, color:'var(--color-success-700)', textAlign:'right' }}>{s.delta}</span>
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

// ─── 4. Subscriptions manager (desktop) ──────────────────────────────
const SUB_KIND_LABEL = {
  complaint:    { label:'Complaint',    icon:'FileText' },
  leader:       { label:'Leader',       icon:'ShieldFill' },
  case:         { label:'Court case',   icon:'Judge' },
  poi:          { label:'POI',          icon:'Megaphone' },
  constituency: { label:'Constituency', icon:'MapPin' },
};

const TRIGGER_LABELS = {
  'status':'Status change', 'attest':'Attestation','endorse-500':'500 endorsements','endorse-1000':'Critical · 1,000','comments':'New comments',
  'attendance':'Attendance log','promise-update':'Promise update','asset-decl':'Asset declaration','rti-response':'RTI response',
  'next-listing':'Next listing','order-uploaded':'Order uploaded','adjournment':'Adjournment','disposal':'Disposal',
  'new-complaint':'New complaint','press-citation':'Press citation','show-cause-notice':'Show-cause notice',
  'daily-digest':'Daily digest','critical-cross':'Critical crossings','shame-index':'Shame Index entry','new-leader':'New leader filing',
};

const SubsRow = ({ item }) => {
  const meta = SUB_KIND_LABEL[item.type];
  const IconC = I[meta.icon] || I.FileText;
  return (
    <div style={{
      padding:'14px 16px', borderRadius:12,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'flex-start',
    }}>
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background:'var(--color-brand-50)', color:'var(--color-brand-700)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><IconC style={{ width:16, height:16 }}/></div>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
          <Chip tone="default" sm bordered>{meta.label}</Chip>
          <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{item.constituency} · updated {item.updated}</span>
        </div>
        <div style={{ fontSize:13.5, fontWeight:600, lineHeight:1.35 }}>{item.title}</div>
        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
          {item.triggers.map(t => (<Chip key={t} tone="primary" sm bordered>{TRIGGER_LABELS[t] || t}</Chip>))}
        </div>
      </div>
      {/* Push / Email toggles */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, fontSize:11 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'var(--color-muted-foreground)' }}>Push</span>
          <span style={{
            width:30, height:18, borderRadius:99, position:'relative',
            background: item.push ? 'var(--color-brand-500)' : 'var(--color-gray-300)',
          }}>
            <span style={{
              position:'absolute', top:2, left: item.push ? 14 : 2, width:14, height:14,
              borderRadius:'50%', background:'#fff',
            }}/>
          </span>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'var(--color-muted-foreground)' }}>Email</span>
          <span style={{
            width:30, height:18, borderRadius:99, position:'relative',
            background: item.email ? 'var(--color-brand-500)' : 'var(--color-gray-300)',
          }}>
            <span style={{
              position:'absolute', top:2, left: item.email ? 14 : 2, width:14, height:14,
              borderRadius:'50%', background:'#fff',
            }}/>
          </span>
        </div>
      </div>
      <Btn variant="ghost" size="sm" icon={<I.X style={{ width:13, height:13 }}/>}/>
    </div>
  );
};

const SubscriptionsManager = () => {
  const s = window.fvBatch3.subs;
  const [filter, setFilter] = React.useState('all');
  const filters = ['all', 'complaint', 'leader', 'case', 'poi', 'constituency'];
  const filtered = filter === 'all' ? s.items : s.items.filter(i => i.type === filter);
  return (
    <div>
      <MiniHeader trail={<>
        <span>Settings</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Subscriptions</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Bell style={{ width:13, height:13 }}/>}>Pause all · 2 hours</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export OPML</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div style={{ marginBottom:18 }}>
          <Overline>Subscriptions · {s.items.length} active</Overline>
          <h1 style={{ margin:'8px 0 6px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            What you'll get pinged about — and when.
          </h1>
          <p style={{ margin:0, fontSize:14, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:820, textWrap:'pretty' }}>
            One subscription per record. Granular triggers. Quiet hours and daily digest live at the top. Your subscriptions are stored locally — the platform never sees them.
          </p>
        </div>

        {/* Top KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr) 1.4fr', gap:10, marginBottom:18 }}>
          <Kpi value={s.summary.complaints}     label="Complaints"/>
          <Kpi value={s.summary.leaders}        label="Leaders"/>
          <Kpi value={s.summary.cases}          label="Cases"/>
          <Kpi value={s.summary.accused}        label="POI"/>
          <Kpi value={s.summary.constituencies} label="Constituencies"/>
          <Card pad={14}>
            <Overline>Delivery</Overline>
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'var(--color-muted-foreground)' }}>Quiet hours</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{s.quietHours}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'var(--color-muted-foreground)' }}>Digest</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{s.digest}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter chips */}
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'6px 12px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
              background: f === filter ? 'var(--color-foreground)' : 'var(--color-card)',
              color: f === filter ? 'var(--color-background)' : 'var(--color-foreground)',
              border:'1px solid ' + (f === filter ? 'var(--color-foreground)' : 'var(--color-border)'),
              fontSize:12, fontWeight:600,
            }}>{f === 'all' ? 'All · ' + s.items.length : (SUB_KIND_LABEL[f]?.label || f) + ' · ' + s.items.filter(i => i.type === f).length}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:18, alignItems:'flex-start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:0 }}>
            {filtered.map(item => (<SubsRow key={item.type + '-' + item.id} item={item}/>))}
          </div>

          {/* Right rail — within-complaint subscription affordance */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:24 }}>
            <Card accent>
              <Overline>Inline · on every record</Overline>
              <div style={{ marginTop:10, padding:'14px 16px', borderRadius:12, background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                  <span style={{
                    width:30, height:30, borderRadius:8, flexShrink:0,
                    background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                  }}><I.FileText style={{ width:13, height:13 }}/></span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)' }}>COMPLAINT</div>
                    <div style={{ fontSize:12.5, fontWeight:700, lineHeight:1.3 }}>#4820 · FIR refused at Powai station</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <I.Bell style={{ width:13, height:13, color:'var(--color-brand-700)' }}/>
                    <span style={{ fontSize:12.5, fontWeight:700 }}>Subscribed</span>
                  </div>
                  <span style={{ width:32, height:18, borderRadius:99, position:'relative', background:'var(--color-brand-500)' }}>
                    <span style={{ position:'absolute', top:2, left:16, width:14, height:14, borderRadius:'50%', background:'#fff' }}/>
                  </span>
                </div>
                <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {['Status','Endorse 500','Endorse 1000 · critical','Comments'].map(c => (
                    <Chip key={c} tone="primary" sm bordered>{c}</Chip>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:10, fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.5 }}>
                The same control lives on every complaint view, leader card, court case and POI page. One toggle, four sub-triggers — never email-blast, never spam.
              </div>
            </Card>

            <Card>
              <Overline>What we won't do</Overline>
              <ul style={{ margin:'10px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  'Send your subscription list to any server',
                  'Notify the accused, the police, or the court',
                  'Drop a notification past quiet hours',
                ].map((t, i) => (
                  <li key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>
                    <I.X style={{ width:11, height:11, color:'var(--color-brand-700)', marginTop:4, flexShrink:0 }}/>{t}
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

// ─── 5. Promise tracking — ingest & provenance (desktop) ─────────────
const SOURCE_KIND_TONE = {
  'Manifesto PDF':     { i:'FileText',  c:'var(--color-brand-700)' },
  'Rally transcript':  { i:'Megaphone', c:'var(--color-warning-700)' },
  'TV interview':      { i:'Megaphone', c:'var(--color-danger-700)' },
  'X posts':           { i:'MessageSq', c:'var(--color-foreground)' },
};

const CHAIN_ICON = {
  manifesto: 'FileText', rti: 'FileText', parl: 'Judge', press: 'Megaphone', citizen: 'ShieldFill',
};

const PromiseIngest = () => {
  const p = window.fvBatch3.promiseIngest;
  return (
    <div>
      <MiniHeader trail={<>
        <span>Leader</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{p.leader}</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span>Promise ingest</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>RTI request kit</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.Plus style={{ width:13, height:13 }}/>}>Add a source</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        <div style={{ marginBottom:18 }}>
          <Overline>Where the promises came from · {p.party}</Overline>
          <h1 style={{ margin:'8px 0 6px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            Every promise lands here with a receipt — page, line, anchor.
          </h1>
          <p style={{ margin:0, fontSize:14, color:'var(--color-muted-foreground)', lineHeight:1.6, maxWidth:820, textWrap:'pretty' }}>
            {p.aggregate.promisesParsed} promises parsed from {p.sources.length} sources for <strong>{p.leader}</strong>. Each one is hash-anchored on Polygon at ingest, so the leader's office can dispute the wording but not the fact that it was said.
          </p>
        </div>

        {/* Aggregate */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:18 }}>
          <Kpi value={p.aggregate.promisesParsed} label="Parsed promises" tone="brand"/>
          <Kpi value={p.aggregate.verified}       label="Verified"        tone="success"/>
          <Kpi value={p.aggregate.partial}        label="Partial"         tone="warning"/>
          <Kpi value={p.aggregate.disputed}       label="Disputed"        tone="danger"/>
          <Kpi value={p.aggregate.withdrawn}      label="Withdrawn"/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18, alignItems:'flex-start' }}>
          {/* LEFT — sources */}
          <Card>
            <SectionHead icon={<I.Paperclip style={{ width:15, height:15 }}/>}
              title="Sources · ingested & anchored"
              subtitle="Each source is hashed on ingest; promises are extracted by an NER pass + human review." dense/>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {p.sources.map(s => {
                const t = SOURCE_KIND_TONE[s.kind] || SOURCE_KIND_TONE['Manifesto PDF'];
                const IconC = I[t.i] || I.FileText;
                return (
                  <div key={s.id} style={{
                    padding:'14px 16px', borderRadius:14,
                    background:'var(--color-card)', border:'1px solid var(--color-border)',
                    display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'flex-start',
                  }}>
                    <div style={{
                      width:42, height:42, borderRadius:11, flexShrink:0,
                      background:'var(--color-brand-50)', color: t.c,
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><IconC style={{ width:18, height:18 }}/></div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <Chip tone="default" sm bordered>{s.kind}</Chip>
                        {s.status === 'verified' && <Chip tone="success" sm>verified</Chip>}
                        {s.status === 'partial'  && <Chip tone="warning" sm>partial · disputed</Chip>}
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>ingested {s.ingestedOn}</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{s.label}</div>
                      <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:12, fontSize:11.5, color:'var(--color-muted-foreground)' }}>
                        {s.pages > 0 && <span>{s.pages} pages</span>}
                        <span><strong style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)' }}>{s.extractedPromises}</strong> promises extracted</span>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--font-mono)' }}>
                          <I.ShieldFill style={{ width:11, height:11, color:'var(--color-brand-700)' }}/>{s.anchor}
                        </span>
                      </div>
                      {s.note && <div style={{ marginTop:8, padding:'8px 10px', borderRadius:8, background:'var(--color-warning-50)', border:'1px solid var(--color-warning-200)', fontSize:11.5, color:'var(--color-warning-900)' }}>{s.note}</div>}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <Btn variant="ghost" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Open</Btn>
                      <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Anchor</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* RIGHT — sample promise with evidence chain */}
          <Card accent>
            <Overline>One promise · five-step evidence chain</Overline>
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <PromiseChip status={p.samplePromise.status}/>
                <div style={{ fontSize:14, fontWeight:700, lineHeight:1.35, color:'var(--color-foreground)' }}>{p.samplePromise.text}</div>
              </div>
            </div>
            <div style={{ marginTop:14, position:'relative', display:'flex', flexDirection:'column', gap:10 }}>
              {p.samplePromise.chain.map((step, i, arr) => {
                const IconC = I[CHAIN_ICON[step.kind] || 'FileText'];
                return (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', position:'relative' }}>
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0, position:'relative', zIndex:1,
                      background:'var(--color-card)', color:'var(--color-brand-700)',
                      border:'1px solid var(--color-brand-200)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                    }}><IconC style={{ width:13, height:13 }}/></div>
                    {i < arr.length - 1 && (
                      <span style={{ position:'absolute', left:14, top:28, bottom:-10, width:2, background:'var(--color-brand-200)' }}/>
                    )}
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:3 }}>
                        <div style={{ fontSize:12.5, fontWeight:700 }}>{step.label}</div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)' }}>{step.ts}</span>
                      </div>
                      <div style={{ fontSize:11.5, color:'var(--color-foreground)', lineHeight:1.5, textWrap:'pretty' }}>{step.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, background:'var(--color-card)', border:'1px solid var(--color-border)', fontSize:11.5, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
              The chain is read top-to-bottom — manifesto → RTI → parliamentary question → press → citizen receipts. <strong style={{ color:'var(--color-foreground)' }}>Every step is anchored.</strong> Promise status flips to <em>broken</em> only after the deadline plus 30 days.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { ConsensusMetrics, EvidenceStrip, TrendingHeat, SubscriptionsManager, PromiseIngest });
