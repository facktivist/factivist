// Factivist — Data for the Tier 1 finishers (Search, Evidence viewer,
// Notification prefs) and the Tier 2 finishers (Shareable complaint card,
// Promise tracking deep view).

// ─── Evidence viewer — sample bundle covering every supported format ─
// File formats accepted by Factivist's evidence pipeline. All have on-device
// metadata stripping. Office formats are previewed via server-rendered PDFs.
window.fvDataExtra.evidenceFormats = [
  { ext:'JPG/PNG/HEIC', kind:'Image',     icon:'Image',     hint:'EXIF + GPS stripped on-device' },
  { ext:'MP4/MOV/WEBM', kind:'Video',     icon:'FileText',  hint:'Audio + frame metadata stripped' },
  { ext:'M4A/MP3/WAV',  kind:'Audio',     icon:'Mic',       hint:'Tags stripped, transcoded to Opus' },
  { ext:'PDF',          kind:'PDF',       icon:'FileText',  hint:'Form metadata stripped' },
  { ext:'DOC/DOCX',     kind:'DOCX',      icon:'FileText',  hint:'Author + revision history stripped' },
  { ext:'XLS/XLSX',     kind:'XLSX',      icon:'FileText',  hint:'Author + comments stripped' },
  { ext:'PPT/PPTX',     kind:'PPTX',      icon:'FileText',  hint:'Author + comments stripped' },
  { ext:'TXT/MD',       kind:'TXT',       icon:'FileText',  hint:'No metadata to strip' },
  { ext:'CSV',          kind:'CSV',       icon:'FileText',  hint:'No metadata to strip' },
];

// A richer evidence bundle for the viewer demo
window.fvDataExtra.viewerEvidence = [
  { id:1, kind:'Image', label:'station-refusal-note-14May.heic',      size:'3.8 MB',  pages:null, duration:null },
  { id:2, kind:'Video', label:'powai-station-cctv-frame.mp4',         size:'18.4 MB', pages:null, duration:'1:14' },
  { id:3, kind:'Audio', label:'station-visit-3.m4a',                  size:'2.1 MB',  pages:null, duration:'2:14' },
  { id:4, kind:'PDF',   label:'RTI-vashi-station-2023.pdf',           size:'820 KB',  pages:12,   duration:null },
  { id:5, kind:'DOCX',  label:'magistrate-petition-draft.docx',       size:'64 KB',   pages:6,    duration:null },
  { id:6, kind:'XLSX',  label:'FIR-refusal-tracker-mum-S.xlsx',       size:'112 KB',  pages:null, duration:null, rows:48 },
  { id:7, kind:'PPTX',  label:'powai-builder-timeline-deck.pptx',     size:'2.4 MB',  pages:14,   duration:null },
  { id:8, kind:'TXT',   label:'transcript-station-visit.txt',         size:'18 KB',   pages:null, duration:null, lines:284 },
  { id:9, kind:'CSV',   label:'powai-station-complaints-2024-26.csv', size:'48 KB',   pages:null, duration:null, rows:312 },
];

// ─── Search results ─────────────────────────────────────────────────
window.fvDataExtra.searchResults = {
  query: 'powai station FIR refusal',
  counts: { complaints:38, leaders:2, poi:3, cases:4, comments:124 },
  facets: [
    { id:'all',        label:'All results',  n:171, active:true },
    { id:'complaints', label:'Complaints',   n:38 },
    { id:'leaders',    label:'Leaders',      n:2 },
    { id:'poi',        label:'Accused / POI',n:3 },
    { id:'cases',      label:'Court cases',  n:4 },
    { id:'comments',   label:'Comments',     n:124 },
  ],
  // Top-result complaint hits
  complaints: [
    { id:4820, severity:'Critical', status:'Under review',
      title:'FIR refused at Powai <em>station</em> for complaint against local builder',
      body:'Section 154(3) refusal at <em>Powai station</em>… third repeat under same SHO. Lalita Kumari precedent attached.',
      by:'citizen-K4L2M0', when:'2h', endorsements:412, comments:24, constituency:'Mumbai North-East' },
    { id:4711, severity:'Critical', status:'Verified',
      title:'Custodial detention beyond 24 hours at <em>Powai station</em>, no production',
      body:'Civilian detained 39 hours; produced before magistrate only after pressure. Witness statements attached.',
      by:'citizen-3J6M0A', when:'12d', endorsements:189, comments:48, constituency:'Mumbai North-East' },
    { id:4544, severity:'Critical', status:'Verified',
      title:'<em>Refused</em> to register §354 complaint at <em>Powai station</em>, asked complainant to "settle"',
      body:'Same SHO told complainant her case was "not station business." NCR refused twice.',
      by:'citizen-V1Z4Q3', when:'3mo', endorsements:512, comments:88, constituency:'Mumbai North-East' },
  ],
  // POI hits
  poi: [
    { id:'poi-pwi-2031', name:'Pravin "Bittu" Rao', role:'Builder · Powai Heights LLP',
      risk:'High', linked:21, sub:'Cited in <em>Powai station</em> FIR refusal cluster · 12 critical complaints' },
    { id:'poi-off-pwi',  name:'Inspector Y. Pawar', role:'SHO · Powai station, Mumbai',
      risk:'High', linked:47, sub:'47 complaints traced to this badge. 12 critical, 8 with checkable evidence.' },
  ],
  // Leader hits
  leaders: [
    { id:'mp-mum-ne', name:'S. Pawar', role:'MP · Lok Sabha · Mumbai North-East', grade:'D', score:32, sub:'Constituency hosts <em>Powai station</em>. 12 critical complaints unresolved.' },
  ],
  // Case hits
  cases: [
    { id:'WP-CRL/4821/2024', court:'Bombay HC', matter:'Refusal of FIR registration · <em>Powai station</em>', status:'Adjourned · 11×', next:'04 Jul 2026' },
    { id:'CC/2491/2024',     court:'Consumer Forum, Pune', matter:'10 buyers v. Powai Heights LLP — possession default', status:'In hearing', next:'18 Jun 2026' },
  ],
  // Spotlight comments
  commentHits: [
    { id:'c-1', complaintId:4820, body:'Section 154(3) — you can go directly to the Magistrate under <em>156(3) CrPC</em>…', by:'citizen-L9X3Y7', votes:142 },
    { id:'c-2', complaintId:4711, body:'Lalita Kumari (2013) makes registration mandatory once cognizable offence is disclosed…', by:'citizen-3J6M0A', votes:64 },
  ],
};

// ─── Notification preferences ──────────────────────────────────────
window.fvDataExtra.notifPrefs = {
  channels: {
    push:    true,
    inApp:   true,
    email:   false,
    webhook: false,
  },
  digests: 'daily',  // 'realtime' | 'hourly' | 'daily' | 'weekly' | 'off'
  quietStart: '22:00',
  quietEnd:   '07:00',
  quietHonourCritical: true,
  // Per-event rules
  rules: [
    { id:'milestone',  label:'Endorsement milestones',        sub:'When complaints I filed cross 10, 100, 500, 1,000', push:true,  email:false },
    { id:'response',   label:'Leader responses',              sub:'Official responses on complaints I filed or endorsed', push:true,  email:true },
    { id:'area',       label:'New complaints in my area',     sub:'My constituency and 5 km around my pincode',          push:true,  email:false },
    { id:'consensus',  label:'Critical Issue threshold crossed', sub:'Any complaint I touched hits 1,000 endorsements',  push:true,  email:true },
    { id:'attest',     label:'Resolutions awaiting attestation', sub:'Complaints I endorsed are claimed resolved',       push:true,  email:false },
    { id:'moderation', label:'Moderation actions on me',      sub:'My comment / complaint flagged or removed',           push:true,  email:true },
    { id:'court',      label:'Court case updates',            sub:'New listings or orders in subscribed cases',          push:false, email:true },
    { id:'leader',     label:'Leader report card changes',    sub:'Grade changes on leaders I follow',                   push:false, email:false },
    { id:'press',      label:'Press citations',               sub:'When a journalist cites a complaint I filed',         push:true,  email:false },
  ],
  // Subscribed areas / categories
  areas: [
    { id:'mum-s',  label:'Mumbai South',         kind:'Constituency', count:412 },
    { id:'mum-ne', label:'Mumbai North-East',    kind:'Constituency', count:511 },
    { id:'400076',label:'Powai · 400076',        kind:'Pincode',      count:142 },
  ],
  categories: [
    { id:'police', label:'Police misconduct' },
    { id:'rti',    label:'RTI obstruction' },
    { id:'health', label:'Healthcare failures' },
  ],
};

// ─── Promise tracking — Anant V. Kulkarni deep view ────────────────
window.fvDataExtra.promiseDeep = {
  leader: {
    id:'mp-mum-south', name:'Anant V. Kulkarni', role:'MP · Lok Sabha',
    constituency:'Mumbai South', state:'Maharashtra',
    party:'INC', partyColor:'oklch(0.55 0.20 27)', term:'Jun 2024 – present',
  },
  summary: { total:17, kept:4, partial:5, broken:6, unknown:2 },
  // Promise list with detailed evidence per
  promises: [
    {
      id: 'p1',
      text: '24×7 water supply for Mahul–Chembur corridor by Mar 2025',
      status: 'broken',
      source: 'Manifesto p.14 · "Within first year"',
      deadline: 'Mar 2025',
      daysOverdue: 410,
      progress: 0,
      lastUpdate: '06 May 2026',
      evidence: [
        { kind:'rti',     label:'RTI MH/PMC/2025/0184: 0 of 14 wards connected', when:'02 Apr 2025' },
        { kind:'tender',  label:'PMC bid retendered twice; current bid status frozen', when:'14 Aug 2025' },
        { kind:'press',   label:'Mid-Day cover: "Chembur still waits"',           when:'21 Sep 2025' },
        { kind:'complaint', label:'18 anchored complaints citing dry taps · Mahul', when:'2024-26' },
      ],
      receipts: 18,
    },
    {
      id: 'p2',
      text: 'Skywalk between Sandhurst Road and JJ Hospital',
      status: 'broken',
      source: 'Manifesto p.22',
      deadline: 'End of term',
      daysOverdue: 0,
      progress: 0,
      lastUpdate: '12 Mar 2026',
      evidence: [
        { kind:'rti',    label:'No tender floated. Land acquisition stuck with Railways.', when:'12 Mar 2026' },
        { kind:'press',  label:'Hindustan Times: project "indefinitely deferred"',         when:'04 Feb 2026' },
      ],
      receipts: 6,
    },
    {
      id: 'p3',
      text: 'Open one IPD ward at JJ Hospital trauma centre',
      status: 'kept',
      source: 'Manifesto p.31',
      deadline: 'First year',
      daysOverdue: -45,         // delivered 45 days early
      progress: 100,
      lastUpdate: '12 Feb 2025',
      evidence: [
        { kind:'press',  label:'40-bed IPD ward inaugurated 12 Feb 2025',  when:'12 Feb 2025' },
        { kind:'rti',    label:'BMC RTI confirms operating capacity at 38 beds avg', when:'09 Apr 2026' },
      ],
      receipts: 2,
    },
    {
      id: 'p4',
      text: 'Reserve 30% LAD funds for civic complaints raised on Factivist',
      status: 'kept',
      source: 'Press conf., 8 Aug 2024',
      deadline: 'Ongoing',
      daysOverdue: 0,
      progress: 100,
      lastUpdate: '14 Apr 2026',
      evidence: [
        { kind:'rti',    label:'Office order issued Sep 2024 · ₹2.4 Cr allocated FY25', when:'12 Sep 2024' },
        { kind:'press',  label:'Indian Express: "First MP to formally do this"',        when:'18 Sep 2024' },
      ],
      receipts: 1,
    },
    {
      id: 'p5',
      text: "Push for amendment to RTE Act expanding reservations",
      status: 'partial',
      source: 'Manifesto p.41',
      deadline: 'Within term',
      daysOverdue: 0,
      progress: 35,
      lastUpdate: '08 Mar 2026',
      evidence: [
        { kind:'parl',   label: "Private member's bill introduced 02 Dec 2025",      when:'02 Dec 2025' },
        { kind:'parl',   label:'No committee referral yet; standing committee silent', when:'08 Mar 2026' },
      ],
      receipts: 0,
    },
    {
      id: 'p6',
      text: 'Monthly constituency Saturday with citizens',
      status: 'partial',
      source: 'X post · 14 Jun 2024',
      deadline: 'Monthly',
      daysOverdue: 0,
      progress: 36,
      lastUpdate: '12 Jan 2026',
      evidence: [
        { kind:'press',  label:'5 sessions held in 14 months · last 12 Jan 2026', when:'12 Jan 2026' },
        { kind:'complaint', label:'14 citizens cite missed Saturdays in feedback', when:'2024-26' },
      ],
      receipts: 14,
    },
    {
      id: 'p7',
      text: 'Vote against any anti-RTI amendment',
      status: 'kept',
      source: 'Manifesto p.7',
      deadline: 'Ongoing',
      daysOverdue: 0,
      progress: 100,
      lastUpdate: '14 Aug 2025',
      evidence: [
        { kind:'parl',   label:'Voted Nay on RTI Amendment Bill 2025',  when:'14 Aug 2025' },
      ],
      receipts: 0,
    },
    {
      id: 'p8',
      text: 'Bring Mumbai South under odd-even vehicle scheme',
      status: 'broken',
      source: 'Election rally · 4 May 2024',
      deadline: 'First 18 months',
      daysOverdue: 180,
      progress: 0,
      lastUpdate: '04 May 2026',
      evidence: [
        { kind:'parl',   label:'No motion tabled. State govt cites BMC jurisdiction.', when:'04 May 2026' },
      ],
      receipts: 4,
    },
  ],
};

// ─── Shareable complaint card payload ──────────────────────────────
// (Uses fvDataExtra.complaintDetail as the base. No extra data needed.)
