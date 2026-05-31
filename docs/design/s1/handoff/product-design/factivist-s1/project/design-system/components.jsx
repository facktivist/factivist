// Factivist UI kit — shared primitives + icons
// Lucide-style strokes inlined as SVG; HeroUI-style primitives in plain CSS.

const { useState, useMemo } = React;

// ─── Icons — Solar Bold inlined as data: URIs (see icons.js) ──────────
// Cross-origin mask-image is blocked in some sandboxes, so the project
// pre-builds 27 Solar Bold SVGs into window.FV_ICONS as data: URIs.
// (Vuesax/Iconsax isn't on Iconify CDN; Solar Bold is the closest filled-
// bold analog. Six raw Vuesax SVGs sit in assets/icons/vuesax/ for reference.)
const Ix = (slug) => ({ style, size, ...rest }) => {
  const s = (style && style.width) || size || 18;
  const url = (window.FV_ICONS && window.FV_ICONS[slug]) || '';
  return React.createElement('span', {
    'aria-hidden': true,
    style: {
      display: 'inline-block', verticalAlign: 'middle',
      width: s, height: s, flexShrink: 0,
      backgroundColor: 'currentColor',
      WebkitMaskImage: `url("${url}")`,
      maskImage: `url("${url}")`,
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      WebkitMaskSize: 'contain', maskSize: 'contain',
      ...(style||{}),
    },
    ...rest,
  });
};

const I = {
  Shield:     Ix('shield'),
  ShieldFill: Ix('shield-check'),
  Search:     Ix('search'),
  Plus:       Ix('add'),
  Bell:       Ix('bell'),
  ChevronR:   Ix('chevron-right'),
  ChevronD:   Ix('chevron-down'),
  ArrowUp:    Ix('arrow-up'),
  MessageSq:  Ix('message'),
  Paperclip:  Ix('paperclip'),
  MapPin:     Ix('map-pin'),
  Calendar:   Ix('calendar'),
  Check:      Ix('check'),
  X:          Ix('close'),
  Sparkles:   Ix('sparkles'),
  Link:       Ix('link'),
  Filter:     Ix('filter'),
  TrendingUp: Ix('trending'),
  FileText:   Ix('document'),
  Mic:        Ix('mic'),
  Image:      Ix('image'),
  Lock:       Ix('lock'),
  Megaphone:  Ix('megaphone'),
  Flash:      Ix('flash'),
  Judge:      Ix('judge'),
  Ranking:    Ix('ranking'),
  Vote:       Ix('flag'),
};

// ─── Primitives ─────────────────────────────────────────────────────────
const Chip = ({ tone='default', children, dot=false, bordered=false, sm=false }) => {
  const s = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: sm ? 22 : 26,
    padding: sm ? '0 8px' : '0 10px',
    borderRadius: 9999,
    fontSize: sm ? 11 : 12,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
  const tones = {
    default: { background: bordered?'transparent':'var(--color-gray-200)', color:'var(--color-gray-800)', border: bordered?'1px solid var(--color-gray-300)':'1px solid transparent' },
    primary: { background: bordered?'transparent':'var(--color-brand-100)', color: bordered?'var(--color-brand-700)':'var(--color-brand-800)', border: bordered?'1px solid var(--color-brand-300)':'1px solid transparent' },
    success: { background:'var(--color-success-100)', color:'var(--color-success-800)', border:'1px solid transparent' },
    warning: { background:'var(--color-warning-100)', color:'var(--color-warning-900)', border:'1px solid transparent' },
    danger:  { background:'var(--color-danger-100)', color:'var(--color-danger-800)', border:'1px solid transparent' },
    info:    { background:'var(--color-brand-100)', color:'var(--color-brand-800)', border:'1px solid transparent' },
  };
  return <span style={{...s, ...tones[tone]}}>
    {dot && <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',opacity:0.7, flexShrink:0}}/>} {children}
  </span>;
};

const Btn = ({ variant='solid', tone='primary', size='md', children, icon, iconRight, onClick, fullWidth=false, disabled=false }) => {
  const sz = { sm:{h:32,p:'0 12px',fs:13,r:10}, md:{h:40,p:'0 16px',fs:14,r:12}, lg:{h:48,p:'0 20px',fs:16,r:14} }[size];
  const styles = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    height:sz.h, padding: children?sz.p:0, width: children?(fullWidth?'100%':'auto'):sz.h,
    borderRadius:sz.r, fontWeight:500, fontSize:sz.fs, lineHeight:1,
    border:'1px solid transparent', cursor:disabled?'not-allowed':'pointer',
    opacity:disabled?0.5:1, transition:'opacity .15s, transform .1s', fontFamily:'inherit',
  };
  const v = {
    'solid-primary':   { background:'var(--color-brand-500)', color:'#fff' },
    'solid-default':   { background:'var(--color-gray-200)', color:'var(--color-gray-900)' },
    'solid-secondary': { background:'var(--color-gray-900)', color:'var(--color-gray-50)' },
    'solid-success':   { background:'var(--color-success-500)', color:'#fff' },
    'solid-danger':    { background:'var(--color-danger-500)', color:'#fff' },
    'bordered-primary':{ background:'transparent', borderColor:'var(--color-brand-500)', color:'var(--color-brand-700)' },
    'bordered-default':{ background:'transparent', borderColor:'var(--color-border)', color:'var(--color-foreground)' },
    'flat-primary':    { background:'var(--color-brand-100)', color:'var(--color-brand-800)' },
    'flat-success':    { background:'var(--color-success-100)', color:'var(--color-success-800)' },
    'flat-default':    { background:'var(--color-muted)', color:'var(--color-foreground)' },
    'light-primary':   { background:'transparent', color:'var(--color-brand-600)' },
    'light-default':   { background:'transparent', color:'var(--color-foreground)' },
    'ghost':           { background:'transparent', borderColor:'var(--color-border)', color:'var(--color-foreground)' },
  };
  return <button className="fv-btn" onClick={onClick} disabled={disabled} style={{...styles, ...(v[`${variant}-${tone}`] || v[variant])}}>
    {icon}{children}{iconRight}
  </button>;
};

const Avatar = ({ handle, size=32, tone='primary' }) => {
  const t = {
    primary:  { bg:'var(--color-brand-100)', fg:'var(--color-brand-800)' },
    success:  { bg:'var(--color-success-100)', fg:'var(--color-success-800)' },
    warning:  { bg:'var(--color-warning-100)', fg:'var(--color-warning-900)' },
    gray:     { bg:'var(--color-gray-200)', fg:'var(--color-gray-700)' },
  }[tone];
  // Take 2 chars after the dash; fall back to first 2
  const label = (handle.split('-')[1] || handle).slice(0,2).toUpperCase();
  return <span style={{
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    width:size, height:size, borderRadius:'50%',
    background:t.bg, color:t.fg, fontWeight:600, fontSize: Math.round(size*0.4),
    flexShrink:0,
  }}>{label}</span>;
};

const SeverityPill = ({ level }) => {
  const map = {
    'Low':      { bg:'var(--color-gray-200)',     fg:'var(--color-gray-800)' },
    'Medium':   { bg:'var(--color-warning-100)',  fg:'var(--color-warning-900)' },
    'High':     { bg:'var(--color-warning-500)',  fg:'var(--color-gray-950)' },
    'Critical': { bg:'var(--color-danger-500)',   fg:'#fff' },
  };
  const s = map[level];
  return <span style={{
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'4px 10px', background:s.bg, color:s.fg,
    borderRadius:9999, fontSize:11, fontWeight:600, letterSpacing:'0.02em',
  }}>
    <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',opacity:0.7}}/>
    {level}
  </span>;
};

const StatusChip = ({ status }) => {
  const map = {
    'Submitted': 'default',
    'Verified':  'info',
    'In review': 'warning',
    'Resolved':  'success',
    'Rejected':  'danger',
  };
  return <Chip tone={map[status]||'default'} dot>{status}</Chip>;
};

Object.assign(window, { I, Chip, Btn, Avatar, SeverityPill, StatusChip });
