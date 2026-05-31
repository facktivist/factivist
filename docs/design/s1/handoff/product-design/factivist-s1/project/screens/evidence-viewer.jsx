// Factivist — Evidence Viewer (desktop)
// Universal viewer for image, video, audio, PDF, DOCX, XLSX, PPTX, TXT, CSV.
// Layout: file list rail + viewer pane + metadata sidebar.

// Format-specific glyph + tint
const FMT_STYLE = {
  Image: { bg:'oklch(0.88 0.05 250)',  fg:'oklch(0.35 0.10 250)', label:'IMG' },
  Video: { bg:'oklch(0.88 0.08 27)',   fg:'oklch(0.45 0.18 27)',  label:'VID' },
  Audio: { bg:'oklch(0.88 0.08 145)',  fg:'oklch(0.45 0.16 145)', label:'AUD' },
  PDF:   { bg:'oklch(0.92 0.05 27)',   fg:'oklch(0.55 0.20 27)',  label:'PDF' },
  DOCX:  { bg:'oklch(0.92 0.06 250)',  fg:'oklch(0.45 0.18 250)', label:'DOC' },
  XLSX:  { bg:'oklch(0.92 0.06 145)',  fg:'oklch(0.45 0.16 145)', label:'XLS' },
  PPTX:  { bg:'oklch(0.92 0.06 35)',   fg:'oklch(0.50 0.18 35)',  label:'PPT' },
  TXT:   { bg:'var(--color-muted)',    fg:'var(--color-gray-700)',label:'TXT' },
  CSV:   { bg:'oklch(0.92 0.04 145)',  fg:'oklch(0.45 0.12 145)', label:'CSV' },
};

const FileTile = ({ f, active, onSelect }) => {
  const s = FMT_STYLE[f.kind] || FMT_STYLE.TXT;
  return (
    <button onClick={onSelect} style={{
      width:'100%', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
      padding:'10px 12px', borderRadius:10,
      background: active ? 'var(--color-brand-50)' : 'transparent',
      border:'1px solid ' + (active ? 'var(--color-brand-200)' : 'transparent'),
      display:'flex', gap:10, alignItems:'flex-start',
    }}>
      <div style={{
        width:34, height:42, borderRadius:6, flexShrink:0,
        background:s.bg, color:s.fg,
        display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:'var(--font-mono)', fontSize:10, fontWeight:800, letterSpacing:'0.06em',
      }}>
        <span>{s.label}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.label}</div>
        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', fontFamily:'var(--font-mono)', marginTop:3 }}>
          {f.size}
          {f.duration && <span> · {f.duration}</span>}
          {f.pages && <span> · {f.pages}pp</span>}
          {f.rows && <span> · {f.rows} rows</span>}
        </div>
      </div>
    </button>
  );
};

// ─── Viewer renderers per format ───────────────────────────────────
const ImageViewer = () => (
  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d0d', borderRadius:14, position:'relative' }}>
    <div style={{
      width:'80%', maxWidth:560, aspectRatio:'4/3', borderRadius:10, overflow:'hidden',
      background:'linear-gradient(135deg, oklch(0.45 0.04 250), oklch(0.25 0.05 250))',
      position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <I.Image style={{ width:80, height:80, color:'rgba(255,255,255,0.18)' }}/>
      <span style={{
        position:'absolute', top:12, left:12, padding:'3px 8px',
        background:'rgba(0,0,0,0.55)', color:'#fff',
        borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:'0.06em',
      }}>HEIC · 4032×3024</span>
    </div>
    <div style={{ position:'absolute', left:14, top:14, display:'flex', gap:6 }}>
      <ViewerChip>Image</ViewerChip>
      <ViewerChip muted>Page 1 of 1</ViewerChip>
    </div>
  </div>
);

const VideoViewer = ({ f }) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0d0d0d', borderRadius:14, overflow:'hidden', position:'relative' }}>
    <div style={{
      flex:1, position:'relative',
      background:'linear-gradient(135deg, oklch(0.30 0.06 250), oklch(0.12 0.05 27))',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <button style={{
        width:80, height:80, borderRadius:'50%', border:0, cursor:'pointer',
        background:'rgba(255,255,255,0.92)', color:'#0d0d0d',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div style={{ position:'absolute', left:14, top:14, display:'flex', gap:6 }}>
        <ViewerChip>Video</ViewerChip>
        <ViewerChip muted>{f.duration} · 1920×1080</ViewerChip>
      </div>
      <div style={{ position:'absolute', right:14, top:14 }}>
        <ViewerChip muted>0.5× · 1× · 1.5× · 2×</ViewerChip>
      </div>
    </div>
    {/* timeline */}
    <div style={{ padding:'14px 16px', background:'#1c1c1c', display:'flex', alignItems:'center', gap:12 }}>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>0:14</span>
      <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.18)', borderRadius:99, overflow:'hidden', position:'relative' }}>
        <div style={{ width:'20%', height:'100%', background:'var(--color-brand-500)', borderRadius:99 }}/>
        <span style={{ position:'absolute', left:'20%', top:-3, width:11, height:11, borderRadius:'50%', background:'#fff', boxShadow:'0 0 0 2px var(--color-brand-500)' }}/>
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.6)' }}>{f.duration}</span>
    </div>
  </div>
);

const AudioViewer = ({ f }) => {
  const wave = Array.from({ length: 80 }, (_, i) => 0.3 + 0.6 * Math.abs(Math.sin(i * 0.6 + Math.cos(i * 0.31))));
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'oklch(0.25 0.08 145)', borderRadius:14, position:'relative' }}>
      <div style={{ position:'absolute', left:14, top:14, display:'flex', gap:6 }}>
        <ViewerChip>Audio</ViewerChip>
        <ViewerChip muted>{f.duration} · Opus 48 kHz</ViewerChip>
      </div>
      <div style={{ width:'80%', display:'flex', flexDirection:'column', gap:24 }}>
        {/* Waveform */}
        <div style={{ display:'flex', alignItems:'center', gap:2, height:120 }}>
          {wave.map((v, i) => (
            <span key={i} style={{
              flex:1, height: (v * 100) + '%',
              background: i < 22 ? 'oklch(0.78 0.16 145)' : 'rgba(255,255,255,0.30)',
              borderRadius:2,
            }}/>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button style={{
            width:60, height:60, borderRadius:'50%', border:0, cursor:'pointer',
            background:'#fff', color:'oklch(0.25 0.08 145)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div style={{ flex:1, fontFamily:'var(--font-mono)', color:'#fff', display:'flex', justifyContent:'space-between' }}>
            <span>0:34</span><span style={{ opacity:0.6 }}>{f.duration}</span>
          </div>
          <button style={{
            padding:'7px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.3)',
            background:'transparent', color:'#fff', cursor:'pointer', fontFamily:'inherit',
            fontSize:11, fontWeight:600,
          }}>Transcript</button>
        </div>
      </div>
    </div>
  );
};

const PdfViewer = ({ f }) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#222', borderRadius:14, overflow:'hidden', position:'relative' }}>
    <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>
      <ViewerChip>PDF</ViewerChip>
      <span style={{ flex:1 }}>{f.label}</span>
      <ViewerChip muted>Page 4 of {f.pages}</ViewerChip>
    </div>
    <div style={{ flex:1, padding:18, overflow:'auto', display:'flex', justifyContent:'center' }}>
      <div style={{
        width:520, padding:'48px 56px', background:'#fff', color:'#222',
        borderRadius:4, boxShadow:'0 12px 30px rgba(0,0,0,0.4)',
        display:'flex', flexDirection:'column', gap:10,
      }}>
        <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'#888', letterSpacing:'0.06em' }}>OFFICE OF THE CHIEF INFORMATION COMMISSIONER · MUMBAI</div>
        <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.01em', marginTop:8 }}>RTI/MZN/2025/0341 — Response</div>
        <div style={{ height:1, background:'#222', margin:'8px 0' }}/>
        {[
          'In response to your request dated 14 January 2025, the following is furnished under Section 6 of the Right to Information Act, 2005:',
          '1. Total complaints registered at Powai station between 1 Jan 2024 and 31 Dec 2024: 412.',
          '2. Complaints in which FIR was refused / converted to NCR after first visit: 188.',
          '3. Complaints in which complainant returned after refusal and FIR was eventually filed: 24.',
          '4. The remaining records are partially redacted under Section 8(1)(j).',
        ].map((p, i) => (
          <p key={i} style={{ margin:0, fontSize:11, lineHeight:1.65, color:'#222' }}>{p}</p>
        ))}
        <div style={{ marginTop:20, paddingTop:8, borderTop:'1px solid #ddd', display:'flex', justifyContent:'space-between', fontSize:9, color:'#888', fontFamily:'var(--font-mono)' }}>
          <span>RTI / MZN / 2025 / 0341</span><span>P4</span>
        </div>
      </div>
    </div>
    <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'center', gap:6, background:'#1a1a1a' }}>
      {[1,2,3,4,5].map(p => (
        <span key={p} style={{
          width:8, height:8, borderRadius:'50%',
          background: p === 4 ? 'var(--color-brand-500)' : 'rgba(255,255,255,0.25)',
        }}/>
      ))}
      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'rgba(255,255,255,0.6)', marginLeft:10 }}>4 / {f.pages}</span>
    </div>
  </div>
);

const DocxViewer = ({ f }) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#1c1c1c', borderRadius:14, overflow:'hidden', position:'relative' }}>
    <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>
      <ViewerChip>DOCX</ViewerChip>
      <span style={{ flex:1 }}>{f.label}</span>
      <ViewerChip muted>Rendered to read-only</ViewerChip>
    </div>
    <div style={{ flex:1, padding:24, overflow:'auto', display:'flex', justifyContent:'center' }}>
      <div style={{
        width:560, padding:'56px 64px', background:'#fff', color:'#1c1c1c',
        borderRadius:2, boxShadow:'0 12px 30px rgba(0,0,0,0.4)',
        fontFamily:'Georgia, serif',
      }}>
        <div style={{ textAlign:'center', fontSize:14, fontWeight:700, letterSpacing:'0.02em' }}>IN THE COURT OF THE METROPOLITAN MAGISTRATE</div>
        <div style={{ textAlign:'center', fontSize:13, marginTop:4 }}>AT MUMBAI</div>
        <div style={{ textAlign:'right', fontSize:11, marginTop:14, fontFamily:'var(--font-mono)' }}>CR. MISC. APPL. NO. ____ / 2026</div>
        <div style={{ marginTop:14, fontSize:13 }}>
          <strong>citizen-K4L2M0</strong> (Anonymous Petitioner via Factivist) … <em>Petitioner</em><br/>
          <span style={{ marginLeft:32 }}>vs</span><br/>
          The State of Maharashtra (Through Senior Inspector, Powai Police Station) … <em>Respondent</em>
        </div>
        <div style={{ marginTop:18 }}>
          <strong style={{ fontFamily:'inherit' }}>APPLICATION UNDER SECTION 156(3) OF THE CRIMINAL PROCEDURE CODE, 1973</strong>
          <p style={{ margin:'8px 0 0', fontSize:12, lineHeight:1.65 }}>
            The Petitioner submits that on 14.05.2026, an attempt to register an FIR at Powai station against the proprietors of Powai Heights LLP was refused by the Duty Officer in violation of <strong>Section 154(3) CrPC</strong>, and the directions in <strong>Lalita Kumari v. State of UP (2013)</strong>.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const SheetViewer = ({ f }) => {
  const rows = [
    ['Date','Visit#','Station','Officer','Section','Outcome'],
    ['14 May 2026','1','Powai','SI Pawar','§154 CrPC','Refused — settle privately'],
    ['15 May 2026','2','Powai','SI Pawar','§154 CrPC','Refused — NCR not issued'],
    ['15 May 2026','3','Powai','SI Pawar','§154 CrPC','Refused — "consult builder"'],
    ['16 May 2026','—','RTI portal','—','RTI Act §6','Filed'],
    ['18 May 2026','—','Magistrate','—','§156(3) CrPC','Draft submitted'],
    ['20 May 2026','—','Powai','Inspector Singh','§154 CrPC','Provisional NCR issued'],
  ];
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#1c1c1c', borderRadius:14, overflow:'hidden', position:'relative' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>
        <ViewerChip>XLSX</ViewerChip>
        <span style={{ flex:1 }}>{f.label}</span>
        <ViewerChip muted>Sheet 1 of 2 · {f.rows} rows</ViewerChip>
      </div>
      <div style={{ flex:1, overflow:'auto', padding:18 }}>
        <div style={{
          background:'#fff', borderRadius:4, overflow:'hidden',
          boxShadow:'0 12px 30px rgba(0,0,0,0.4)',
        }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)', fontSize:11 }}>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ background: ri === 0 ? '#f4f4f4' : '#fff' }}>
                  {r.map((cell, ci) => (
                    <td key={ci} style={{
                      padding:'7px 10px',
                      borderRight:'1px solid #e5e5e5', borderBottom:'1px solid #e5e5e5',
                      color: ri === 0 ? '#444' : '#222',
                      fontWeight: ri === 0 ? 700 : 400,
                      fontSize: ri === 0 ? 10 : 11,
                      whiteSpace:'nowrap',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={'e' + i}>
                  {Array.from({ length: rows[0].length }).map((__, ci) => (
                    <td key={ci} style={{ padding:'7px 10px', borderRight:'1px solid #e5e5e5', borderBottom:'1px solid #f0f0f0', color:'#bbb' }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PptxViewer = ({ f }) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#1c1c1c', borderRadius:14, overflow:'hidden', position:'relative' }}>
    <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>
      <ViewerChip>PPTX</ViewerChip>
      <span style={{ flex:1 }}>{f.label}</span>
      <ViewerChip muted>Slide 3 of {f.pages}</ViewerChip>
    </div>
    <div style={{ flex:1, padding:22, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{
        width:520, aspectRatio:'16/9',
        background:'linear-gradient(135deg, oklch(0.22 0.04 250), oklch(0.14 0.06 250))',
        color:'#fff', borderRadius:6, boxShadow:'0 20px 50px rgba(0,0,0,0.45)',
        padding:'30px 36px', position:'relative',
      }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'rgba(255,255,255,0.55)', letterSpacing:'0.08em' }}>POWAI HEIGHTS · TIMELINE</div>
        <div style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.02em', marginTop:10, lineHeight:1.1 }}>2024 · The complaint cluster forms</div>
        <ul style={{ margin:'18px 0 0', padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:7, fontSize:12, color:'rgba(255,255,255,0.85)' }}>
          <li>· 12 Jan — First complaint anchored; 87 endorsements in 6 days</li>
          <li>· 04 Mar — CIDCO show-cause notice on tower 3 setback</li>
          <li>· 21 Sep — FIR refused at Powai station; pattern flagged</li>
          <li>· 18 Nov — 10 buyers file consumer forum case CC/2491/2024</li>
        </ul>
      </div>
    </div>
    <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:6, justifyContent:'center', background:'#161616' }}>
      {Array.from({ length: f.pages }).map((_, i) => (
        <span key={i} style={{
          width: i === 2 ? 22 : 7, height:7, borderRadius:99,
          background: i === 2 ? 'var(--color-brand-500)' : 'rgba(255,255,255,0.22)',
        }}/>
      ))}
    </div>
  </div>
);

const TextViewer = ({ f }) => {
  const sample = [
    "[00:00:00] Citizen: Hello sir, I want to file a complaint against Powai Heights LLP.",
    "[00:00:05] Officer: What is the complaint?",
    "[00:00:08] Citizen: The builder has not given possession of our flats for 44 months.",
    "[00:00:14] Officer: This is a civil matter. Settle privately.",
    "[00:00:18] Citizen: Section 415 IPC applies — there is intent to deceive.",
    "[00:00:24] Officer: I'm telling you, settle. NCR I can't issue today.",
    "[00:00:31] Citizen: Lalita Kumari requires you to register.",
    "[00:00:36] Officer: Come back tomorrow.",
  ];
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#1c1c1c', borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-mono)', fontSize:11, color:'#fff' }}>
        <ViewerChip>TXT</ViewerChip>
        <span style={{ flex:1 }}>{f.label}</span>
        <ViewerChip muted>{f.lines} lines · UTF-8</ViewerChip>
      </div>
      <div style={{ flex:1, padding:24, overflow:'auto', background:'#0f0f0f' }}>
        <pre style={{
          margin:0, fontFamily:'var(--font-mono)', fontSize:12.5, lineHeight:1.75, color:'oklch(0.88 0.005 270)',
          whiteSpace:'pre-wrap',
        }}>{sample.join('\n')}</pre>
      </div>
    </div>
  );
};

const CsvViewer = ({ f }) => <SheetViewer f={{ ...f, rows: f.rows }}/>;

const ViewerChip = ({ children, muted=false }) => (
  <span style={{
    padding:'3px 8px', borderRadius:9999,
    background: muted ? 'rgba(255,255,255,0.10)' : 'var(--color-brand-500)',
    color: muted ? 'rgba(255,255,255,0.85)' : '#fff',
    fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, letterSpacing:'0.04em',
  }}>{children}</span>
);

// ─── Main viewer screen ───────────────────────────────────────────
const EvidenceViewer = () => {
  const files = window.fvDataExtra.viewerEvidence;
  const [activeId, setActiveId] = React.useState(4); // PDF by default
  const f = files.find(x => x.id === activeId) || files[0];

  const Renderer = {
    Image: ImageViewer, Video: VideoViewer, Audio: AudioViewer,
    PDF: PdfViewer, DOCX: DocxViewer, XLSX: SheetViewer,
    PPTX: PptxViewer, TXT: TextViewer, CSV: CsvViewer,
  }[f.kind] || TextViewer;

  return (
    <div style={{ background:'var(--color-background)', minHeight:'100%' }}>
      <MiniHeader trail={<>
        <span style={{ fontFamily:'var(--font-mono)' }}>#4820</span>
        <I.ChevronR style={{ width:11, height:11, color:'var(--color-gray-400)' }}/>
        <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>Evidence viewer</span>
      </>} right={
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" icon={<I.Link style={{ width:13, height:13 }}/>}>Copy hash</Btn>
          <Btn variant="ghost" size="sm" icon={<I.FileText style={{ width:13, height:13 }}/>}>Download</Btn>
        </div>
      }/>

      <main style={{
        maxWidth:1280, margin:'0 auto', padding:'20px 24px 60px',
        display:'grid', gridTemplateColumns:'240px minmax(0,1fr) 280px', gap:20,
        height:'calc(100vh - 60px)', boxSizing:'border-box',
      }}>
        {/* LEFT — file list */}
        <aside>
          <Overline style={{ marginBottom:10 }}>Evidence · {files.length}</Overline>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {files.map(file => <FileTile key={file.id} f={file} active={file.id === activeId} onSelect={()=>setActiveId(file.id)}/>)}
          </div>
          <div style={{
            marginTop:14, padding:'10px 12px', borderRadius:10,
            background:'var(--color-muted)', border:'1px solid var(--color-border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              <I.Paperclip style={{ width:12, height:12, color:'var(--color-brand-600)' }}/>
              <span style={{ fontSize:11.5, fontWeight:600 }}>Supported formats</span>
            </div>
            <div style={{ fontSize:10.5, color:'var(--color-muted-foreground)', lineHeight:1.55 }}>
              Image (JPG/PNG/HEIC) · Video (MP4/MOV/WEBM) · Audio (M4A/MP3/WAV) · PDF · DOC/DOCX · XLS/XLSX · PPT/PPTX · TXT/MD · CSV
            </div>
          </div>
        </aside>

        {/* CENTER — viewer */}
        <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
          <Renderer f={f}/>
        </div>

        {/* RIGHT — metadata */}
        <aside style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card pad={16}>
            <Overline style={{ marginBottom:8 }}>File</Overline>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--color-foreground)', lineHeight:1.3, marginBottom:8, wordBreak:'break-all' }}>{f.label}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5, fontFamily:'var(--font-mono)', fontSize:11 }}>
              {[
                ['Format', f.kind],
                ['Size',   f.size],
                f.duration && ['Duration', f.duration],
                f.pages    && ['Pages',    f.pages],
                f.rows     && ['Rows',     f.rows],
                f.lines    && ['Lines',    f.lines],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--color-muted-foreground)' }}>{k}</span>
                  <span style={{ color:'var(--color-foreground)', fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card pad={16} accent>
            <Overline style={{ marginBottom:8 }}>Anchor</Overline>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, lineHeight:1.65, color:'var(--color-brand-900)' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>hash</span><span style={{ fontWeight:600 }}>h7Hw2x…q8K1</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>chain</span><span style={{ fontWeight:600 }}>Polygon zkEVM</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>tx</span><span style={{ fontWeight:600 }}>0x4ae9d3…f2c3</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>anchored</span><span style={{ fontWeight:600 }}>14 May · 11:47</span></div>
            </div>
            <Btn variant="ghost" size="sm" iconRight={<I.ChevronR style={{ width:12, height:12 }}/>} style={{ marginTop:8 }}>Open in explorer</Btn>
          </Card>

          <Card pad={16}>
            <Overline style={{ marginBottom:8 }}>Privacy</Overline>
            <ul style={{ margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
              {[
                'Metadata stripped on-device before upload',
                'No GPS / device / author tags in the anchored file',
                'Stored on IPFS · pinned across 3 jurisdictions',
              ].map((l,i) => (
                <li key={i} style={{ display:'flex', gap:8, fontSize:11, color:'var(--color-foreground)', lineHeight:1.55 }}>
                  <I.Check style={{ width:11, height:11, color:'var(--color-success-700)', flexShrink:0, marginTop:3 }}/>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </main>
    </div>
  );
};

Object.assign(window, { EvidenceViewer, FMT_STYLE });
