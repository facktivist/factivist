// Factivist — AI Moderation queue (internal · moderator desktop)
// Left: queue list with flags. Centre: detail viewer with full text +
// model rationale. Right: decision panel + audit trail.
//
// Plus a citizen-facing "Your complaint was held / rejected — appeal"
// screen used when a verified citizen sees their own complaint blocked.

const SEVERITY_PILL_TONE = {
  Critical: { bg:'var(--color-danger-500)',  fg:'#fff'                       },
  High:     { bg:'var(--color-danger-100)',  fg:'var(--color-danger-800)'    },
  Medium:   { bg:'var(--color-warning-100)', fg:'var(--color-warning-900)'   },
  Low:      { bg:'var(--color-success-100)', fg:'var(--color-success-800)'   },
};
const FlagLevelDot = ({ level }) => {
  const c = { critical:'var(--color-danger-500)', high:'var(--color-danger-500)',
    medium:'var(--color-warning-500)', low:'var(--color-success-500)' }[level];
  return <span style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }}/>;
};

const ModSummary = ({ s }) => (
  <div style={{
    padding:'10px 14px', borderRadius:12,
    background:'var(--color-card)', border:'1px solid var(--color-border)',
    display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:0,
  }}>
    {[
      { v: s.inQueue,           l: 'In queue' },
      { v: s.flaggedToday,      l: 'Flagged today' },
      { v: s.autoCleared,       l: 'Auto-cleared (24h)' },
      { v: s.appeals,           l: 'Open appeals' },
      { v: s.medianReviewMin+'m', l: 'Median review' },
      { v: s.moderators,        l: 'Reviewers on duty' },
    ].map((k, i) => (
      <div key={i} style={{
        padding:'4px 10px',
        borderLeft: i ? '1px solid var(--color-border)' : '0',
      }}>
        <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.02em' }}>{k.v}</div>
        <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:2 }}>{k.l}</div>
      </div>
    ))}
  </div>
);

const ModRow = ({ item, selected, onPick }) => {
  const t = SEVERITY_PILL_TONE[item.severity] || { bg:'var(--color-gray-200)', fg:'var(--color-gray-700)' };
  const isHeld = item.status === 'held' || item.status === 'auto-rejected';
  return (
    <button onClick={onPick} style={{
      cursor:'pointer', fontFamily:'inherit', textAlign:'left',
      padding:'12px 14px', borderRadius:12, width:'100%',
      background: selected ? 'var(--color-brand-50)' : 'var(--color-card)',
      border:'1px solid ' + (selected ? 'var(--color-brand-300)' : 'var(--color-border)'),
      display:'flex', flexDirection:'column', gap:6,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{
          padding:'3px 7px', borderRadius:9999, background:t.bg, color:t.fg,
          fontSize:10, fontWeight:700, letterSpacing:'0.04em',
        }}>{item.severity}</span>
        {item.status === 'held' && <Chip tone="warning" sm>Human required</Chip>}
        {item.status === 'auto-rejected' && <Chip tone="danger" sm>Auto-rejected</Chip>}
        {item.suggested === 'publish' && <Chip tone="success" sm bordered>Suggest: publish</Chip>}
        {item.suggested === 'request_evidence' && <Chip tone="default" sm bordered>Suggest: request evidence</Chip>}
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)' }}>#{item.id}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.35, color:'var(--color-foreground)', textWrap:'pretty', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {item.title}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:10.5, color:'var(--color-muted-foreground)', flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--font-mono)' }}>{item.submittedBy}</span>
        <span>·</span>
        <span>{item.filedAt}</span>
        <span>·</span>
        <span>{item.category}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
        {item.flags.slice(0,3).map((f, i) => (
          <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, color:'var(--color-foreground)' }}>
            <FlagLevelDot level={f.level}/>{f.cat}
          </span>
        ))}
      </div>
    </button>
  );
};

const ModFilter = () => (
  <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'4px 0 12px' }}>
    {['Held · all','Critical','High','New (12)','Auto-rejected','Pending appeals (4)'].map((t, i) => (
      <button key={i} style={{
        padding:'6px 10px', borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
        background: i===0 ? 'var(--color-foreground)' : 'var(--color-card)',
        color: i===0 ? 'var(--color-background)' : 'var(--color-foreground)',
        border:'1px solid ' + (i===0 ? 'var(--color-foreground)' : 'var(--color-border)'),
        fontSize:11.5, fontWeight:600,
      }}>{t}</button>
    ))}
  </div>
);

const ModDetail = ({ item }) => {
  const t = SEVERITY_PILL_TONE[item.severity] || { bg:'var(--color-gray-200)', fg:'var(--color-gray-700)' };
  return (
    <div style={{
      padding:'20px 24px 24px', background:'var(--color-card)',
      border:'1px solid var(--color-border)', borderRadius:18,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        <span style={{
          padding:'4px 10px', borderRadius:9999, background:t.bg, color:t.fg,
          fontSize:10, fontWeight:800, letterSpacing:'0.06em',
        }}>{item.severity}</span>
        <Chip tone="default" sm bordered>{item.category}</Chip>
        <Chip tone="warning" sm>{item.status === 'held' ? 'Held for human review' : item.status === 'auto-rejected' ? 'Auto-rejected · appealable' : 'Pre-publish review'}</Chip>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>#{item.id} · {item.filedAt}</span>
      </div>
      <h2 style={{ margin:'2px 0 10px', fontSize:22, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.25 }}>
        {item.title}
      </h2>
      <p style={{ margin:0, fontSize:13.5, lineHeight:1.65, color:'var(--color-foreground)', textWrap:'pretty', maxWidth:820 }}>
        {item.body}
      </p>

      <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:14, fontSize:11.5, color:'var(--color-muted-foreground)' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <Avatar handle={item.submittedBy} size={20}/>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{item.submittedBy}</span>
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
          <I.Paperclip style={{ width:11, height:11 }}/>3 evidence files (under strip)
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
          <I.MapPin style={{ width:11, height:11 }}/>Mumbai North-East
        </span>
      </div>

      {/* Model rationale */}
      <div style={{ marginTop:18 }}>
        <Overline>Model rationale · confidence {(item.confidence*100).toFixed(0)}%</Overline>
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
          {item.flags.map((f, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'minmax(180px, 220px) minmax(140px, 200px) 1fr',
              gap:14, alignItems:'flex-start',
              padding:'12px 14px', background:'var(--color-muted)',
              border:'1px solid var(--color-border)', borderRadius:12,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{
                  width:28, height:28, borderRadius:8,
                  background:'var(--color-brand-50)', color:'var(--color-brand-700)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><I.Sparkles style={{ width:12, height:12 }}/></span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>MODEL</div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{f.model}</div>
                </div>
              </div>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <FlagLevelDot level={f.level}/>
                  <span style={{ fontSize:12, fontWeight:600 }}>{f.cat}</span>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--color-muted-foreground)', marginTop:3, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  level · {f.level}
                </div>
              </div>
              <div style={{ fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>{f.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action panel */}
      <div style={{
        marginTop:18, padding:'16px 18px', borderRadius:14,
        background:'var(--color-brand-50)', border:'1px solid var(--color-brand-200)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700 }}>Decision</div>
            <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:2 }}>
              Recorded with your moderator handle, hashed onto the audit chain. Citizen is notified instantly.
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn variant="solid" tone="primary" size="md" icon={<I.Check style={{ width:14, height:14 }}/>}>Publish</Btn>
            <Btn variant="bordered" tone="default" size="md" icon={<I.Paperclip style={{ width:14, height:14 }}/>}>Request more evidence</Btn>
            <Btn variant="bordered" tone="default" size="md" icon={<I.MessageSq style={{ width:14, height:14 }}/>}>Escalate to senior</Btn>
            <Btn variant="solid" tone="primary" size="md" icon={<I.X style={{ width:14, height:14 }}/>}>Reject</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModAudit = () => (
  <Card>
    <SectionHead icon={<I.Calendar style={{ width:15, height:15 }}/>} title="Audit trail" subtitle="Last 6 actions on this complaint" dense/>
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[
        { at:'14:08 IST', who:'Llama Guard 3', what:'Defamation risk · level high · officer name + verbatim threat', tone:'warning' },
        { at:'14:08 IST', who:'IndicNER',       what:'PII scan · officer badge public · complainant anon. OK.',    tone:'success' },
        { at:'14:08 IST', who:'Toxicity-v3',    what:'Hate / slurs · 0.18 · clear',                                 tone:'success' },
        { at:'14:09 IST', who:'router',         what:'Routed to human queue · confidence above human-only band',    tone:'default' },
        { at:'14:14 IST', who:'mod-7A1',        what:'Picked up · 6 min on case',                                    tone:'default' },
        { at:'14:18 IST', who:'mod-7A1',        what:'Asked submitter for the 12-second clip · awaiting response',  tone:'warning' },
      ].map((r, i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', marginTop:5, flexShrink:0,
            background: r.tone==='success' ? 'var(--color-success-500)' : r.tone==='warning' ? 'var(--color-warning-500)' : 'var(--color-gray-300)' }}/>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600 }}>{r.who} <span style={{ color:'var(--color-muted-foreground)', fontWeight:500 }}>· {r.at}</span></div>
            <div style={{ fontSize:11.5, color:'var(--color-muted-foreground)', marginTop:2, lineHeight:1.5 }}>{r.what}</div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const ModerationQueue = () => {
  const s = window.fvBatch3.modSummary;
  const items = window.fvBatch3.modQueue;
  const [sel, setSel] = React.useState(items[0].id);
  const selItem = items.find(i => i.id === sel) || items[0];
  return (
    <div>
      <MiniHeader trail={<>
        <span>Internal · Moderator</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>AI moderation queue</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Filter style={{ width:13, height:13 }}/>}>Filters</Btn>
          <Btn variant="bordered" tone="default" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Export</Btn>
          <Btn variant="solid" tone="primary" size="sm" icon={<I.Sparkles style={{ width:13, height:13 }}/>}>Auto-clear suggestions</Btn>
        </div>
      }/>
      <main style={{ maxWidth:1280, margin:'0 auto', padding:'20px 24px 80px' }}>
        <div style={{ marginBottom:16 }}>
          <ModSummary s={s}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:16 }}>
          {/* Queue list */}
          <div>
            <ModFilter/>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {items.map(it => (
                <ModRow key={it.id} item={it} selected={it.id === sel} onPick={() => setSel(it.id)}/>
              ))}
            </div>
          </div>
          {/* Detail + audit */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>
            <ModDetail item={selItem}/>
            <ModAudit/>
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Citizen-facing appeal screen ─────────────────────────────────────
const ModerationAppeal = () => {
  const a = window.fvBatch3.appeal;
  return (
    <div>
      <MiniHeader trail={<>
        <span>My complaints</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600, fontFamily:'var(--font-mono)' }}>#{a.complaintId}</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Appeal</span>
      </>} right={
        <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Share with a moderator you trust</Btn>
      }/>
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'28px 24px 80px' }}>
        <div style={{
          padding:'24px 28px', borderRadius:20, marginBottom:24,
          background:'var(--color-warning-50)', border:'1px solid var(--color-warning-200)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--color-warning-900)', fontSize:11, fontFamily:'var(--font-mono)', letterSpacing:'0.08em', fontWeight:700 }}>
            <I.Flash style={{ width:13, height:13 }}/>
            COMPLAINT HELD · AUTOMATED FILTER
          </div>
          <h1 style={{ margin:'10px 0 8px', fontSize:30, fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, textWrap:'balance' }}>
            Your complaint was flagged by Llama&nbsp;Guard&nbsp;3 and is awaiting human review.
          </h1>
          <p style={{ margin:0, fontSize:14.5, lineHeight:1.65, color:'var(--color-foreground)', maxWidth:760, textWrap:'pretty' }}>
            Filed at <strong>{a.rejectedAt}</strong>. The platform did not publish it. You can either <strong>edit the flagged sections</strong> and resubmit immediately, or <strong>appeal to a moderator</strong> — a verified citizen reviewer who will read the full record. We never share your handle with the accused.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24, alignItems:'flex-start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Reasons */}
            <Card>
              <SectionHead icon={<I.Sparkles style={{ width:15, height:15 }}/>}
                title="Why your complaint was flagged" subtitle="Plain-language summary of the model rationale." dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {a.reasons.map((r, i) => (
                  <div key={i} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-muted)', border:'1px solid var(--color-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <FlagLevelDot level="high"/>
                      <span style={{ fontSize:12.5, fontWeight:700 }}>{r.cat}</span>
                      <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>
                        {r.model} · score {r.score.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--color-foreground)', lineHeight:1.55 }}>
                      The model identified the span <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'0 6px', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:11.5 }}>{r.span}</span> as community-targeted or pejorative language. Replacing it with neutral civic vocabulary (e.g. "officials of <em>community X</em>" → "elected representatives of <em>this constituency</em>") usually clears the filter.
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Edit + appeal form */}
            <Card>
              <SectionHead icon={<I.FileText style={{ width:15, height:15 }}/>}
                title="Edit and resubmit · or appeal" subtitle="Anything you write here goes only to the moderator. The accused never sees it." dense/>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, marginBottom:6 }}>Your original complaint, with flagged spans highlighted</div>
                  <div style={{
                    padding:'14px 16px', borderRadius:12, background:'var(--color-card)',
                    border:'1px solid var(--color-border)',
                    fontSize:13, lineHeight:1.6, color:'var(--color-foreground)',
                  }}>
                    These <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'1px 6px', borderRadius:6 }}>[slur]</span> politicians from <span style={{ background:'var(--color-danger-100)', color:'var(--color-danger-800)', padding:'1px 6px', borderRadius:6 }}>[community]</span> are destroying [city] — they refused my FIR for the third time this month at Powai station and laughed when I asked for the refusal in writing.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, marginBottom:6 }}>Suggested edit</div>
                  <div style={{
                    padding:'14px 16px', borderRadius:12,
                    background:'var(--color-success-50)', border:'1px solid var(--color-success-200)',
                    fontSize:13, lineHeight:1.6,
                  }}>
                    Officials at <strong>Powai police station</strong> refused my FIR for the third time this month and laughed when I asked for the refusal in writing.
                    <span style={{ display:'block', marginTop:6, fontSize:11.5, color:'var(--color-success-800)', fontFamily:'var(--font-mono)' }}>auto-edit · keeps every verifiable fact, drops two flagged spans</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:600, marginBottom:6 }}>If you stand by your original wording, write a note to the moderator</div>
                  <textarea placeholder="e.g. 'This phrase is a quote from the officer himself, captured in attached audio.'" style={{
                    width:'100%', minHeight:96, padding:'12px 14px',
                    borderRadius:12, border:'1px solid var(--color-border)',
                    background:'var(--color-card)', color:'var(--color-foreground)',
                    fontFamily:'inherit', fontSize:13, lineHeight:1.5, resize:'vertical', outline:'none',
                  }}/>
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <Btn variant="solid" tone="primary" size="md" icon={<I.Check style={{ width:14, height:14 }}/>}>Apply suggested edit & resubmit</Btn>
                  <Btn variant="bordered" tone="default" size="md" icon={<I.MessageSq style={{ width:14, height:14 }}/>}>Appeal to a moderator</Btn>
                  <Btn variant="ghost" size="md">Withdraw</Btn>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar — privacy contract */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:24 }}>
            <Card accent>
              <Overline>What appeal does not do</Overline>
              <ul style={{ margin:'10px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  'Reveal your handle to the accused or to the public',
                  'Override the filter automatically · a human reads it',
                  'Reset the 30-day filing cooldown if rejected again',
                ].map((s, i) => (
                  <li key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12, color:'var(--color-foreground)', lineHeight:1.55 }}>
                    <I.X style={{ width:11, height:11, color:'var(--color-brand-700)', marginTop:4, flexShrink:0 }}/>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <Overline>Timeline</Overline>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:10, fontSize:12 }}>
                {[
                  { d:'Now',          t:'Complaint flagged & held', tone:'danger' },
                  { d:'After resubmit', t:'Filter re-runs · ~12s',    tone:'default' },
                  { d:'After appeal',   t:'Moderator review · 24h',   tone:'warning' },
                  { d:'On clear',       t:'Anchored on Polygon',      tone:'success' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', marginTop:6, flexShrink:0,
                      background: r.tone==='success' ? 'var(--color-success-500)' :
                                  r.tone==='warning' ? 'var(--color-warning-500)' :
                                  r.tone==='danger' ? 'var(--color-danger-500)' : 'var(--color-gray-400)' }}/>
                    <div>
                      <div style={{ fontWeight:600 }}>{r.d}</div>
                      <div style={{ color:'var(--color-muted-foreground)', marginTop:1 }}>{r.t}</div>
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

Object.assign(window, { ModerationQueue, ModerationAppeal });
