// Factivist — Mock data for Discovery feed, Me profile, and 15-citizen
// resolution attestation.

window.fvDataExtra.feed = [
  {
    id: 4820, status:'Under review', severity:'Critical', category:'Police misconduct',
    title:'FIR refused at Powai station for complaint against local builder',
    body:'Section 154(3) refusal pattern at Powai station — third repeat under same SHO. Lalita Kumari precedent attached.',
    by:'citizen-K4L2M0', when:'2h', constituency:'Mumbai North-East',
    endorsements:412, comments:24, evidence:4, anchor:true, trend:'+88 in 24h',
  },
  {
    id: 4819, status:'Verified', severity:'Critical', category:'Healthcare',
    title:'JJ Hospital ICU bed allocation: 11 deaths waitlisted in May',
    body:'RTI reveals 84-bed deficit. Six citizens have attested with hospital paperwork. Trust collapsing in BMC zone E.',
    by:'citizen-3J6M0A', when:'5h', constituency:'Mumbai South',
    endorsements:984, comments:142, evidence:7, anchor:true, trend:'+212 in 24h', criticalSoon:true,
  },
  {
    id: 4818, status:'Resolved', severity:'High', category:'Infrastructure',
    title:'Mahul corridor potholes finally tarred after 14-month complaint cycle',
    body:'Citizen attestation: 17 of 17 confirm the resurfacing. Anchored as resolved on 18 May 2026.',
    by:'citizen-L9X3Y7', when:'12h', constituency:'Mumbai South',
    endorsements:618, comments:88, evidence:11, anchor:true, trend:'resolved',
  },
  {
    id: 4817, status:'Under review', severity:'High', category:'RTI obstruction',
    title:'Mahul road overlay RTI: pending 94 days, statutory 30 limit blown',
    body:'Fourth RTI in this constituency from same office to cross 90-day mark this quarter.',
    by:'citizen-8M2N1Q', when:'1d', constituency:'Mumbai South',
    endorsements:188, comments:31, evidence:2, anchor:true, trend:'+24 in 24h',
  },
  {
    id: 4816, status:'Published', severity:'Medium', category:'Environment',
    title:'Powai lake outfall releasing untreated sewage during night hours',
    body:'Time-stamped photographs across 4 nights. MPCB inspection requested but no response.',
    by:'citizen-V1Z4Q3', when:'1d', constituency:'Mumbai North-East',
    endorsements:248, comments:19, evidence:9, anchor:true, trend:'+18 in 24h',
  },
  {
    id: 4815, status:'Verified', severity:'High', category:'Caste discrimination',
    title:'Municipal school in Pune refused admission citing "neighbourhood mismatch"',
    body:'Pattern of 3 such refusals in same school in 6 months. RTE Act §12(1)(c) violation.',
    by:'citizen-7H2D1S', when:'2d', constituency:'Pune Cantonment',
    endorsements:518, comments:64, evidence:5, anchor:true, trend:'+11 in 24h',
  },
  {
    id: 4814, status:'Resolved', severity:'Medium', category:'Public transport',
    title:'BEST bus #422 wheelchair ramp restored after 9-month outage',
    body:'After 16 endorsements and a media call-out, ramp inspected and fixed. Attested by 15+ commuters.',
    by:'citizen-K4L2M0', when:'3d', constituency:'Mumbai South',
    endorsements:88, comments:14, evidence:3, anchor:true, trend:'resolved',
  },
];

window.fvDataExtra.trending = [
  { id:4819, title:'JJ Hospital ICU bed allocation', delta:'+212', constituency:'Mumbai South' },
  { id:4820, title:'Powai station FIR refusal', delta:'+88', constituency:'Mumbai North-East' },
  { id:4815, title:'Pune municipal school admission', delta:'+74', constituency:'Pune Cantonment' },
  { id:4816, title:'Powai lake outfall', delta:'+62', constituency:'Mumbai North-East' },
];

window.fvDataExtra.me = {
  handle: 'citizen-K4L2M0',
  joined: '12 Apr 2026',
  verified: true,
  constituency: 'Mumbai South',
  state: 'Maharashtra',
  score: 612,
  scoreTier: 'Engaged',
  scoreNext: 'Trusted',
  scoreToNext: 388, // 1000 = Trusted
  filed: 6,
  endorsed: 142,
  attested: 9,
  followers: 24,
  following: 38,
  // Privacy scoreboard
  privacy: {
    pii: 0,
    nullifier: 'n4Fk2c…m8j2',
    anchored: true,
  },
  // Recent activity (own complaints + endorsements + attestations)
  activity: [
    { kind:'attested', label:'Attested resolution of complaint #4814 — BEST bus #422 ramp', when:'2d', meta:'Attestation 13 of 15 needed' },
    { kind:'filed',    label:'#4820 · FIR refused at Powai station',                         when:'2d', meta:'Under review · 412 endorsements' },
    { kind:'endorsed', label:'#4819 · JJ Hospital ICU bed allocation',                       when:'3d', meta:'Now 984 endorsements' },
    { kind:'comment',  label:"Cited Lalita Kumari (2013) on #4820",                          when:'2d', meta:'38 helpful' },
    { kind:'filed',    label:'#4644 · Mahul corridor electrical pole hazard',                when:'2 wk', meta:'Resolved' },
    { kind:'endorsed', label:'#4612 · Powai Heights tower 3 occupancy denied',               when:'3 wk', meta:'Verified' },
  ],
  // Own complaints (ranking)
  myComplaints: [
    { id:4820, status:'Under review', title:'FIR refused at Powai station for complaint against local builder', endorsements:412, when:'2d' },
    { id:4644, status:'Resolved',     title:'Mahul corridor electrical pole hazard', endorsements:188, when:'2wk' },
    { id:4421, status:'Published',    title:'Sandhurst Road footover bridge stair failure', endorsements:71,  when:'2mo' },
    { id:4218, status:'Verified',     title:'RTI on Mahul tarring tender unanswered 78 days', endorsements:142, when:'2mo' },
    { id:3920, status:'Resolved',     title:'Sion station ramp accessibility', endorsements:88, when:'4mo' },
    { id:3144, status:'Resolved',     title:'BMC ward office Saturday hours never advertised', endorsements:54, when:'8mo' },
  ],
  // Achievements
  badges: [
    { id:'verified',   label:'Verified citizen',    earned:'12 Apr', icon:'ShieldFill' },
    { id:'first',      label:'First complaint',     earned:'14 Apr', icon:'FileText' },
    { id:'hundred',    label:'100+ endorsements',   earned:'29 Apr', icon:'ArrowUp' },
    { id:'precedent',  label:'Cited precedent',     earned:'02 May', icon:'Sparkles' },
    { id:'attester',   label:'15× attester',        earned:'18 May', icon:'Check' },
  ],
};

// 15-citizen resolution attestation for #4814
window.fvDataExtra.attestation = {
  complaintId: 4814,
  title:'BEST bus #422 wheelchair ramp restored after 9-month outage',
  category:'Public transport',
  severity:'Medium',
  constituency:'Mumbai South',
  filedBy:'citizen-K4L2M0',
  filedOn:'14 Aug 2025',
  resolutionClaimedBy:'citizen-L9X3Y7',
  resolutionClaimedOn:'19 May 2026',
  needed: 15,
  attested: 13,
  rejected: 0,
  myStance: 'pending',     // 'pending' | 'attested' | 'disputed'
  evidence: [
    { kind:'Image', label:'ramp-deployed-22May.jpg', size:'2.1 MB' },
    { kind:'Image', label:'wheelchair-board-22May.jpg', size:'1.8 MB' },
    { kind:'Video', label:'ramp-cycle-test.mp4', size:'8.4 MB', duration:'0:34' },
  ],
  attesters: [
    { handle:'citizen-3J6M0A', when:'19 May',        note:'Took the 422 route this morning. Ramp deployed without driver assistance.', confirmed:true },
    { handle:'citizen-8M2N1Q', when:'19 May',        note:'Filmed the deployment cycle myself. Adding the clip as evidence.',          confirmed:true },
    { handle:'citizen-V1Z4Q3', when:'20 May',        note:'Verified via wheelchair user group at Sion Hospital outpatient dept.',     confirmed:true },
    { handle:'citizen-7H2D1S', when:'20 May',        note:'BEST depot has issued a fitness certificate dated 17 May.',                confirmed:true },
    { handle:'citizen-L9X3Y7', when:'21 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-9K8B2R', when:'21 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-2L4M7P', when:'21 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-X7R2W8', when:'22 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-D8N1V2', when:'22 May',        note:'Operating on this route weekly for 18 months. The fix held all week.',     confirmed:true },
    { handle:'citizen-M5T3K6', when:'22 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-A1Q9W7', when:'23 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-B6F4P8', when:'23 May',        note:'',                                                                          confirmed:true },
    { handle:'citizen-C2E5Y9', when:'23 May',        note:'',                                                                          confirmed:true },
  ],
};
