// Factivist — extra shared helpers used by report-card, accused,
// constituency, ai-chat, notifications, comments, onboarding screens.
// Loaded after design-system/components.jsx so `I`, `Chip`, `Btn`, `Avatar`,
// `SeverityPill`, `StatusChip` are all in scope on window.

// Section overline
const Overline = ({ children, style }) => (
  <div style={{
    fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em',
    textTransform:'uppercase', color:'var(--color-muted-foreground)',
    fontWeight:600,
    ...(style||{}),
  }}>{children}</div>
);

// Generic Card wrapper (default surface for screens)
const Card = ({ pad=20, style, children, accent=false, dark=false }) => (
  <div style={{
    background: accent ? 'var(--color-brand-50)' : 'var(--color-card)',
    border: '1px solid ' + (accent ? 'var(--color-brand-200)' : 'var(--color-border)'),
    borderRadius: 16,
    padding: pad,
    ...(style||{}),
  }}>{children}</div>
);

// Section heading inside a screen
const SectionHead = ({ icon, title, subtitle, right, dense=false }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:12,
    marginBottom: dense ? 12 : 18,
  }}>
    {icon && <div style={{
      width:32, height:32, borderRadius:10, background:'var(--color-brand-50)',
      color:'var(--color-brand-600)', display:'inline-flex',
      alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>{icon}</div>}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em', color:'var(--color-foreground)' }}>{title}</div>
      {subtitle && <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:2 }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

// KPI tile — number on top, label below.
const Kpi = ({ value, label, sub, tone='default', large=false }) => {
  const toneColor = {
    default: 'var(--color-foreground)',
    brand: 'var(--color-brand-600)',
    success: 'var(--color-success-700)',
    warning: 'var(--color-warning-700)',
    danger: 'var(--color-danger-600)',
  }[tone];
  return (
    <div style={{
      padding: large ? 18 : 14,
      background:'var(--color-card)',
      border:'1px solid var(--color-border)',
      borderRadius:14,
    }}>
      <div style={{
        fontFamily:'var(--font-sans)', fontWeight:700,
        fontSize: large ? 32 : 24, letterSpacing:'-0.02em',
        lineHeight:1, color: toneColor,
      }}>{value}</div>
      <div style={{
        marginTop:6, fontSize:11, fontWeight:500,
        color:'var(--color-muted-foreground)',
      }}>{label}</div>
      {sub && <div style={{
        marginTop:4, fontSize:10, color:'var(--color-muted-foreground)',
        fontFamily:'var(--font-mono)',
      }}>{sub}</div>}
    </div>
  );
};

// Promise-status pill
const PromiseChip = ({ status }) => {
  const map = {
    kept:    { bg:'var(--color-success-100)', fg:'var(--color-success-800)', label:'Kept' },
    partial: { bg:'var(--color-warning-100)', fg:'var(--color-warning-900)', label:'Partial' },
    broken:  { bg:'var(--color-danger-100)',  fg:'var(--color-danger-800)',  label:'Broken' },
    unknown: { bg:'var(--color-gray-200)',    fg:'var(--color-gray-700)',    label:'Unverified' },
  };
  const s = map[status] || map.unknown;
  return <span style={{
    display:'inline-flex', alignItems:'center', gap:6,
    height:22, padding:'0 9px', background:s.bg, color:s.fg,
    borderRadius:9999, fontSize:11, fontWeight:600,
  }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', opacity:0.7 }}/>
    {s.label}
  </span>;
};

// Grade badge — A+, B−, C, etc.
const GradeBadge = ({ grade, tone='warning', large=false }) => {
  const t = {
    success: { bg:'var(--color-success-500)', fg:'#fff' },
    warning: { bg:'var(--color-warning-500)', fg:'var(--color-gray-950)' },
    danger:  { bg:'var(--color-danger-500)',  fg:'#fff' },
    brand:   { bg:'var(--color-brand-500)',   fg:'#fff' },
  }[tone];
  const sz = large ? 88 : 56;
  return <div style={{
    width:sz, height:sz, borderRadius: large ? 24 : 16,
    background:t.bg, color:t.fg,
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    fontWeight:800, fontSize: large ? 42 : 26, fontFamily:'var(--font-sans)',
    letterSpacing:'-0.04em', lineHeight:1,
    boxShadow: large ? '0 8px 20px -8px ' + t.bg : 'none',
  }}>{grade}</div>;
};

// Horizontal stack-bar (for promises kept/partial/broken/unknown)
const StackBar = ({ segments, height=10, radius=999 }) => {
  const total = segments.reduce((a,s)=>a+s.value, 0) || 1;
  return (
    <div style={{ display:'flex', height, borderRadius:radius, overflow:'hidden', background:'var(--color-gray-100)' }}>
      {segments.map((s,i) => (
        <div key={i} title={`${s.label}: ${s.value}`} style={{
          width: (s.value/total*100) + '%',
          background: s.color, height:'100%',
          transition: 'width 0.4s var(--ease-emphasized)',
        }}/>
      ))}
    </div>
  );
};

// Per-row inline bar (used in category breakdowns)
const RowBar = ({ value, max, color='var(--color-brand-500)', height=6 }) => (
  <div style={{ width:'100%', height, background:'var(--color-gray-100)', borderRadius:999, overflow:'hidden' }}>
    <div style={{
      width: Math.min(100, (value/max*100)) + '%',
      height:'100%', background:color, borderRadius:999,
      transition: 'width 0.4s var(--ease-emphasized)',
    }}/>
  </div>
);

// Attendance heatmap — 24 sessions, 1=attended, 0=absent
const AttendanceGrid = ({ attended }) => (
  <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:4 }}>
    {attended.map((a,i) => (
      <div key={i} title={a ? 'Attended' : 'Absent'} style={{
        aspectRatio:'1/1',
        background: a ? 'var(--color-brand-500)' : 'var(--color-gray-200)',
        borderRadius:4, opacity: a ? (0.4 + (i/attended.length)*0.6) : 1,
      }}/>
    ))}
  </div>
);

// Mini sparkline — values 0..1
const Spark = ({ values, color='var(--color-brand-500)', width=120, height=32, fill=true }) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v,i) => {
    const x = (i/(values.length-1))*width;
    const y = height - ((v - min) / span) * height;
    return [x, y];
  });
  const path = pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      {fill && <path d={area} fill={color} fillOpacity={0.12}/>}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
};

// Phone-frame independent header (used inside many screens to keep the
// app-chrome consistent without pulling in Header which depends on data.me).
const MiniHeader = ({ trail, title, right, back=true, onBack }) => (
  <header style={{
    position:'sticky', top:0, zIndex:5,
    background:'var(--fv-header-bg, rgba(255,255,255,0.85))',
    backdropFilter:'saturate(180%) blur(8px)',
    WebkitBackdropFilter:'saturate(180%) blur(8px)',
    borderBottom:'1px solid var(--color-border)',
    padding:'12px 24px',
    display:'flex', alignItems:'center', gap:16,
  }}>
    {back && (
      <button onClick={onBack} style={{
        width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
        background:'var(--color-card)', cursor:'pointer',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        color:'var(--color-gray-700)',
      }}>
        <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
          <I.ChevronR style={{width:14,height:14}}/>
        </span>
      </button>
    )}
    {trail && <div style={{
      display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0,
      fontSize:13, color:'var(--color-muted-foreground)',
      fontFamily:'var(--font-mono)',
    }}>{trail}</div>}
    {!trail && <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{title}</div>}
    {right}
  </header>
);

Object.assign(window, {
  Overline, Card, SectionHead, Kpi, PromiseChip,
  GradeBadge, StackBar, RowBar, AttendanceGrid, Spark, MiniHeader,
});
