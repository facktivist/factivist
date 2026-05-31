// Factivist UI kit — screens

const FeedCard = ({ c, onOpen }) => (
  <article onClick={()=>onOpen(c.id)} style={{
    background:'var(--color-card)', border:'1px solid var(--color-border)',
    borderRadius:16, padding:20, cursor:'pointer',
    transition:'border-color .15s, box-shadow .15s',
  }} onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--color-gray-300)'; e.currentTarget.style.boxShadow='var(--shadow-sm)';}}
     onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--color-border)'; e.currentTarget.style.boxShadow='none';}}
  >
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
      <Chip tone="primary" bordered sm>{c.category}</Chip>
      <SeverityPill level={c.severity}/>
      <StatusChip status={c.status}/>
      {c.anchored && (
        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--color-muted-foreground)'}}>
          <I.Lock style={{ width:12, height:12 }}/> Anchored
        </span>
      )}
      <span style={{ marginLeft:'auto', fontSize:11, color:'var(--color-muted-foreground)'}}>#{c.id}</span>
    </div>
    <h3 style={{
      margin:0, marginBottom:8, fontSize:17, lineHeight:1.4,
      fontWeight:600, color:'var(--color-foreground)', letterSpacing:'-0.01em',
    }}>{c.title}</h3>
    <p style={{
      margin:0, marginBottom:16, fontSize:14, lineHeight:1.6,
      color:'var(--color-gray-600)', display:'-webkit-box',
      WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
    }}>{c.excerpt}</p>
    <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:12, color:'var(--color-muted-foreground)'}}>
      <Avatar handle={c.submittedBy} size={22} tone="gray"/>
      <span style={{ fontFamily:'var(--font-mono)'}}>{c.submittedBy}</span>
      <span>·</span>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
        <I.MapPin style={{ width:12, height:12 }}/> {c.constituency}
      </span>
      <span>·</span>
      <span>{c.submittedAt}</span>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={(e)=>e.stopPropagation()} style={btnInlineStyle()}>
          <I.ArrowUp style={{ width:14, height:14 }}/> {c.endorsements}
        </button>
        <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
          <I.MessageSq style={{ width:14, height:14 }}/> {c.comments}
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
          <I.Paperclip style={{ width:14, height:14 }}/> {c.evidence}
        </span>
      </div>
    </div>
  </article>
);

function btnInlineStyle(active=false){
  return {
    display:'inline-flex', alignItems:'center', gap:4,
    padding:'4px 10px', background: active?'var(--color-brand-100)':'transparent',
    color: active?'var(--color-brand-800)':'inherit',
    border:'1px solid var(--color-border)', borderRadius:9999,
    fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
  };
}

const FeedScreen = ({ feed, onOpen }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:8 }}>
      <div>
        <h1 style={{ margin:0, fontSize:32, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1 }}>On the record.</h1>
        <div style={{ fontSize:14, color:'var(--color-muted-foreground)', marginTop:6, lineHeight:1.5 }}>
          Verified citizens. Pre-publish moderated. Anchored on Polygon — so nobody can edit the past.
        </div>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <Btn variant="ghost" size="sm" icon={<I.Filter style={{width:14,height:14}}/>}>Filters</Btn>
        <Btn variant="flat" tone="default" size="sm" iconRight={<I.ChevronD style={{width:14,height:14}}/>}>
          Sort: Recent
        </Btn>
      </div>
    </div>
    {feed.map(c => <FeedCard key={c.id} c={c} onOpen={onOpen}/>)}
  </div>
);

// ─── Detail screen ─────────────────────────────────────────────────────
const DetailScreen = ({ c, onBack }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
    <button onClick={onBack} style={{
      alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:4,
      background:'transparent', border:0, color:'var(--color-muted-foreground)',
      fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:0,
    }}>
      <span style={{ transform:'rotate(180deg)', display:'inline-flex'}}><I.ChevronR style={{width:14,height:14}}/></span>
      Back to feed
    </button>

    <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:20, padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <Chip tone="primary" bordered sm>{c.category}</Chip>
        <SeverityPill level={c.severity}/>
        <StatusChip status={c.status}/>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)'}}>#{c.id}</span>
      </div>
      <h1 className="fv-h1" style={{ margin:'0 0 12px', textWrap:'pretty' }}>{c.title}</h1>
      <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:13, color:'var(--color-muted-foreground)', marginBottom:18 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <Avatar handle={c.submittedBy} size={22} tone="gray"/>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)'}}>{c.submittedBy}</span>
        </span>
        <span>·</span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
          <I.MapPin style={{ width:13, height:13 }}/> {c.constituency}
        </span>
        <span>·</span>
        <span>{c.submittedAt}</span>
      </div>
      <div style={{ fontSize:15, lineHeight:1.7, color:'var(--color-foreground)', whiteSpace:'pre-wrap', textWrap:'pretty' }}>
        {c.body}
      </div>
    </div>

    <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:20, padding:20 }}>
      <div className="fv-overline" style={{ marginBottom:12 }}>Evidence · {c.evidence.length} files · EXIF stripped</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {c.evidence.map((e,i) => {
          const Icon = e.kind==='Audio' ? I.Mic : e.kind==='Image' ? I.Image : I.FileText;
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 12px', background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:10,
            }}>
              <div style={{
                width:36, height:36, borderRadius:8, background:'var(--color-card)',
                border:'1px solid var(--color-border)', display:'inline-flex',
                alignItems:'center', justifyContent:'center',
                color:'var(--color-brand-600)',
              }}>
                <Icon style={{width:16,height:16}}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{e.label}</div>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>{e.kind} · {e.size}</div>
              </div>
              <Btn variant="ghost" size="sm">Open</Btn>
            </div>
          );
        })}
      </div>
    </div>

    <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:20, padding:20 }}>
      <div className="fv-overline" style={{ marginBottom:14 }}>Timeline</div>
      <ol style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:14, position:'relative' }}>
        <span style={{
          position:'absolute', left:10, top:6, bottom:6, width:2,
          background:'var(--color-border)', borderRadius:2,
        }}/>
        {c.timeline.map((t,i) => {
          const tone = { submitted:'gray', ai:'primary', check:'success', chain:'gray' }[t.kind];
          const bg = { gray:'var(--color-gray-200)', primary:'var(--color-brand-100)', success:'var(--color-success-100)'}[tone];
          const fg = { gray:'var(--color-gray-700)', primary:'var(--color-brand-700)', success:'var(--color-success-700)'}[tone];
          return (
            <li key={i} style={{ position:'relative', paddingLeft:30, display:'flex', alignItems:'baseline', gap:12 }}>
              <span style={{
                position:'absolute', left:0, top:1, width:22, height:22,
                borderRadius:'50%', background:bg, color:fg,
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                border:'3px solid var(--color-card)',
              }}>
                {t.kind==='check' || t.kind==='chain' ? <I.Check style={{width:11,height:11}}/> : <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor'}}/>}
              </span>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--color-foreground)'}}>{t.label}</div>
              <div style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)'}}>{t.at}</div>
            </li>
          );
        })}
      </ol>
    </div>

    <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:20, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <I.MessageSq style={{ width:16, height:16, color:'var(--color-muted-foreground)'}}/>
        <span className="fv-overline" style={{margin:0}}>{c.comments} comments</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {c.commentList.map((cm,i) => (
          <div key={i} style={{ display:'flex', gap:12 }}>
            <Avatar handle={cm.handle} size={32} tone="gray"/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', fontWeight:600 }}>{cm.handle}</span>
                <I.ShieldFill style={{ width:11, height:11, color:'var(--color-brand-500)'}} aria-label="Verified"/>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>{cm.when}</span>
              </div>
              <div style={{ fontSize:14, lineHeight:1.55, color:'var(--color-foreground)'}}>{cm.body}</div>
              <div style={{ display:'flex', gap:14, marginTop:6, fontSize:11, color:'var(--color-muted-foreground)' }}>
                <button style={{ background:'transparent', border:0, fontFamily:'inherit', color:'inherit', cursor:'pointer', padding:0, fontSize:11 }}>Reply</button>
                <button style={{ background:'transparent', border:0, fontFamily:'inherit', color:'inherit', cursor:'pointer', padding:0, fontSize:11 }}>Endorse</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:18, display:'flex', gap:10, alignItems:'flex-start' }}>
        <Avatar handle="citizen-7K3F4P" size={32} />
        <div style={{ flex:1 }}>
          <textarea placeholder="Add a comment as citizen-7K3F4P. Civil discourse, no personal attacks." style={{
            width:'100%', minHeight:64, padding:'10px 12px',
            background:'var(--color-muted)', border:'1px solid transparent',
            borderRadius:10, fontFamily:'inherit', fontSize:14, color:'var(--color-foreground)',
            outline:'none', resize:'vertical',
          }}/>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)'}}>Moderated by Llama Guard 3 before publishing.</span>
            <Btn variant="solid" tone="primary" size="sm">Post comment</Btn>
          </div>
        </div>
      </div>
    </div>

    <div style={{
      position:'sticky', bottom:16,
      background:'var(--color-card)', border:'1px solid var(--color-border)',
      borderRadius:9999, padding:8, boxShadow:'var(--shadow-lg)',
      display:'flex', alignItems:'center', gap:8, alignSelf:'center',
    }}>
      <Btn variant="solid" tone="primary" size="md" icon={<I.ArrowUp style={{width:14,height:14}}/>}>
        Endorse · {c.endorsements}
      </Btn>
      <Btn variant="ghost" size="md" icon={<I.MessageSq style={{width:14,height:14}}/>}>Comment</Btn>
      <Btn variant="ghost" size="md" icon={<I.Link style={{width:14,height:14}}/>}>Share</Btn>
    </div>
  </div>
);

Object.assign(window, { FeedCard, FeedScreen, DetailScreen });
