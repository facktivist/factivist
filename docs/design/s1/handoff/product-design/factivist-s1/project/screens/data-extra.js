// Factivist — additional mock data for the report cards, profiles,
// constituency explorer, AI chat, notifications, and threaded comments.
// Real Indian specifics. Fictional names.

window.fvDataExtra = {
  // ─── Leaders (MLAs / MPs) ───────────────────────────────────────
  leaders: [
    {
      id: 'mp-mum-south',
      name: 'Anant V. Kulkarni',
      role: 'MP · Lok Sabha',
      constituency: 'Mumbai South',
      state: 'Maharashtra',
      party: 'INC',
      partyColor: 'oklch(0.55 0.20 27)',
      term: 'Jun 2024 – present',
      grade: 'C+',
      gradeTone: 'warning',
      score: 58,
      attendance: 38,             // % Lok Sabha attendance
      attendanceAvg: 79,
      debates: 12,
      questions: 47,
      questionsAvg: 96,
      assetGrowth: 142,           // % change since first declaration
      promisesTotal: 17,
      promisesKept: 4,
      promisesPartial: 5,
      promisesBroken: 6,
      promisesUnknown: 2,
      complaintsTotal: 1284,
      complaintsResolved: 211,
      complaintsAcknowledged: 388,
      complaintsIgnored: 685,
      responseTimeDays: 47,
      responseTimeAvg: 21,
      attended: [
        // 24 sessions, last 2 years
        1,1,0,1,1, 0,0,0,1,0, 1,0,0,1,0, 0,1,0,0,1, 1,0,0,1,
      ],
      categoryBreakdown: [
        { cat: 'Infrastructure',   n: 412 },
        { cat: 'Healthcare',       n: 218 },
        { cat: 'Police misconduct',n: 188 },
        { cat: 'RTI obstruction',  n: 142 },
        { cat: 'Environment',      n: 121 },
        { cat: 'Corruption',       n: 98  },
        { cat: 'Other',            n: 105 },
      ],
    },
    {
      id: 'mla-pun-cant',
      name: 'Dr. Rohini S. Patkar',
      role: 'MLA · Vidhan Sabha',
      constituency: 'Pune Cantonment',
      state: 'Maharashtra',
      party: 'BJP',
      partyColor: 'oklch(0.55 0.20 35)',
      term: 'Nov 2024 – present',
      grade: 'A−',
      gradeTone: 'success',
      score: 84,
      attendance: 91,
      attendanceAvg: 79,
      debates: 38,
      questions: 142,
      questionsAvg: 96,
      assetGrowth: 18,
      promisesTotal: 12,
      promisesKept: 7,
      promisesPartial: 3,
      promisesBroken: 1,
      promisesUnknown: 1,
      complaintsTotal: 462,
      complaintsResolved: 318,
      complaintsAcknowledged: 102,
      complaintsIgnored: 42,
      responseTimeDays: 9,
      responseTimeAvg: 21,
      attended: [
        1,1,1,1,0, 1,1,1,1,1, 0,1,1,1,1, 1,1,1,0,1, 1,1,1,1,
      ],
      categoryBreakdown: [
        { cat: 'Infrastructure',   n: 142 },
        { cat: 'Healthcare',       n: 98  },
        { cat: 'Environment',      n: 76  },
        { cat: 'Women safety',     n: 54  },
        { cat: 'Education',        n: 48  },
        { cat: 'Corruption',       n: 22  },
        { cat: 'Other',            n: 22  },
      ],
    },
    {
      id: 'mp-ben-south',
      name: 'K. Sridhar Naidu',
      role: 'MP · Lok Sabha',
      constituency: 'Bengaluru South',
      state: 'Karnataka',
      party: 'IND',
      partyColor: 'oklch(0.55 0.15 250)',
      term: 'Jun 2024 – present',
      grade: 'D',
      gradeTone: 'danger',
      score: 32,
      attendance: 21,
      attendanceAvg: 79,
      debates: 2,
      questions: 8,
      questionsAvg: 96,
      assetGrowth: 414,
      promisesTotal: 22,
      promisesKept: 1,
      promisesPartial: 2,
      promisesBroken: 14,
      promisesUnknown: 5,
      complaintsTotal: 988,
      complaintsResolved: 47,
      complaintsAcknowledged: 121,
      complaintsIgnored: 820,
      responseTimeDays: 112,
      responseTimeAvg: 21,
      attended: [
        0,0,0,1,0, 0,0,0,0,0, 1,0,0,0,1, 0,0,0,0,0, 0,1,0,0,
      ],
      categoryBreakdown: [
        { cat: 'Infrastructure',   n: 318 },
        { cat: 'Land disputes',    n: 188 },
        { cat: 'Police misconduct',n: 142 },
        { cat: 'Water & sanitation', n: 121 },
        { cat: 'Corruption',       n: 98  },
        { cat: 'Other',            n: 121 },
      ],
    },
  ],

  // Promises for the highlighted leader (Anant V. Kulkarni)
  promises: [
    { id: 1, text: '24×7 water supply for Mahul–Chembur corridor by Mar 2025', status: 'broken',  source: 'Manifesto p.14',  evidence: '0 of 14 wards connected. PMC bid retendered twice.' },
    { id: 2, text: 'Skywalk between Sandhurst Road and JJ Hospital',             status: 'broken',  source: 'Manifesto p.22',  evidence: 'No tender floated. Land acquisition stuck with Railways.' },
    { id: 3, text: 'Open one IPD ward at JJ Hospital trauma centre',             status: 'kept',    source: 'Manifesto p.31',  evidence: '40-bed IPD ward inaugurated 12 Feb 2025.' },
    { id: 4, text: 'Reserve 30% LAD funds for civic complaints raised on this platform', status: 'kept', source: 'Press conf., 8 Aug 2024', evidence: 'Order issued Sep 2024. ₹2.4 cr allocated FY25.' },
    { id: 5, text: 'Push for amendment to RTE Act expanding reservations',       status: 'partial', source: 'Manifesto p.41',  evidence: 'Private members\' bill introduced; no committee referral.' },
    { id: 6, text: 'Monthly constituency Saturday with citizens',                status: 'partial', source: 'X post, 14 Jun 2024', evidence: '5 sessions held in 14 months. Last: Jan 2026.' },
    { id: 7, text: 'Vote against any anti-RTI amendment',                        status: 'kept',    source: 'Manifesto p.7',   evidence: 'Voted Nay on RTI Amendment Bill 2025.' },
    { id: 8, text: 'Bring Mumbai South under odd-even vehicle scheme',           status: 'broken',  source: 'Election rally, 4 May 2024', evidence: 'No motion tabled. State govt cites BMC jurisdiction.' },
  ],

  // ─── Accused / Person-of-Interest ───────────────────────────────
  accused: {
    id: 'poi-pwi-2031',
    name: 'Pravin "Bittu" Rao',
    role: 'Builder · Powai Heights LLP',
    aliases: ['P.S. Rao', 'Bittu Builder'],
    operatesIn: ['Mumbai North-East', 'Thane', 'Navi Mumbai'],
    headshot: null,
    risk: 'High',
    firstFlagged: '12 Jan 2024',
    summary: '21 verified complaints linking the firm to undelivered flats, FIR refusals at Powai station, and the demolition of a builder-funded community well in Hadapsar. Two CIDCO show-cause notices pending.',
    metrics: {
      complaints: 21,
      verified: 18,
      resolved: 2,
      open: 16,
      endorsements: 4218,
      mediaCitations: 12,
    },
    timeline: [
      { at: '12 Jan 2024', label: 'First complaint anchored — 87 endorsements in 6 days', tone: 'default' },
      { at: '04 Mar 2024', label: 'CIDCO show-cause notice on tower 3 setback',           tone: 'warning' },
      { at: '21 Sep 2024', label: 'FIR refused at Powai station; complaint pattern flagged',tone: 'warning' },
      { at: '18 Nov 2024', label: '10 buyers file consumer forum case (CC/2491/2024)',     tone: 'default' },
      { at: '07 Jun 2025', label: 'Maharashtra RERA freezes 4 project accounts',           tone: 'warning' },
      { at: '04 Feb 2026', label: 'Second show-cause notice — community well demolition',  tone: 'danger' },
    ],
    linkedComplaints: [
      { id: 4820, title: 'FIR refused at Powai station for complaint against local builder', endorsements: 128, status: 'In review' },
      { id: 4612, title: 'Powai Heights tower 3 occupancy denied; 28 families locked out',   endorsements: 412, status: 'Verified' },
      { id: 4391, title: 'Builder-funded community well demolished without ward NOC',         endorsements: 318, status: 'Verified' },
      { id: 4188, title: 'Possession delayed 44 months on flats sold under PMAY scheme',      endorsements: 588, status: 'Verified' },
      { id: 3902, title: 'Stop-work notice ignored at Hadapsar parcel; work continued at night',endorsements: 142, status: 'Verified' },
    ],
    responses: [
      { at: '21 Jan 2024', label: 'Denied via legal notice (no public statement)', tone: 'danger' },
      { at: '12 Apr 2024', label: 'Press release: "complaints are competitor-driven"', tone: 'danger' },
      { at: '— present',   label: 'No on-record response to RERA findings',         tone: 'default' },
    ],
  },

  // ─── Constituency explorer ──────────────────────────────────────
  states: [
    { code: 'MH', name: 'Maharashtra',     complaints: 14820, leaders: 318, severity: 0.72 },
    { code: 'KA', name: 'Karnataka',       complaints: 11240, leaders: 224, severity: 0.68 },
    { code: 'TN', name: 'Tamil Nadu',      complaints:  9810, leaders: 234, severity: 0.41 },
    { code: 'DL', name: 'Delhi NCT',       complaints:  9024, leaders:  70, severity: 0.81 },
    { code: 'UP', name: 'Uttar Pradesh',   complaints:  8420, leaders: 403, severity: 0.55 },
    { code: 'GJ', name: 'Gujarat',         complaints:  6188, leaders: 182, severity: 0.49 },
    { code: 'WB', name: 'West Bengal',     complaints:  5012, leaders: 294, severity: 0.62 },
    { code: 'KL', name: 'Kerala',          complaints:  4812, leaders: 140, severity: 0.38 },
    { code: 'TS', name: 'Telangana',       complaints:  4218, leaders: 119, severity: 0.51 },
    { code: 'RJ', name: 'Rajasthan',       complaints:  3914, leaders: 200, severity: 0.57 },
  ],

  // Sample constituencies under Maharashtra
  constituenciesMH: [
    { code: 'MH-21', name: 'Mumbai South',       pincode: '400001', complaints: 412, severity: 0.78, mp: 'Anant V. Kulkarni', leaderGrade: 'C+', resolved: 16 },
    { code: 'MH-22', name: 'Mumbai South Central', pincode: '400011', complaints: 388, severity: 0.71, mp: 'P. Naik',           leaderGrade: 'C',  resolved: 21 },
    { code: 'MH-23', name: 'Mumbai North-East',  pincode: '400072', complaints: 511, severity: 0.84, mp: 'S. Pawar',           leaderGrade: 'D',  resolved: 9  },
    { code: 'MH-24', name: 'Mumbai North-West',  pincode: '400053', complaints: 298, severity: 0.62, mp: 'A. Dhuri',           leaderGrade: 'B−', resolved: 38 },
    { code: 'MH-25', name: 'Thane',              pincode: '400601', complaints: 421, severity: 0.69, mp: 'M. Tare',            leaderGrade: 'C−', resolved: 19 },
    { code: 'MH-26', name: 'Pune Cantonment',    pincode: '411001', complaints: 462, severity: 0.41, mp: 'R. Patkar',          leaderGrade: 'A−', resolved: 69 },
    { code: 'MH-27', name: 'Pune Khadakwasla',   pincode: '411041', complaints: 318, severity: 0.55, mp: 'V. Date',            leaderGrade: 'B',  resolved: 42 },
    { code: 'MH-28', name: 'Nagpur East',        pincode: '440008', complaints: 271, severity: 0.59, mp: 'S. Bhole',           leaderGrade: 'C+', resolved: 24 },
  ],

  // ─── AI Chat ───────────────────────────────────────────────────
  aiThread: {
    query: 'Which Maharashtra MP has the worst RTI response record this term?',
    answer:
      'Across the 14 Maharashtra MPs ranked on RTI obstruction complaints since June 2024:\n\n' +
      '• **Anant V. Kulkarni** (Mumbai South) has the longest median RTI response time — **47 days**, against the statutory 30. 142 anchored complaints, 18% acknowledged, 4% resolved.\n\n' +
      '• **K. Sridhar Naidu** (Bengaluru South) is worse on volume (412 RTI complaints, 7% acknowledged) but does not represent Maharashtra.\n\n' +
      'Within Maharashtra, the next closest are P. Naik (Mumbai South-Central, 38 days median) and S. Pawar (Mumbai North-East, 34 days).',
    sources: [
      { id: 4817, title: 'RTI request on tender for Mahul road overlay pending 94 days', endorsements: 18, when: '1 day ago' },
      { id: 4302, title: 'RTI replies arriving with key columns blacked out — Mahim ward', endorsements: 88, when: '1 week ago' },
      { id: 3991, title: 'Mumbai South MP missed PAC oral evidence on RTI implementation', endorsements: 142, when: '3 weeks ago' },
    ],
    suggestions: [
      'Compare Mumbai South vs Pune Cantonment on RTI response time',
      'Show RTI complaints in Mumbai South pincode 400001 in last 30 days',
      'Which Maharashtra ministry has the most unanswered RTIs?',
    ],
  },
  aiHistory: [
    { id: 1, label: 'RTI response — Maharashtra MPs', when: 'Now' },
    { id: 2, label: 'Mahul corridor — pending tenders', when: '2 days ago' },
    { id: 3, label: 'Police FIR refusal pattern · Mumbai', when: '1 week ago' },
    { id: 4, label: 'Builder POIs · Hadapsar', when: '2 weeks ago' },
    { id: 5, label: 'Highest endorsement complaints · KA', when: '3 weeks ago' },
  ],

  // ─── Notifications inbox ───────────────────────────────────────
  notifications: [
    {
      id: 'n1', kind: 'milestone', when: '2m', read: false,
      head: 'Your complaint hit 100 endorsements.',
      sub: 'The Powai station refusal is now on review. AI flagged for community moderator queue.',
      meta: '#4820 · Police misconduct',
    },
    {
      id: 'n2', kind: 'anchor', when: '14m', read: false,
      head: 'Anchored on Polygon · tx 0x4ae…f2c',
      sub: 'Hash and state transition mirrored to chain. Independent verifiers can audit.',
      meta: '#4820',
    },
    {
      id: 'n3', kind: 'area', when: '38m', read: false,
      head: '3 new complaints in Mumbai South',
      sub: 'Infrastructure, Healthcare, RTI obstruction. Highest endorsements: 47.',
      meta: 'Pincode 400001',
    },
    {
      id: 'n4', kind: 'response', when: '2h', read: true,
      head: 'Anant V. Kulkarni\'s office responded',
      sub: 'On complaint #4612 — "Tower 3 occupancy denied". Promise of constituency meeting on 24 May.',
      meta: 'Mumbai South · MP',
    },
    {
      id: 'n5', kind: 'moderation', when: '5h', read: true,
      head: 'Comment removed by Llama Guard',
      sub: 'On your complaint #4820 — flagged for caste language. Author notified, appeal available.',
      meta: 'Auto-moderation',
    },
    {
      id: 'n6', kind: 'consensus', when: '1d', read: true,
      head: 'Critical Issue threshold crossed',
      sub: 'Civil hospital denial (#4819) reached 1,000 endorsements. Escalated to constituency Critical board.',
      meta: 'Pune Cantonment',
    },
    {
      id: 'n7', kind: 'report', when: '2d', read: true,
      head: 'Mumbai South report card updated',
      sub: 'MP grade dropped from B− to C+. Three new "broken" promises this quarter.',
      meta: 'Report card',
    },
  ],

  // ─── Threaded comments ─────────────────────────────────────────
  thread: {
    complaintId: 4820,
    title: 'FIR refused at Powai station for complaint against local builder',
    sort: 'Most endorsed',
    nodes: [
      {
        id: 'c1', handle: 'citizen-L9X3Y7', when: '3h', verified: true, votes: 142,
        body: 'Section 154(3) — you can go directly to the Magistrate under section 156(3) CrPC. Format and the timeline I used last year is here →',
        attachment: { kind: 'PDF', label: 'magistrate-petition-format.pdf', size: '64 KB' },
        children: [
          { id: 'c1a', handle: 'citizen-K4L2M0', when: '2h', verified: true, op: true, votes: 38, body: 'Thank you, downloaded. I\'ll file Monday and post a follow-up complaint on the refusal pattern.' },
          { id: 'c1b', handle: 'citizen-7H2D1S', when: '2h', verified: true, votes: 21, body: 'Worked for me at Vashi station in 2023. Magistrate took 11 days to direct registration.' },
        ],
      },
      {
        id: 'c2', handle: 'citizen-8M2N1Q', when: '4h', verified: true, votes: 98,
        body: 'Same officer refused my FIR in January. Filing a parallel RTI on station refusal counts — the data is going to be ugly.',
        children: [
          { id: 'c2a', handle: 'mod-system', when: '4h', system: true, votes: 0, body: 'Two anonymous citizens have endorsed this pattern claim. Aggregating with #4820, #4391, #3902 in the POI profile for "Powai station — refusal pattern".', },
        ],
      },
      {
        id: 'c3', handle: 'citizen-3J6M0A', when: '5h', verified: true, votes: 64,
        body: 'There is a precedent — Lalita Kumari v. Govt of UP (2013). Registration of FIR is mandatory once cognizable offence is disclosed. Quote it in the magistrate petition.',
      },
      {
        id: 'c4', handle: 'citizen-X7R2W8', when: '6h', verified: true, votes: 18, removed: true,
        body: '[Removed by Llama Guard — caste/communal language. Appeal pending.]',
      },
      {
        id: 'c5', handle: 'citizen-V1Z4Q3', when: '7h', verified: true, votes: 11,
        body: 'Tagging the women-collective group at @collective-mumS — they have a parallel complaint pattern in domestic-violence FIR refusals at the same station.',
      },
    ],
  },
};
