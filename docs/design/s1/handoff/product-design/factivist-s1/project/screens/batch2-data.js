// Factivist — Mock data for Shareable Report Card, Constituency Shame Index,
// and Critical Issue Escalation moment.

// Top 10 worst-performing constituencies — for the Shame Index.
window.fvDataExtra.shameIndex = [
  { rank:1, ac:'Powai',           state:'MH', mp:'S. Pawar',           grade:'D',  score:32, complaints:511, resolved:9,   delta:-12, broken:14 },
  { rank:2, ac:'Mahadevapura',    state:'KA', mp:'L. Krishnamurthy',   grade:'D',  score:34, complaints:514, resolved:14,  delta:-9,  broken:12 },
  { rank:3, ac:'Okhla',           state:'DL', mp:'O. Abdulla',         grade:'D',  score:36, complaints:512, resolved:12,  delta:-7,  broken:11 },
  { rank:4, ac:'Mumbai South',    state:'MH', mp:'Anant V. Kulkarni',  grade:'C+', score:58, complaints:412, resolved:16,  delta:-3,  broken:6  },
  { rank:5, ac:'Bengaluru South', state:'KA', mp:'K. Sridhar Naidu',   grade:'D',  score:32, complaints:988, resolved:5,   delta:-15, broken:14 },
  { rank:6, ac:'Lucknow',         state:'UP', mp:'S. R. Verma',        grade:'D',  score:38, complaints:421, resolved:18,  delta:-6,  broken:10 },
  { rank:7, ac:'East Delhi',      state:'DL', mp:'A. Khurana',         grade:'C-', score:48, complaints:241, resolved:22,  delta:-2,  broken:8  },
  { rank:8, ac:'Hyderabad',       state:'TS', mp:'M. Z. Hussain',      grade:'C+', score:54, complaints:198, resolved:24,  delta:-1,  broken:7  },
  { rank:9, ac:'Kolkata NE',      state:'WB', mp:'P. Banerji',         grade:'C',  score:51, complaints:184, resolved:20,  delta:0,   broken:9  },
  { rank:10,ac:'Patna Sahib',     state:'BR', mp:'H. R. Singh',        grade:'C-', score:46, complaints:138, resolved:21,  delta:+1,  broken:8  },
];

// Best-performing — counterpart, for the small "Top 5" strip.
window.fvDataExtra.honourIndex = [
  { rank:1, ac:'Pune Cantonment',  state:'MH', mp:'Dr. Rohini S. Patkar', grade:'A-', score:84, complaints:462, resolved:69 },
  { rank:2, ac:'Thiruvananthapuram',state:'KL',mp:'A. Pillai',            grade:'B+', score:78, complaints:121, resolved:62 },
  { rank:3, ac:'Coimbatore',       state:'TN', mp:'R. Sundaram',          grade:'B+', score:76, complaints:188, resolved:58 },
  { rank:4, ac:'Pune Khadakwasla', state:'MH', mp:'V. Date',              grade:'B',  score:72, complaints:318, resolved:42 },
  { rank:5, ac:'Bengaluru Central',state:'KA', mp:'R. Tharoor',           grade:'B',  score:71, complaints:218, resolved:48 },
];

// Severity-soaked sectors for the right rail story
window.fvDataExtra.shameSectors = [
  { label:'Police misconduct',  pct:34, count:8412 },
  { label:'RTI obstruction',    pct:21, count:5184 },
  { label:'Infrastructure',     pct:18, count:4488 },
  { label:'Healthcare',         pct:12, count:2940 },
  { label:'Land disputes',      pct:8,  count:1980 },
  { label:'Environment',        pct:7,  count:1620 },
];

// The complaint at the threshold-crossing moment
window.fvDataExtra.criticalMoment = {
  id: 4819,
  title: 'JJ Hospital ICU bed allocation: 11 deaths waitlisted in May',
  body: 'RTI reveals an 84-bed deficit at JJ Hospital ICU. Six citizens have attested with hospital paperwork and discharge summaries. Trust in the BMC zone E facility is collapsing.',
  category: 'Healthcare failures',
  severity: 'Critical',
  constituency: 'Mumbai South',
  state: 'Maharashtra',
  by: 'citizen-3J6M0A',
  filedOn: '11 May 2026',
  // Endorsement at the moment of crossing
  endorsements: 1000,
  threshold: 1000,
  comments: 142,
  evidence: 7,
  // Velocity over the past 12 hours
  velocity: [12, 18, 24, 31, 42, 58, 76, 92, 124, 168, 212, 264],
  // Top recent endorsers
  recentEndorsers: ['citizen-K4L2M0','citizen-L9X3Y7','citizen-V1Z4Q3','citizen-7H2D1S','citizen-8M2N1Q','citizen-3J6M0A','citizen-D8N1V2','citizen-M5T3K6','citizen-2L4M7P','citizen-A1Q9W7'],
  // Cascade actions unlocked when crossed
  unlocked: [
    { id:'critical-board',    label:'Critical Issues board',         sub:'Listed nationally for 7 days · top of constituency feed' },
    { id:'press-pack',        label:'Press pack auto-generated',     sub:'Shareable cards, embed link, anchored citation' },
    { id:'priority-review',   label:'Priority review by community',  sub:'AI summary requested · senior verifiers notified' },
    { id:'leader-pinned',     label:'Pinned to leader report card',  sub:'Visible on Mumbai South MP profile until response' },
    { id:'state-feed',        label:'Routed to Maharashtra state feed', sub:'1.8L verified citizens in subscription list' },
  ],
};
