// Factivist — Complaint Registration data + Complaint detail records
// Used by complaint-register.jsx, complaint-view.jsx, endorse-flow.jsx,
// empty-states.jsx and the mobile companions of all four.

window.fvDataExtra.categoriesFull = [
  { id:'infra',     label:'Infrastructure',         icon:'MapPin',   examples:'Roads, drains, electricity, public buildings' },
  { id:'police',    label:'Police misconduct',      icon:'Flash',    examples:'FIR refusal, custodial torture, intimidation' },
  { id:'rti',       label:'RTI obstruction',        icon:'FileText', examples:'Delayed reply, redacted answers, attacks on activists' },
  { id:'health',    label:'Healthcare failures',    icon:'ShieldFill',examples:'Negligence, overcharging, denied emergency care' },
  { id:'edu',       label:'Education',              icon:'FileText', examples:'Paper leaks, teacher absenteeism, commercialisation' },
  { id:'env',       label:'Environment',            icon:'MapPin',   examples:'Pollution, illegal mining, deforestation' },
  { id:'women',     label:'Women safety',           icon:'ShieldFill',examples:'Harassment, stalking, dowry, DV' },
  { id:'water',     label:'Water · sanitation',     icon:'MapPin',   examples:'Water scarcity, contamination, water mafia' },
  { id:'corrupt',   label:'Corruption',             icon:'Flash',    examples:'Bribery, tender rigging, welfare leakage' },
  { id:'land',      label:'Land · property',        icon:'MapPin',   examples:'Title fraud, builder delays, encroachment' },
  { id:'judicial',  label:'Judicial system',        icon:'Calendar', examples:'Pendency, undertrial neglect, access to justice' },
  { id:'caste',     label:'Caste discrimination',   icon:'ShieldFill',examples:'Untouchability, atrocities, manual scavenging' },
  { id:'transport', label:'Public transport',       icon:'MapPin',   examples:'Accidents, overcrowding, accessibility' },
  { id:'food',      label:'Food safety',            icon:'ShieldFill',examples:'Adulteration, pesticide, fake products' },
  { id:'labor',     label:'Labour rights',          icon:'FileText', examples:'Bonded labour, gig exploitation, migrant abuse' },
  { id:'media',     label:'Press freedom',          icon:'FileText', examples:'Journalist arrests, paid news, takedowns' },
  { id:'digital',   label:'Digital rights',         icon:'Lock',     examples:'Surveillance, shutdowns, cybercrime' },
  { id:'electoral', label:'Electoral malpractice',  icon:'Vote',     examples:'Vote buying, EVM concerns, booth capture' },
];

// A single in-progress draft used by the register screen.
window.fvDataExtra.draftComplaint = {
  category: 'police',
  subCategory: 'FIR refusal',
  severity: 'Critical',
  title: 'FIR refused at Powai station for complaint against local builder',
  body:
    "On 14 May 2026 I attempted to register an FIR against Pravin Rao (Powai Heights LLP) for occupancy denial of 28 flats under a PMAY allotment. The duty officer refused to accept my complaint, instructed me to \"settle privately\" with the builder, and would not even issue an NCR copy.\n\n" +
    "I returned twice the next morning. The same officer refused again. A third visit, accompanied by a member of the resident welfare association, was met with the response that registration would happen \"after the builder is consulted.\"\n\n" +
    "I have attached: (1) a dated note showing my visits, (2) a photograph of the station daily diary entry partially visible, (3) an audio recording of the conversation on the third visit, and (4) the existing chain of NCR refusals I obtained via RTI from Vashi station in 2023, cited under Lalita Kumari v. Govt of UP (2013).",
  attachments: [
    { kind:'Audio', label:'station-visit-3.m4a', size:'2.1 MB', stripped:true },
    { kind:'Image', label:'station-refusal-note.jpg', size:'1.4 MB', stripped:true },
    { kind:'PDF',   label:'RTI-vashi-station-2023.pdf', size:'820 KB', stripped:true },
    { kind:'Image', label:'visit-receipt-14May.heic', size:'3.8 MB', stripping:true },
  ],
  location: {
    pincode: '400076',
    ward: 'Powai · Ward N',
    constituency: 'Mumbai North-East',
    state: 'Maharashtra',
    accurateToMeters: 50,
  },
  accused: [
    { kind:'Officer', name:'Y. Pawar', badge:'M-S/INSP/2031', org:'Powai Station' },
    { kind:'Person',  name:'Pravin "Bittu" Rao', role:'Builder · Powai Heights LLP', poi:'poi-pwi-2031' },
  ],
};

// A canonical complaint detail record (for the View screen).
window.fvDataExtra.complaintDetail = {
  id: 4820,
  title: 'FIR refused at Powai station for complaint against local builder',
  status: 'Under review',            // Submitted → Under review → Verified → Published → Resolved
  severity: 'Critical',
  category: 'Police misconduct',
  subCategory: 'FIR refusal',
  submittedBy: 'citizen-K4L2M0',
  submittedAt: '14 May 2026 · 11:42 IST',
  constituency: 'Mumbai North-East',
  state: 'Maharashtra',
  pincode: '400076',
  body:
    'On 14 May 2026 I attempted to register an FIR against Pravin Rao (Powai Heights LLP) for occupancy denial of 28 flats under a PMAY allotment. The duty officer refused to accept my complaint, instructed me to "settle privately" with the builder, and would not issue an NCR copy.\n\n' +
    'I returned twice the next morning. The same officer refused again. A third visit, accompanied by a member of the resident welfare association, was met with the response that registration would happen "after the builder is consulted."\n\n' +
    'Section 154(3) CrPC and the Lalita Kumari v. Govt of UP (2013) judgment make registration mandatory once cognizable offence is disclosed.',
  endorsements: 412,
  endorsementsToCritical: 1000,
  endorsementsLastDay: 88,
  comments: 24,
  views: 9842,
  shares: 318,
  anchor: { tx:'0x4ae9d3…f2c3', block:'71,184,200', when:'14 May 2026 · 11:47 IST' },
  evidence: [
    { kind:'Audio', label:'station-visit-3.m4a',          size:'2.1 MB', duration:'2:14' },
    { kind:'Image', label:'station-refusal-note.jpg',     size:'1.4 MB' },
    { kind:'PDF',   label:'RTI-vashi-station-2023.pdf',   size:'820 KB' },
    { kind:'Image', label:'visit-receipt-14May.heic',     size:'3.8 MB' },
  ],
  workflow: [
    { id:'submitted', label:'Submitted',   sub:'Citizen filed via app',                state:'done',    at:'14 May · 11:42' },
    { id:'moderated', label:'AI moderated', sub:'Llama Guard 3 + hate-speech check',   state:'done',    at:'14 May · 11:44' },
    { id:'anchored',  label:'Anchored',    sub:'Hash → Polygon · tx 0x4ae9d3…f2c3',    state:'done',    at:'14 May · 11:47' },
    { id:'review',    label:'Under review', sub:'15+ verified citizens cross-checking',state:'current', at:'in progress' },
    { id:'verified',  label:'Verified',    sub:'Endorsed past 100 · 412/1,000 to Critical', state:'partial', at:'pending' },
    { id:'response',  label:'Response',    sub:'Awaiting on-record statement from State', state:'pending', at:'—' },
    { id:'resolved',  label:'Resolved',    sub:'15+ citizen attestations of remediation', state:'pending', at:'—' },
  ],
  linkedPOI: {
    id:'poi-pwi-2031',
    name:'Pravin "Bittu" Rao',
    role:'Builder · Powai Heights LLP',
    risk:'High',
    related: 21,
  },
  judicial: {
    id:'WP-CRL/4821/2024',
    court:'Bombay High Court',
    matter:'Refusal of FIR registration · Powai station',
    next:'04 Jul 2026',
  },
  topEndorsers: ['citizen-L9X3Y7','citizen-7H2D1S','citizen-3J6M0A','citizen-V1Z4Q3','citizen-8M2N1Q'],
};
