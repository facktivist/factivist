// Factivist — Threaded comments / discussion view
// Reads window.fvDataExtra.thread

const CommentNode = ({ node, depth=0, op }) => {
  if (node.system) {
    return (
      <div style={{
        marginLeft: depth * 24,
        padding:'10px 14px',
        background:'var(--color-brand-50)',
        border:'1px solid var(--color-brand-200)',
        borderRadius:10,
        display:'flex', gap:10, alignItems:'flex-start',
        fontSize:12, color:'var(--color-brand-900)', lineHeight:1.55,
      }}>
        <I.Sparkles style={{width:13,height:13, color:'var(--color-brand-600)', flexShrink:0, marginTop:2}}/>
        <div>
          <strong style={{ fontWeight:600 }}>Pattern detector</strong> · auto-aggregating signal
          <div style={{ marginTop:4 }}>{node.body}</div>
        </div>
      </div>
    );
  }
  if (node.removed) {
    return (
      <div style={{
        marginLeft: depth*24,
        padding:'10px 14px',
        background:'var(--color-muted)',
        border:'1px dashed var(--color-border)',
        borderRadius:10,
        fontSize:12, color:'var(--color-muted-foreground)', lineHeight:1.55,
        fontStyle:'italic',
      }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--color-danger-700)', fontStyle:'normal', fontWeight:600 }}>
          <I.X style={{width:11,height:11}}/>
          Removed by Llama Guard
        </span>
        <div style={{ marginTop:4 }}>{node.body}</div>
        <button style={{ marginTop:6, background:'transparent', border:0, color:'var(--color-brand-700)', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:600, padding:0, fontStyle:'normal' }}>
          Read the moderation note →
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: depth * 24, position:'relative' }}>
      {depth>0 && <span style={{
        position:'absolute', left:-12, top:0, bottom:12,
        width:2, background:'var(--color-border)',
      }}/>}
      <div style={{
        display:'flex', gap:12,
      }}>
        <Avatar handle={node.handle} size={32} tone={node.op ? 'primary' : 'gray'}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>
              {node.handle}
            </span>
            {node.verified && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3, color:'var(--color-brand-600)', fontSize:11, fontWeight:600 }}>
                <I.ShieldFill style={{width:11,height:11}}/>
                verified
              </span>
            )}
            {node.op && <Chip tone="primary" sm>OP</Chip>}
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>· {node.when}</span>
          </div>
          <div style={{
            fontSize:14, lineHeight:1.6, color:'var(--color-foreground)',
            textWrap:'pretty', marginBottom: node.attachment ? 10 : 8,
          }}>
            {node.body}
          </div>
          {node.attachment && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap:10, padding:'8px 12px',
              background:'var(--color-muted)', border:'1px solid var(--color-border)',
              borderRadius:10, marginBottom:8,
            }}>
              <I.FileText style={{width:14,height:14, color:'var(--color-brand-600)'}}/>
              <span style={{ fontSize:12, fontWeight:500, color:'var(--color-foreground)' }}>{node.attachment.label}</span>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{node.attachment.size}</span>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:14 }}>
            <button style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'5px 10px', borderRadius:8, border:'1px solid var(--color-border)',
              background:'var(--color-card)', cursor:'pointer', fontFamily:'inherit',
              fontSize:12, color:'var(--color-foreground)', fontWeight:600,
            }}>
              <I.ArrowUp style={{width:12,height:12, color:'var(--color-brand-600)'}}/>
              <span style={{ fontFamily:'var(--font-mono)' }}>{node.votes}</span>
            </button>
            <button style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'5px 10px', borderRadius:8, border:0,
              background:'transparent', cursor:'pointer', fontFamily:'inherit',
              fontSize:12, color:'var(--color-muted-foreground)', fontWeight:500,
            }}>
              <I.MessageSq style={{width:12,height:12}}/>
              Reply
            </button>
            <button style={{
              padding:'5px 10px', border:0, background:'transparent',
              cursor:'pointer', fontFamily:'inherit',
              fontSize:12, color:'var(--color-muted-foreground)', fontWeight:500,
            }}>
              Share
            </button>
          </div>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:-4 }}>
          {node.children.map(child => <CommentNode key={child.id} node={child} depth={depth+1}/>)}
        </div>
      )}
    </div>
  );
};

const CommentsScreen = () => {
  const t = window.fvDataExtra.thread;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span style={{ fontFamily:'var(--font-mono)' }}>#{t.complaintId}</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Discussion</span>
      </>} right={
        <Btn variant="ghost" size="sm" icon={<I.Filter style={{width:13,height:13}}/>}>
          {t.sort}
        </Btn>
      }/>

      <main style={{ maxWidth:820, margin:'0 auto', padding:'28px 24px 100px' }}>
        {/* Parent complaint context */}
        <div style={{
          padding:'16px 18px', background:'var(--color-card)',
          border:'1px solid var(--color-border)', borderRadius:14,
          marginBottom:24, display:'flex', alignItems:'flex-start', gap:14,
        }}>
          <I.FileText style={{width:18,height:18, color:'var(--color-brand-600)', marginTop:2}}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginBottom:4 }}>
              IN REPLY TO #{t.complaintId}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.4 }}>{t.title}</div>
          </div>
          <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{width:13,height:13}}/>}>Open record</Btn>
        </div>

        {/* Header bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:18,
        }}>
          <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.01em' }}>
            {t.nodes.length + t.nodes.reduce((a,n)=>a+(n.children?.length||0),0)} comments
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--color-muted-foreground)' }}>
            <I.ShieldFill style={{width:13,height:13, color:'var(--color-success-600)'}}/>
            <span>Llama Guard auto-moderation</span>
            <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
            <button style={{ background:'transparent', border:0, color:'var(--color-brand-700)', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, padding:0 }}>
              Read policy
            </button>
          </div>
        </div>

        {/* Composer */}
        <div style={{
          padding:14, background:'var(--color-card)',
          border:'1px solid var(--color-border)', borderRadius:14,
          marginBottom:24,
        }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <Avatar handle={window.fvData.me.handle} size={32}/>
            <textarea
              placeholder="Add a verified-citizen comment. Cite section, link a record, or share precedent."
              rows={2}
              style={{
                flex:1, border:0, outline:'none', resize:'none',
                fontFamily:'inherit', fontSize:14, lineHeight:1.55,
                background:'transparent', color:'var(--color-foreground)',
                padding:'6px 0',
              }}
            />
          </div>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginTop:12, paddingTop:12, borderTop:'1px solid var(--color-border)',
          }}>
            <div style={{ display:'flex', gap:6 }}>
              <button style={{
                width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
                background:'var(--color-card)', cursor:'pointer',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                color:'var(--color-gray-700)',
              }}>
                <I.Paperclip style={{width:14,height:14}}/>
              </button>
              <button style={{
                width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
                background:'var(--color-card)', cursor:'pointer',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                color:'var(--color-gray-700)',
              }}>
                <I.Link style={{width:14,height:14}}/>
              </button>
              <button style={{
                width:32, height:32, borderRadius:8, border:'1px solid var(--color-border)',
                background:'var(--color-card)', cursor:'pointer',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                color:'var(--color-gray-700)',
              }}>
                <I.FileText style={{width:14,height:14}}/>
              </button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:11, color:'var(--color-muted-foreground)', display:'inline-flex', alignItems:'center', gap:5 }}>
                <I.ShieldFill style={{width:11,height:11, color:'var(--color-brand-500)'}}/>
                Posting as <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{window.fvData.me.handle}</span>
              </span>
              <Btn variant="solid" tone="primary" size="sm">Post</Btn>
            </div>
          </div>
        </div>

        {/* Thread */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {t.nodes.map(n => <CommentNode key={n.id} node={n}/>)}
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { CommentsScreen });
