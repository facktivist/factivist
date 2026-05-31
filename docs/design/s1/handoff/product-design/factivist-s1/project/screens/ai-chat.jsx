// Factivist — AI Chat (Ask the corpus)
// Three-column layout:
//   Left   — thread history
//   Center — message thread + composer
//   Right  — source citations for the current answer

const AiChat = () => {
  const t = window.fvDataExtra.aiThread;
  const history = window.fvDataExtra.aiHistory;
  const [active, setActive] = React.useState(1);

  // Format the answer with simple bold (**word**) handling
  const renderAnswer = (text) => text.split('\n\n').map((para, i) => (
    <p key={i} style={{ margin:0, marginBottom:14, lineHeight:1.65, fontSize:14, color:'var(--color-foreground)', textWrap:'pretty' }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
        if (seg.startsWith('**')) return <strong key={j} style={{ fontWeight:600 }}>{seg.slice(2,-2)}</strong>;
        return seg;
      })}
    </p>
  ));

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Ask AI</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{t.query.length > 60 ? t.query.slice(0,60)+'…' : t.query}</span>
      </>} right={
        <Btn variant="ghost" size="sm" icon={<I.Plus style={{width:13,height:13}}/>}>New thread</Btn>
      }/>

      <div style={{
        display:'grid',
        gridTemplateColumns:'240px minmax(0,1fr) 320px',
        gap:0,
        maxWidth:1280, margin:'0 auto',
        minHeight:'calc(100vh - 60px)',
      }}>
        {/* LEFT — history */}
        <aside style={{ padding:'20px 16px', borderRight:'1px solid var(--color-border)' }}>
          <Overline style={{ marginBottom:12 }}>Recent threads</Overline>
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:2 }}>
            {history.map(h => (
              <li key={h.id}>
                <button onClick={()=>setActive(h.id)} style={{
                  width:'100%', textAlign:'left', padding:'9px 10px', borderRadius:8,
                  border:0, fontFamily:'inherit', cursor:'pointer',
                  background: h.id===active ? 'var(--color-brand-50)' : 'transparent',
                  color: h.id===active ? 'var(--color-brand-800)' : 'var(--color-foreground)',
                  display:'flex', flexDirection:'column', gap:2,
                }}>
                  <span style={{ fontSize:13, fontWeight: h.id===active ? 600 : 500, lineHeight:1.35 }}>{h.label}</span>
                  <span style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)' }}>{h.when}</span>
                </button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop:18 }}>
            <Overline style={{ marginBottom:10 }}>Quick scopes</Overline>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'My constituency', icon:<I.MapPin style={{width:13,height:13}}/> },
                { label:'Maharashtra only', icon:<I.Filter style={{width:13,height:13}}/> },
                { label:'Last 30 days', icon:<I.Calendar style={{width:13,height:13}}/> },
                { label:'Verified only', icon:<I.ShieldFill style={{width:13,height:13}}/> },
              ].map((s,i) => (
                <button key={i} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                  border:'1px solid var(--color-border)', background:'var(--color-card)',
                  borderRadius:9999, cursor:'pointer', fontFamily:'inherit',
                  fontSize:12, color:'var(--color-foreground)', textAlign:'left',
                }}>
                  <span style={{ color:'var(--color-brand-600)' }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER — thread */}
        <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>
          <div style={{ flex:1, padding:'28px 28px 24px', display:'flex', flexDirection:'column', gap:20 }}>
            {/* user query */}
            <div style={{ display:'flex', gap:14, alignItems:'flex-start', alignSelf:'flex-end', maxWidth:560 }}>
              <div style={{
                padding:'12px 16px', background:'var(--color-brand-500)', color:'#fff',
                borderRadius:14, borderTopRightRadius:4,
                fontSize:14, lineHeight:1.55, fontWeight:500,
              }}>
                {t.query}
              </div>
              <Avatar handle={window.fvData.me.handle} size={32}/>
            </div>

            {/* AI answer */}
            <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{
                width:32, height:32, borderRadius:10,
                background:'linear-gradient(140deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
                color:'#fff',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <I.Sparkles style={{ width:16, height:16 }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, fontSize:11, color:'var(--color-muted-foreground)' }}>
                  <span style={{ fontFamily:'var(--font-mono)' }}>factivist · Llama 3.3 70B</span>
                  <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    <I.ShieldFill style={{width:11,height:11, color:'var(--color-success-600)'}}/>
                    Grounded in {t.sources.length} anchored complaints
                  </span>
                  <span style={{ width:3, height:3, borderRadius:'50%', background:'currentColor' }}/>
                  <span>1.4s</span>
                </div>
                {renderAnswer(t.answer)}

                {/* Inline data card */}
                <div style={{
                  marginTop:6, marginBottom:16,
                  border:'1px solid var(--color-border)',
                  borderRadius:14, overflow:'hidden',
                  background:'var(--color-card)',
                }}>
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <I.Ranking style={{width:14,height:14, color:'var(--color-brand-600)'}}/>
                      <span style={{ fontSize:12, fontWeight:600 }}>Maharashtra MPs · median RTI response (days)</span>
                    </div>
                    <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)' }}>statutory: 30d</span>
                  </div>
                  <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                    {[
                      { name:'Anant V. Kulkarni',   d:47, c:'Mumbai South' },
                      { name:'P. Naik',             d:38, c:'Mumbai South-Central' },
                      { name:'S. Pawar',            d:34, c:'Mumbai North-East' },
                      { name:'M. Tare',             d:29, c:'Thane' },
                      { name:'R. Patkar',           d:9,  c:'Pune Cantonment' },
                    ].map((r,i) => {
                      const max = 60;
                      const overdue = r.d > 30;
                      return (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'minmax(0,1.4fr) 1.4fr 56px', gap:14, alignItems:'center' }}>
                          <div style={{ fontSize:12, color:'var(--color-foreground)', fontWeight:500 }}>{r.name}
                            <span style={{ color:'var(--color-muted-foreground)', fontWeight:400, marginLeft:6 }}>· {r.c}</span>
                          </div>
                          <div style={{ position:'relative', height:6, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ position:'absolute', left:0, top:0, bottom:0, width: Math.min(100, r.d/max*100) + '%', background: overdue ? 'var(--color-danger-500)' : 'var(--color-success-500)', borderRadius:99 }}/>
                            <div style={{ position:'absolute', left: (30/max*100) + '%', top:-2, bottom:-2, width:1.5, background:'var(--color-gray-400)' }}/>
                          </div>
                          <div style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12, color: overdue ? 'var(--color-danger-700)' : 'var(--color-success-700)', fontWeight:600 }}>{r.d}d</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <Btn variant="ghost" size="sm" icon={<I.ArrowUp style={{width:12,height:12}}/>}>Helpful</Btn>
                  <Btn variant="ghost" size="sm" icon={<I.Link style={{width:12,height:12}}/>}>Copy link</Btn>
                  <Btn variant="ghost" size="sm" icon={<I.FileText style={{width:12,height:12}}/>}>Export as RTI draft</Btn>
                </div>

                {/* Follow-up suggestions */}
                <div style={{ marginTop:18 }}>
                  <Overline style={{ marginBottom:8 }}>Ask next</Overline>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {t.suggestions.map((s,i) => (
                      <button key={i} style={{
                        textAlign:'left', padding:'9px 12px',
                        background:'var(--color-card)',
                        border:'1px solid var(--color-border)',
                        borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                        fontSize:13, color:'var(--color-foreground)',
                        display:'flex', alignItems:'center', gap:10,
                      }}>
                        <I.Sparkles style={{width:13,height:13, color:'var(--color-brand-600)', flexShrink:0}}/>
                        <span style={{ flex:1 }}>{s}</span>
                        <I.ChevronR style={{width:13,height:13, color:'var(--color-muted-foreground)'}}/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Composer */}
          <div style={{
            position:'sticky', bottom:0, padding:'16px 28px 24px',
            background:'var(--color-background)',
            borderTop:'1px solid var(--color-border)',
          }}>
            <div style={{
              display:'flex', alignItems:'flex-end', gap:8,
              padding:12, background:'var(--color-card)',
              border:'1px solid var(--color-border)',
              borderRadius:18, boxShadow:'var(--shadow-md)',
            }}>
              <button style={{
                width:36, height:36, borderRadius:10, border:'1px solid var(--color-border)',
                background:'var(--color-muted)', cursor:'pointer',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                color:'var(--color-gray-700)', flexShrink:0,
              }}>
                <I.Paperclip style={{width:14,height:14}}/>
              </button>
              <textarea
                placeholder="Ask about complaints, leaders, constituencies, RTIs, response times…"
                rows={1}
                style={{
                  flex:1, border:0, outline:'none', resize:'none',
                  fontFamily:'inherit', fontSize:14, lineHeight:1.5,
                  background:'transparent', color:'var(--color-foreground)',
                  padding:'8px 0',
                }}
              />
              <Btn variant="solid" tone="primary" size="md" icon={<I.Sparkles style={{width:14,height:14}}/>}>Ask</Btn>
            </div>
            <div style={{ marginTop:8, fontSize:10, color:'var(--color-muted-foreground)', textAlign:'center', lineHeight:1.55 }}>
              Answers cite anchored complaints only. The model never sees PII; queries are not stored against your identity.
            </div>
          </div>
        </div>

        {/* RIGHT — sources */}
        <aside style={{ padding:'20px 16px', borderLeft:'1px solid var(--color-border)' }}>
          <Overline style={{ marginBottom:14 }}>Sources cited</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {t.sources.map(s => (
              <div key={s.id} style={{
                padding:'12px 14px', background:'var(--color-card)',
                border:'1px solid var(--color-border)', borderRadius:12,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--color-muted-foreground)', marginBottom:6 }}>
                  <span style={{ fontFamily:'var(--font-mono)' }}>#{s.id}</span>
                  <span>·</span>
                  <span>{s.when}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, lineHeight:1.45, color:'var(--color-foreground)' }}>{s.title}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:11, color:'var(--color-muted-foreground)' }}>
                  <I.ArrowUp style={{width:11,height:11}}/>
                  <span style={{ fontFamily:'var(--font-mono)' }}>{s.endorsements}</span>
                  <span>·</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:3, color:'var(--color-success-700)' }}>
                    <I.ShieldFill style={{width:11,height:11}}/>
                    Anchored
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:18, padding:'12px 14px', background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:12, fontSize:11, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
            <strong style={{ color:'var(--color-foreground)' }}>Why grounded?</strong> The model answers from a retrieval index built only from anchored, verified complaints — not from open-web sources. Every claim links back to a record you can audit on Polygon.
          </div>
        </aside>
      </div>
    </div>
  );
};

Object.assign(window, { AiChat });
