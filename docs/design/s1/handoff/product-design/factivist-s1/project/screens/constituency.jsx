// Factivist — Constituency explorer (real-map edition)
// Replaces the hex-grid version. Renders all 4,182 assembly constituencies
// from the india-acs topojson, with state-level density at India view and
// per-AC density when a state is selected.

const ConstituencyExplorer = () => {
  const [selected, setSelected] = React.useState(null); // ST_NAME or null
  const [hovered, setHovered]   = React.useState(null);
  const [pinnedAC, setPinnedAC] = React.useState(null); // { st, ac, ... }
  const [colorBy, setColorBy]   = React.useState('volume');

  const states = window.fvIndiaStateSummary || [];
  const stateData = window.fvStatesByName || {};
  const featured = window.fvFeaturedACs || {};

  const selStateData = selected ? stateData[selected] : null;
  const selStateMeta = selected ? states.find(s => s.name === selected) : null;
  const featuredACs = selected ? (featured[selected] || []) : [];

  // National totals
  const totals = React.useMemo(() => {
    let c = 0;
    for (const st of states) c += (stateData[st.name]?.complaints || 0);
    return { complaints: c, acs: 4182, constituencies: 543, verified: 184_212, delta: '+1,438' };
  }, [states, stateData]);

  // Top states ranked by current colorBy metric (for the country view list)
  const topStates = React.useMemo(() => {
    const metric = colorBy === 'severity' ? 'severity' : 'complaints';
    return states
      .map(s => ({ ...s, ...stateData[s.name] }))
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
      .slice(0, 8);
  }, [states, stateData, colorBy]);

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span>Explore</span>
        <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Constituencies</span>
        {selected && <>
          <I.ChevronR style={{width:11,height:11, color:'var(--color-gray-400)'}}/>
          <span style={{ color:'var(--color-foreground)', fontFamily:'var(--font-mono)' }}>{titleCase(selected)}</span>
        </>}
      </>} right={
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {selected && (
            <button onClick={() => { setSelected(null); setPinnedAC(null); }} style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'6px 10px', background:'var(--color-card)',
              border:'1px solid var(--color-border)', borderRadius:9999,
              cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600,
            }}>
              <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}>
                <I.ChevronR style={{width:12,height:12}}/>
              </span>
              Back to India
            </button>
          )}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            height:34, padding:'0 12px', background:'var(--color-muted)',
            border:'1px solid var(--color-border)', borderRadius:10, fontSize:13,
            minWidth:260,
          }}>
            <I.Search style={{width:14,height:14, color:'var(--color-muted-foreground)'}}/>
            <input placeholder="Search by pincode, AC, or MLA name" style={{
              flex:1, border:0, background:'transparent', outline:'none',
              fontFamily:'inherit', fontSize:13, color:'var(--color-foreground)',
            }}/>
          </div>
        </div>
      }/>

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'24px 24px 80px' }}>
        {/* Top strip: KPIs + filter chips */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:16, gap:14, flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', gap:12 }}>
            <Kpi value={totals.complaints.toLocaleString()} label="Complaints · 12mo"/>
            <Kpi value={totals.acs.toLocaleString()} label="Constituencies tracked"/>
            <Kpi value={(totals.verified/1000).toFixed(0) + 'k'} label="Verified citizens"/>
            <Kpi value={totals.delta} label="New · last 24h" tone="brand"/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginRight:6 }}>COLOR BY</span>
            {['volume','severity','resolution'].map(c => (
              <button key={c} onClick={() => setColorBy(c)} style={{
                padding:'6px 11px', borderRadius:9999,
                background: colorBy === c ? 'var(--color-foreground)' : 'var(--color-card)',
                color: colorBy === c ? 'var(--color-background)' : 'var(--color-foreground)',
                border: '1px solid ' + (colorBy === c ? 'var(--color-foreground)' : 'var(--color-border)'),
                cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600,
              }}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
            ))}
          </div>
        </div>

        {/* Main grid: map + side dossier */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, marginBottom:20 }}>
          <Card pad={0} style={{ overflow:'hidden' }}>
            <div style={{
              padding:'14px 18px', borderBottom:'1px solid var(--color-border)',
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
            }}>
              <div>
                <Overline>{selected ? selStateMeta?.acs + ' constituencies · ' + titleCase(selected) : '4,182 assembly constituencies · all-India'}</Overline>
                <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>
                  {selected
                    ? 'Hover any AC for details · tap to pin'
                    : 'Tap a state to drill in · or pick from the list →'}
                </div>
              </div>
              <HeatLegend palette={colorBy} label={colorBy === 'severity' ? 'SEVERITY' : colorBy === 'resolution' ? 'RESOLUTION RATE' : 'COMPLAINT VOLUME'}/>
            </div>
            <div style={{
              position:'relative',
              background:
                'radial-gradient(ellipse at 30% 30%, var(--color-muted) 0%, var(--color-background) 90%)',
            }}>
              <IndiaMap
                width={860} height={680}
                stateData={stateData}
                selectedState={selected}
                colorBy={colorBy}
                hoveredAC={hovered}
                onSelect={(st) => { setSelected(st); setPinnedAC(null); }}
                onHoverAC={(h) => setHovered(h)}
              />
              {/* Hover tooltip */}
              {hovered && (
                <div style={{
                  position:'absolute', left:14, top:14,
                  padding:'10px 12px', background:'var(--color-card)',
                  border:'1px solid var(--color-border)', borderRadius:10,
                  boxShadow:'var(--shadow-md)',
                  pointerEvents:'none', maxWidth:240,
                }}>
                  <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--color-muted-foreground)', letterSpacing:'0.04em' }}>
                    {titleCase(hovered.st)} · AC {hovered.ac}
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--color-foreground)', marginTop:3, lineHeight:1.3 }}>
                    {hovered.acName ? titleCase(hovered.acName) : 'Constituency'}
                  </div>
                  {!selected && stateData[hovered.st] && (
                    <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:3, fontSize:11, color:'var(--color-muted-foreground)' }}>
                      <div>State total · <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{stateData[hovered.st].complaints?.toLocaleString()}</span> complaints</div>
                    </div>
                  )}
                  {selected && (() => {
                    const f = (featured[selected] || []).find(x => x.ac === hovered.ac);
                    if (!f) return null;
                    return (
                      <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:3, fontSize:11, color:'var(--color-muted-foreground)' }}>
                        <div>Complaints · <span style={{ fontFamily:'var(--font-mono)', color:'var(--color-foreground)' }}>{f.complaints}</span></div>
                        <div>MLA · {f.mla}</div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Country mini-legend overlay */}
              {!selected && (
                <div style={{
                  position:'absolute', right:14, top:14,
                  padding:'10px 12px', background:'var(--color-card)',
                  border:'1px solid var(--color-border)', borderRadius:10,
                  boxShadow:'var(--shadow-xs)',
                  fontSize:11, color:'var(--color-muted-foreground)', maxWidth:200, lineHeight:1.55,
                }}>
                  <strong style={{ color:'var(--color-foreground)', fontWeight:600 }}>Pre-delimitation map.</strong> One polygon per assembly constituency. State outlines emerge from shared AC borders.
                </div>
              )}
            </div>
          </Card>

          {/* SIDE — top states or selected-state dossier */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {!selected && (
              <Card>
                <SectionHead
                  icon={<I.Ranking style={{width:16,height:16}}/>}
                  title="Top states · ranked"
                  subtitle={colorBy === 'severity' ? 'by severity index' : colorBy === 'resolution' ? 'by resolution rate' : 'by complaint volume'}
                />
                <ol style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:4 }}>
                  {topStates.map((s, i) => {
                    const metric = colorBy === 'severity' ? s.severity
                      : colorBy === 'resolution' ? s.resolved
                      : s.complaints;
                    const display = colorBy === 'severity' ? Math.round(metric*100) + '%'
                      : colorBy === 'resolution' ? Math.round(metric*100) + '%'
                      : (metric || 0).toLocaleString();
                    return (
                      <li key={s.name}>
                        <button onClick={() => { setSelected(s.name); setPinnedAC(null); }} style={{
                          width:'100%', textAlign:'left',
                          display:'grid', gridTemplateColumns:'18px 1fr auto', alignItems:'center', gap:10,
                          padding:'8px 10px', borderRadius:10,
                          background:'transparent', border:'1px solid transparent',
                          cursor:'pointer', fontFamily:'inherit',
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                          <span style={{
                            fontSize:11, fontFamily:'var(--font-mono)',
                            color:'var(--color-muted-foreground)', textAlign:'right',
                          }}>{(i+1).toString().padStart(2,'0')}</span>
                          <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
                            <span style={{ fontSize:13, fontWeight:500, color:'var(--color-foreground)' }}>{titleCase(s.name)}</span>
                            <RowBar value={(s.density || 0) * 100} max={100} height={4}
                              color={colorBy === 'severity' ? 'var(--color-danger-500)'
                                : colorBy === 'resolution' ? 'var(--color-success-500)'
                                : 'var(--color-brand-500)'}/>
                          </div>
                          <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--color-foreground)', fontWeight:600 }}>{display}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            )}

            {selected && (
              <>
                <Card>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                    <div>
                      <Overline>State</Overline>
                      <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.02em', marginTop:4, lineHeight:1.15 }}>
                        {titleCase(selected)}
                      </div>
                      <div style={{ fontSize:11, color:'var(--color-muted-foreground)', marginTop:4, fontFamily:'var(--font-mono)' }}>
                        {selStateMeta?.acs} assembly constituencies
                      </div>
                    </div>
                    <span style={{
                      padding:'4px 10px', background:'var(--color-gray-900)', color:'var(--color-gray-50)',
                      borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', letterSpacing:'0.06em', fontWeight:600,
                    }}>ST {selStateMeta?.st_code}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <Kpi value={(selStateData?.complaints || 0).toLocaleString()} label="Complaints"/>
                    <Kpi value={Math.round((selStateData?.severity || 0) * 100) + '%'} label="Severity"
                      tone={selStateData?.severity > 0.6 ? 'danger' : 'warning'}/>
                    <Kpi value={Math.round((selStateData?.resolved || 0) * 100) + '%'} label="Resolution rate"
                      tone={selStateData?.resolved > 0.35 ? 'success' : 'default'}/>
                    <Kpi value={(featured[selected]?.length || 0) + '/' + selStateMeta?.acs} label="ACs with verified records"/>
                  </div>
                </Card>

                <Card>
                  <SectionHead
                    icon={<I.Ranking style={{width:16,height:16}}/>}
                    title="Hot constituencies"
                    subtitle={'Top ' + featuredACs.length + ' in ' + titleCase(selected) + ' · by ' + colorBy}
                    dense
                  />
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {featuredACs.map((f, i) => {
                      const isPinned = pinnedAC && pinnedAC.ac === f.ac;
                      return (
                        <button key={f.ac}
                          onClick={() => setPinnedAC(isPinned ? null : { st: selected, ...f })}
                          onMouseEnter={() => setHovered({ st: selected, ac: f.ac, acName: f.name })}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            width:'100%', textAlign:'left',
                            display:'grid', gridTemplateColumns:'1fr auto auto', alignItems:'center', gap:10,
                            padding:'9px 11px', borderRadius:10,
                            background: isPinned ? 'var(--color-brand-50)' : 'var(--color-card)',
                            border: '1px solid ' + (isPinned ? 'var(--color-brand-300)' : 'var(--color-border)'),
                            cursor:'pointer', fontFamily:'inherit',
                          }}>
                          <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>
                            <span style={{ fontSize:13, fontWeight:500, color:'var(--color-foreground)' }}>{f.name}</span>
                            <span style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:2 }}>AC {f.ac} · MLA {f.mla}</span>
                          </div>
                          <span style={{
                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                            width:32, height:22, borderRadius:6,
                            background: f.grade.startsWith('A') ? 'var(--color-success-100)'
                              : f.grade.startsWith('B') ? 'var(--color-brand-100)'
                              : f.grade.startsWith('C') ? 'var(--color-warning-100)'
                              : 'var(--color-danger-100)',
                            color: f.grade.startsWith('A') ? 'var(--color-success-800)'
                              : f.grade.startsWith('B') ? 'var(--color-brand-800)'
                              : f.grade.startsWith('C') ? 'var(--color-warning-900)'
                              : 'var(--color-danger-800)',
                            fontWeight:700, fontSize:11,
                          }}>{f.grade}</span>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)', minWidth:36, textAlign:'right' }}>{f.complaints}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {pinnedAC && (
                  <Card accent>
                    <SectionHead
                      icon={<I.MapPin style={{width:16,height:16}}/>}
                      title={pinnedAC.name}
                      subtitle={'AC ' + pinnedAC.ac + ' · ' + titleCase(selected)}
                      dense
                    />
                    <div style={{ fontSize:12, lineHeight:1.6, color:'var(--color-brand-900)', marginBottom:10 }}>
                      <strong>{pinnedAC.complaints}</strong> verified complaints · severity <strong>{Math.round(pinnedAC.severity*100)}%</strong> · resolution <strong>{pinnedAC.resolved}%</strong>. Sitting MLA <strong>{pinnedAC.mla}</strong> ({pinnedAC.grade}).
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <Btn variant="solid" tone="primary" size="sm" iconRight={<I.ChevronR style={{width:12,height:12}}/>}>Open report card</Btn>
                      <Btn variant="bordered" tone="default" size="sm">See complaints</Btn>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* AC table when a state is selected */}
        {selected && featuredACs.length > 0 && (
          <Card pad={0}>
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--color-border)' }}>
              <div>
                <Overline>Featured ACs · {titleCase(selected)}</Overline>
                <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>
                  {featuredACs.length} of {selStateMeta?.acs} shown · sorted by severity
                </div>
              </div>
              <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{width:12,height:12}}/>}>See all {selStateMeta?.acs} ACs</Btn>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2.4fr) 1.4fr 1.4fr 1fr 1fr 1fr', alignItems:'center', padding:'10px 20px', borderBottom:'1px solid var(--color-border)', fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em' }}>
              <div>CONSTITUENCY</div>
              <div>SITTING MLA</div>
              <div>MP</div>
              <div>GRADE</div>
              <div>COMPLAINTS</div>
              <div>RESOLVED</div>
            </div>
            {featuredACs.map((c, i) => (
              <div key={c.ac} style={{
                display:'grid', gridTemplateColumns:'minmax(0,2.4fr) 1.4fr 1.4fr 1fr 1fr 1fr',
                alignItems:'center', padding:'12px 20px',
                borderBottom: i === featuredACs.length-1 ? 'none' : '1px solid var(--color-border)',
              }}>
                <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--color-foreground)' }}>{c.name}</div>
                  <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                    AC {c.ac} · {titleCase(selected)}
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--color-foreground)' }}>{c.mla}</div>
                <div style={{ fontSize:13, color:'var(--color-foreground)' }}>{c.mp}</div>
                <div>
                  <span style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:36, height:28, borderRadius:8,
                    background: c.grade.startsWith('A') ? 'var(--color-success-100)'
                      : c.grade.startsWith('B') ? 'var(--color-brand-100)'
                      : c.grade.startsWith('C') ? 'var(--color-warning-100)'
                      : 'var(--color-danger-100)',
                    color: c.grade.startsWith('A') ? 'var(--color-success-800)'
                      : c.grade.startsWith('B') ? 'var(--color-brand-800)'
                      : c.grade.startsWith('C') ? 'var(--color-warning-900)'
                      : 'var(--color-danger-800)',
                    fontWeight:700, fontSize:12,
                  }}>{c.grade}</span>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>{c.complaints.toLocaleString()}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:6, background:'var(--color-gray-100)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ width: c.resolved + '%', height:'100%', background: c.resolved>40 ? 'var(--color-success-500)' : 'var(--color-warning-500)' }}/>
                  </div>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-muted-foreground)' }}>{c.resolved}%</span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
};

function titleCase(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/(^|\s|&\s|-)([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

Object.assign(window, { ConstituencyExplorer });
