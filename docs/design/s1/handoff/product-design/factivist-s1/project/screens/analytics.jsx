// Factivist — Analytics dashboard (for journalists / researchers)
// Press-tier surface: dense, comparative, exportable. Single page.

const ChartBars = ({ series, height = 180, color = 'var(--color-brand-500)' }) => {
  // series: [{ label, value }, ...]
  const max = Math.max(...series.map(s => s.value)) || 1;
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${series.length}, 1fr)`, gap:6, alignItems:'end', height }}>
      {series.map((b, i) => {
        const h = (b.value / max) * (height - 28);
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{
              width:'100%', height: Math.max(2, h),
              background: color, borderRadius:'4px 4px 0 0',
              transition:'height 0.4s var(--ease-emphasized)',
            }}/>
            <span style={{ fontSize:9, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// Multi-line chart — stacked area-ish on top of a baseline.
const MultiLineChart = ({ width = 540, height = 200, series, xLabels }) => {
  const max = Math.max(...series.flatMap(s => s.values));
  const span = max || 1;
  const padX = 24, padTop = 12, padBottom = 22;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const N = series[0].values.length;
  const xAt = (i) => padX + (i / (N - 1)) * innerW;
  const yAt = (v) => padTop + innerH - (v / span) * innerH;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block' }}>
      {/* horizontal gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, k) => (
        <line key={k} x1={padX} x2={width-padX} y1={padTop + innerH*t} y2={padTop + innerH*t}
          stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray={k===4 ? '0' : '2 3'}/>
      ))}
      {/* lines */}
      {series.map((s, k) => {
        const d = s.values.map((v, i) => (i===0?'M':'L') + xAt(i) + ',' + yAt(v)).join(' ');
        return (
          <g key={k}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            {/* end dot */}
            <circle cx={xAt(N-1)} cy={yAt(s.values[N-1])} r="3" fill={s.color}/>
          </g>
        );
      })}
      {/* x labels */}
      {xLabels && xLabels.map((l, i) => (
        <text key={i} x={xAt(i)} y={height-6} textAnchor="middle"
          style={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>{l}</text>
      ))}
    </svg>
  );
};

const AnalyticsScreen = () => {
  // Mock series — monthly volumes by category, May 2025 → May 2026
  const xLabels = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'];
  const series = [
    { name:'Infrastructure',    color:'oklch(0.55 0.20 250)', values:[1280,1390,1420,1480,1620,1820,2010,2180,2410,2680,2940,3120] },
    { name:'Police misconduct', color:'oklch(0.55 0.20 27)',  values:[840, 920, 1010,1180,1240,1318,1410,1488,1612,1840,1980,2110] },
    { name:'RTI obstruction',   color:'oklch(0.65 0.16 60)',  values:[612, 658, 720, 780, 842, 920, 1020,1140,1280,1380,1480,1612] },
    { name:'Healthcare',        color:'oklch(0.55 0.16 145)', values:[480, 520, 580, 642, 712, 788, 860, 940, 1020,1140,1240,1340] },
    { name:'Environment',       color:'oklch(0.60 0.14 170)', values:[180, 220, 240, 280, 320, 360, 420, 488, 540, 612, 680, 720] },
  ];

  // Distribution of complaints by source (RTI, news, FIR, direct)
  const sourceMix = [
    { name:'Citizen filing', n:64810, pct:62 },
    { name:'RTI cross-link', n:18420, pct:18 },
    { name:'FIR / NCRP',     n:12940, pct:12 },
    { name:'News citation',  n:5840,  pct:6  },
    { name:'Court records',  n:2480,  pct:2  },
  ];

  // Top constituencies (cross-state) — pulled from explorer mock
  const topAC = [
    { ac:'Powai · MH',        complaints:511, sev:0.84, resolved:9,  delta:'+22%' },
    { ac:'Mahadevapura · KA', complaints:514, sev:0.74, resolved:14, delta:'+18%' },
    { ac:'Okhla · DL',        complaints:512, sev:0.84, resolved:12, delta:'+9%'  },
    { ac:'Mumbadevi · MH',    complaints:412, sev:0.78, resolved:16, delta:'+11%' },
    { ac:'Pune Cantt · MH',   complaints:462, sev:0.41, resolved:69, delta:'+5%'  },
    { ac:'Adarsh Nagar · DL', complaints:248, sev:0.66, resolved:22, delta:'+13%' },
    { ac:'Lucknow · UP',      complaints:421, sev:0.62, resolved:18, delta:'+8%'  },
    { ac:'Hyderabad · TS',    complaints:388, sev:0.58, resolved:24, delta:'+14%' },
  ];

  // Bar chart — pendency by ministry (Centre-only, last 90 days)
  const pendencyBars = [
    { label:'MoHA',  value:8412 },
    { label:'MoRTH', value:6118 },
    { label:'MoH&FW',value:5882 },
    { label:'MoUD',  value:4120 },
    { label:'MoF',   value:3210 },
    { label:'MoSDE', value:2412 },
    { label:'MoCA',  value:1840 },
    { label:'MoIB',  value:1220 },
    { label:'MoENV', value:980  },
    { label:'MoLE',  value:712  },
  ];

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Newsroom</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Analytics</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Filter style={{width:13,height:13}}/>}>Filters</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{width:13,height:13}}/>}>Export CSV</Btn>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.Link style={{width:13,height:13}}/>}>Share dataset</Btn>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Page header + filter bar */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20, gap:18 }}>
          <div>
            <Overline>Press dashboard · live data · refreshed nightly</Overline>
            <h1 style={{ margin:'8px 0 0', fontSize:28, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.15 }}>
              National civic record — last 12 months
            </h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'All states', icon:<I.MapPin style={{width:12,height:12}}/> },
              { label:'All categories', icon:<I.Filter style={{width:12,height:12}}/> },
              { label:'Last 12 months', icon:<I.Calendar style={{width:12,height:12}}/> },
              { label:'Verified only', icon:<I.ShieldFill style={{width:12,height:12}}/> },
            ].map((f,i) => (
              <span key={i} style={{
                display:'inline-flex', alignItems:'center', gap:6,
                height:34, padding:'0 12px', background:'var(--color-card)',
                border:'1px solid var(--color-border)', borderRadius:9999,
                fontSize:12, fontWeight:500, color:'var(--color-foreground)',
              }}>
                {f.icon}{f.label}
                <I.ChevronR style={{width:11,height:11, color:'var(--color-muted-foreground)', transform:'rotate(90deg)'}}/>
              </span>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
          <Kpi value="1,42,488" label="Verified complaints" sub="+18% YoY" tone="brand"/>
          <Kpi value="38%"      label="Resolution rate"     sub="vs 22% pre-platform" tone="success"/>
          <Kpi value="47d"      label="Median response"     sub="statutory 30d" tone="warning"/>
          <Kpi value="2,418"    label="Leaders graded"      sub="LS + Vidhan Sabhas"/>
          <Kpi value="98.4%"    label="Anchored on Polygon" sub="of verified" tone="success"/>
        </div>

        {/* Main grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:16 }}>
          {/* Trend chart */}
          <Card pad={18}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
              <SectionHead
                icon={<I.TrendingUp style={{width:16,height:16}}/>}
                title="Volume by category · monthly"
                subtitle="Verified complaints anchored in the period"
                dense
              />
              <div style={{ display:'flex', gap:4 }}>
                <Chip tone="default" sm bordered>12M</Chip>
                <Chip tone="primary" sm bordered>1Y</Chip>
                <Chip tone="default" sm bordered>ALL</Chip>
              </div>
            </div>
            <MultiLineChart width={560} height={220} series={series} xLabels={xLabels}/>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:12, paddingTop:12, borderTop:'1px solid var(--color-border)' }}>
              {series.map(s => (
                <div key={s.name} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12 }}>
                  <span style={{ width:10, height:3, background:s.color, borderRadius:99 }}/>
                  <span style={{ color:'var(--color-foreground)', fontWeight:500 }}>{s.name}</span>
                  <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>
                    {(s.values[s.values.length-1]).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Source mix */}
          <Card pad={18}>
            <SectionHead
              icon={<I.FileText style={{width:16,height:16}}/>}
              title="Where the record comes from"
              subtitle="Verified complaints · this term"
              dense
            />
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {sourceMix.map(s => (
                <div key={s.name} style={{ display:'grid', gridTemplateColumns:'150px 1fr 60px', gap:12, alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'var(--color-foreground)' }}>{s.name}</span>
                  <RowBar value={s.pct} max={70}/>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--color-muted-foreground)', textAlign:'right' }}>
                    {s.pct}% · {(s.n/1000).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop:18, padding:'10px 12px',
              background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:10,
              fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55,
            }}>
              <strong style={{ color:'var(--color-foreground)' }}>For press use.</strong> Cross-check each datum against its anchored hash. Datasets exported as CSV come with the column <code style={{ fontFamily:'var(--font-mono)' }}>cid</code> for IPFS retrieval.
            </div>
          </Card>
        </div>

        {/* Two-up: top ACs + ministry pendency */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16, marginBottom:16 }}>
          <Card pad={0}>
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <SectionHead
                icon={<I.Ranking style={{width:16,height:16}}/>}
                title="Hottest constituencies"
                subtitle="Cross-state · ranked by 90-day complaint velocity"
                dense
              />
              <div style={{ display:'flex', gap:4 }}>
                <Chip tone="primary" sm bordered>Volume</Chip>
                <Chip tone="default" sm bordered>Severity</Chip>
                <Chip tone="default" sm bordered>Velocity</Chip>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) 1fr 1fr 0.8fr 0.8fr', padding:'8px 18px', borderBottom:'1px solid var(--color-border)', fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em' }}>
              <div>CONSTITUENCY</div><div>COMPLAINTS</div><div>SEVERITY</div><div>RESOLVED</div><div>Δ 90D</div>
            </div>
            {topAC.map((c, i) => (
              <div key={c.ac} style={{
                display:'grid', gridTemplateColumns:'minmax(0,2fr) 1fr 1fr 0.8fr 0.8fr',
                alignItems:'center', padding:'12px 18px',
                borderBottom: i === topAC.length-1 ? 'none' : '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--color-foreground)' }}>{c.ac}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>{c.complaints}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:48, height:5, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ width:(c.sev*100)+'%', height:'100%', background:c.sev>0.7?'var(--color-danger-500)':c.sev>0.5?'var(--color-warning-500)':'var(--color-success-500)' }}/>
                  </div>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{Math.round(c.sev*100)}%</span>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color: c.resolved>30?'var(--color-success-700)':'var(--color-warning-700)' }}>{c.resolved}%</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--color-danger-700)', fontWeight:600 }}>{c.delta}</div>
              </div>
            ))}
          </Card>

          <Card pad={18}>
            <SectionHead
              icon={<I.Megaphone style={{width:16,height:16}}/>}
              title="Pendency by ministry"
              subtitle="Centre · last 90 days · grievance portal cross-links"
              dense
            />
            <ChartBars series={pendencyBars} height={180}/>
            <div style={{ marginTop:14, padding:'10px 12px', background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:10, fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
              MoHA = Home Affairs · MoRTH = Road Transport &amp; Highways · MoH&amp;FW = Health · MoUD = Urban Development.
            </div>
          </Card>
        </div>

        {/* Methodology footer */}
        <Card pad={18} accent>
          <div style={{ display:'flex', gap:18, alignItems:'flex-start' }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:'var(--color-brand-500)', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <I.FileText style={{width:18,height:18}}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--color-brand-900)', marginBottom:4 }}>Methodology</div>
              <div style={{ fontSize:12.5, color:'var(--color-brand-900)', lineHeight:1.65 }}>
                Counts include only verified, anchored complaints. "Verified" = at least 3 endorsements from
                distinct verified citizens OR cross-linked to an FIR, RTI reply, or court order. Resolution rate
                = official acknowledgement + remediation evidence. Severity weights category (police misconduct &gt;
                infrastructure &gt; environment), recency, and endorsement velocity. <span style={{ textDecoration:'underline', cursor:'pointer', fontWeight:600 }}>Read the full methodology →</span>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

Object.assign(window, { AnalyticsScreen });
