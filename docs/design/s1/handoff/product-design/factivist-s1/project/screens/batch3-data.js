// Factivist — data for moderation queue, under-trial tracker, media capture.
window.fvBatch3 = {

  // ─── AI Moderation queue ──────────────────────────────────────────
  modSummary: {
    inQueue: 218,
    flaggedToday: 47,
    autoCleared: 1842,
    appeals: 12,
    medianReviewMin: 23,
    moderators: 14,
  },

  modQueue: [
    {
      id: 4831, status: 'held',
      title: 'Powai ACP openly threatened protesting students, named officer is…',
      body: 'On 18 May at 2 AM the ACP at Powai station told three women students "agar phir aaye toh dekh lo kya hota hai". The officer named is Inspector R. Bhosle, badge 22184.',
      submittedBy: 'citizen-7K3F4P',
      filedAt: '12 minutes ago',
      category: 'Police Incompetence, Intimidation & Brutality',
      severity: 'Critical',
      confidence: 0.93,
      flags: [
        { model: 'Llama Guard 3', cat: 'Defamation risk',  level: 'high',   note: 'Named officer + verbatim threat. Cross-check with FIR roster.' },
        { model: 'IndicNER',      cat: 'PII detected',     level: 'medium', note: 'Officer badge number is public; complainant handle is anon. OK.' },
        { model: 'Toxicity',      cat: 'Hate / slurs',     level: 'low',    note: '0.18 score · within civic-discourse band.' },
      ],
      suggested: 'human',
    },
    {
      id: 4830, status: 'queued',
      title: 'Sandhurst Road BMC ward office demanding bribes for shop license renewal',
      body: 'BMC ward officer at Sandhurst Road told my uncle openly he needs ₹4000 to renew his cycle shop trade license. Three other shopkeepers said the same.',
      submittedBy: 'citizen-9M2N3Q',
      filedAt: '34 minutes ago',
      category: 'Corruption (Systemic & Everyday)',
      severity: 'High',
      confidence: 0.81,
      flags: [
        { model: 'IndicNER',      cat: 'PII detected',     level: 'low',    note: 'No private citizen named. OK.' },
        { model: 'Llama Guard 3', cat: 'Defamation risk',  level: 'low',    note: 'Ward officer is public role; allegation is generic.' },
      ],
      suggested: 'publish',
    },
    {
      id: 4829, status: 'queued',
      title: 'Mahul refinery flare burning visible from 8km — air quality complaint',
      body: 'Tower 4 flare has been continuous since Saturday 3 AM. AQI on Mahul Road station hit 411 yesterday. Two senior citizens hospitalised in our building alone.',
      submittedBy: 'citizen-K8L4R0',
      filedAt: '1 hour ago',
      category: 'Environmental Issues',
      severity: 'High',
      confidence: 0.96,
      flags: [
        { model: 'IndicNER', cat: 'Location accurate', level: 'low', note: 'AQI station ID validated against CPCB feed.' },
      ],
      suggested: 'publish',
    },
    {
      id: 4828, status: 'queued',
      title: 'Auto union near Dadar station extorting passengers for "festival fund"',
      body: 'Auto stand near Dadar West exit is collecting 50 per passenger above meter "for Ganpati". Refused yesterday and was pushed out of the auto by the driver.',
      submittedBy: 'citizen-5H7J9V',
      filedAt: '2 hours ago',
      category: 'Bad Civic Behaviour',
      severity: 'Medium',
      confidence: 0.74,
      flags: [
        { model: 'Toxicity',      cat: 'Hate / slurs',    level: 'low',    note: '0.09 score.' },
        { model: 'Llama Guard 3', cat: 'Defamation risk', level: 'medium', note: 'Names a specific union — request photo evidence.' },
      ],
      suggested: 'request_evidence',
    },
    {
      id: 4827, status: 'queued',
      title: 'Open dumping behind Vikhroli police line, leachate entering Tansa pipeline',
      body: 'Trucks unload municipal waste behind the police line every Wed/Sat night. Tansa pipeline runs 40m away. Photos and a 14-second video attached.',
      submittedBy: 'citizen-2A5B7C',
      filedAt: '3 hours ago',
      category: 'Environmental Issues',
      severity: 'Critical',
      confidence: 0.97,
      flags: [
        { model: 'Stage-1', cat: 'Auto-cleared', level: 'low', note: 'Geotagged evidence cross-validated. Clean.' },
      ],
      suggested: 'publish',
    },
    {
      id: 4826, status: 'queued',
      title: 'Lok Sabha MP K. Naidu absent from 18 of last 22 sittings',
      body: 'Pulled from the official Lok Sabha attendance feed. The MP has not attended PAC sessions either.',
      submittedBy: 'citizen-T3U2W1',
      filedAt: '4 hours ago',
      category: 'Electoral Malpractice',
      severity: 'Medium',
      confidence: 0.88,
      flags: [
        { model: 'IndicNER', cat: 'Verified facts', level: 'low', note: 'Attendance source matches sansad.in feed.' },
      ],
      suggested: 'publish',
    },
    {
      id: 4825, status: 'auto-rejected',
      title: 'These [slur] politicians from [community] are destroying [city]…',
      body: '[Auto-rejected · Llama Guard 3 hate-speech filter · level 0.94]',
      submittedBy: 'citizen-Q1W2E3',
      filedAt: '5 hours ago',
      category: '—',
      severity: '—',
      confidence: 0.94,
      flags: [
        { model: 'Llama Guard 3', cat: 'Hate / communal',  level: 'critical', note: 'Auto-rejected · community appeal available.' },
      ],
      suggested: 'reject',
    },
  ],

  // Citizen appeal example
  appeal: {
    complaintId: 4825,
    rejectedAt: 'Today, 14:08 IST',
    reasons: [
      { model: 'Llama Guard 3', cat: 'Hate · community-targeted language', score: 0.94, span: '[community]' },
      { model: 'IndicNER',      cat: 'Slur detected',                       score: 0.88, span: '[slur]'      },
    ],
    appealStatus: 'open',
    appealedAt: null,
    canEdit: true,
  },

  // ─── Under-trial prisoner tracker ─────────────────────────────────
  undertrial: {
    id: 'UT-MH-29481',
    aliasHandle: 'detainee-MH-29481',          // anonymised handle
    name: '[Name withheld per platform policy]',
    age: 23, gender: 'M',
    state: 'Maharashtra', prison: 'Arthur Road Central Jail',
    daysHeld: 1247,
    statutoryLimitDays: 365,                   // §436A CrPC half-of-max benchmark for these sections
    arrestedOn: '14 Aug 2022',
    charges: [
      { code: 'IPC 153A', label: 'Promoting enmity between groups',         maxPunishYears: 3 },
      { code: 'IPC 295A', label: 'Outraging religious feelings',            maxPunishYears: 3 },
      { code: 'UAPA §13', label: 'Punishment for unlawful activities',      maxPunishYears: 7 },
    ],
    courtCaseId: 'WP-CRL/1284/2023',
    judge: 'J. M. Pradhan',
    bench: 'Bombay HC · Court 12',
    nextListing: '02 Jun 2026',
    bailHistory: [
      { at: '02 Sep 2022', kind: 'Filed',     outcome: 'Filed in Sessions',                       tone: 'default' },
      { at: '21 Oct 2022', kind: 'Rejected',  outcome: 'Sessions · "gravity of offence"',         tone: 'danger'  },
      { at: '14 Mar 2023', kind: 'Rejected',  outcome: 'Bombay HC · ED objection',                tone: 'danger'  },
      { at: '08 Nov 2023', kind: 'Withdrawn', outcome: 'Withdrawn ahead of HC hearing',            tone: 'warning' },
      { at: '02 Feb 2024', kind: 'Rejected',  outcome: 'HC · investigation incomplete',           tone: 'danger'  },
      { at: '11 Sep 2024', kind: 'Rejected',  outcome: 'HC · chargesheet pending',                tone: 'danger'  },
      { at: '04 Mar 2025', kind: 'Filed',     outcome: 'Supreme Court SLP filed',                 tone: 'default' },
      { at: '18 Oct 2025', kind: 'Rejected',  outcome: 'SLP dismissed · "matter pending below"',  tone: 'danger'  },
      { at: '06 Apr 2026', kind: 'Filed',     outcome: 'HC §436A application · pending',          tone: 'warning' },
    ],
    adjournments: 27,
    hearingsHeld: 14,
    legalAid: {
      counsel: 'CHRI legal aid panel · M. Phadnis',
      assigned: '04 Sep 2022',
      lastVisit: '8 days ago',
    },
    statePeers: {
      total: 38194,
      ratio: 0.78,         // % of MH prison population under-trial
      avgDaysHeld: 412,
      thisCaseRank: 'Top 4% by duration',
    },
    flaggedBy: 87,         // verified citizens watching
    relatedComplaints: 14, // complaints referencing this case
    aggregate: {
      undertrialNationwide: 482000,
      pctOver5Years: 11,
      pctOver10Years: 1.8,
      pctSC_ST_OBC_Muslim: 71,
    },
    similar: [
      { id: 'UT-MH-31022', label: 'Held 2,041 days · UAPA · Bhima Koregaon',  daysHeld: 2041 },
      { id: 'UT-DL-18441', label: 'Held 1,884 days · UAPA · Delhi riots',     daysHeld: 1884 },
      { id: 'UT-MH-28110', label: 'Held 1,521 days · IPC 124A · sedition',    daysHeld: 1521 },
      { id: 'UT-UP-19022', label: 'Held 1,409 days · NSA',                    daysHeld: 1409 },
    ],
  },

  // Aggregate counts for the tracker landing
  undertrialAgg: {
    headline: 482000,                       // ≈4.82L under-trials nationwide
    pctOfPrisoners: 78,
    pctOver5Years: 11,
    pctSCSTOBCMuslim: 71,
    statesWatched: 24,
    casesTracked: 11842,
  },

  // ─── Media capture (audio + video) ────────────────────────────────
  capture: {
    audioWaveform:                          // 64 normalized samples, 0..1
      [0.21,0.34,0.28,0.42,0.55,0.71,0.66,0.58,0.74,0.92,0.81,0.62,0.51,
       0.44,0.38,0.46,0.55,0.68,0.78,0.91,0.85,0.72,0.61,0.49,0.41,0.36,
       0.32,0.41,0.52,0.66,0.74,0.81,0.94,0.88,0.76,0.62,0.51,0.44,0.38,
       0.34,0.42,0.55,0.68,0.79,0.86,0.78,0.65,0.52,0.41,0.36,0.31,0.28,
       0.34,0.45,0.58,0.71,0.81,0.74,0.62,0.51,0.43,0.36,0.31,0.26],

    audioSession: {
      duration: '01:47',
      mb: 1.4,
      transcript:
        '"FIR नहीं लेंगे, यहाँ से जाओ" — पुलिस इंस्पेक्टर बी. कोरगांवकर said this twice on 18 May 2026 at Powai station around 14:30 IST. ' +
        'When I asked for the refusal in writing under Section 154(3), the duty officer asked me to leave or "face counter-FIR".',
      lang: 'hi · auto-detected',
      stripped: ['device-id', 'imei', 'speaker-id-vector', 'background-iot-pings'],
    },

    videoSession: {
      duration: '00:38',
      mb: 5.7,
      stripped: ['gps', 'device-id', 'thumbnail-exif', 'voice-biometric'],
      blurred: ['2 faces (bystanders)', '1 vehicle plate'],
    },

    // Recent captures still pending stripping/upload
    pending: [
      { kind: 'audio', label: 'powai-statn-fir-refusal.m4a',        len: '01:47', mb: 1.4, stripping: false },
      { kind: 'video', label: 'arthur-road-leachate-mahul.mp4',     len: '00:38', mb: 5.7, stripping: false },
      { kind: 'audio', label: 'ward-officer-bribe-sandhurst.m4a',   len: '02:14', mb: 1.9, stripping: true  },
    ],
  },

  // ─── Constituency consensus metrics ───────────────────────────────
  consensus: {
    constituency: 'Mumbai South',
    code: 'MH-21', pin: '400001',
    verifiedCitizens: 12842,                  // total verified in this AC
    monthlyActive:    4172,                   // endorsed at least once this month
    medianEndorseToHundred: { hours: 14, mins: 26 },
    medianResolveDays: 38,
    averageEndorsementsPerCitizen: 6.2,
    noShowRate: 0.18,                         // % of subscribed who never endorse anything
    sybilFlags: 3,                            // suspicious nullifier clusters
    moderationHoldRate: 0.041,                // 4.1% of complaints held
    funnel: [
      { stage: 'Verified',     n: 12842, color: 'var(--color-brand-500)' },
      { stage: 'Active 30d',   n: 4172,  color: 'var(--color-brand-400)' },
      { stage: 'Filed',        n: 318,   color: 'var(--color-brand-300)' },
      { stage: 'Endorsed 10+', n: 2148,  color: 'var(--color-success-500)' },
      { stage: 'Attested',     n: 612,   color: 'var(--color-success-400)' },
    ],
    weeklyEndorseSeries: [
      { week: 'W -7', v: 1820 }, { week: 'W -6', v: 2110 }, { week: 'W -5', v: 1980 },
      { week: 'W -4', v: 2540 }, { week: 'W -3', v: 3120 }, { week: 'W -2', v: 4080 },
      { week: 'W -1', v: 4720 }, { week: 'W 0',  v: 5418 },
    ],
    categoryParticipation: [
      { cat: 'Police misconduct',  pct: 72, n: 1248 },
      { cat: 'Infrastructure',     pct: 64, n: 988  },
      { cat: 'Environmental',       pct: 58, n: 612  },
      { cat: 'Corruption',         pct: 54, n: 488  },
      { cat: 'Healthcare',         pct: 41, n: 312  },
      { cat: 'RTI obstruction',    pct: 36, n: 248  },
    ],
    healthSignals: [
      { label: 'Sybil-cluster review pending', tone: 'warning', detail: '3 nullifier clusters flagged · awaiting ZKP service audit' },
      { label: 'Moderator turnaround on time', tone: 'success', detail: 'Median 18m — under 30m SLA · 14 reviewers active' },
      { label: 'Cross-state endorser bleed',   tone: 'default', detail: '4.2% of endorsements came from outside the constituency — within tolerance' },
    ],
  },

  // ─── Trending / heat map ──────────────────────────────────────────
  trending: {
    windows: ['24h', '7d', '30d', '90d'],
    selectedWindow: '7d',
    sparkSeries: {                            // shared series for the right-rail sparklines (0..1)
      'mh-fir-refusal':  [0.10, 0.12, 0.14, 0.18, 0.32, 0.51, 0.68, 0.81, 1.00],
      'mh-mahul-flare':  [0.04, 0.05, 0.06, 0.08, 0.16, 0.42, 0.74, 0.91, 1.00],
      'dl-school-fees':  [0.50, 0.62, 0.71, 0.74, 0.78, 0.66, 0.59, 0.51, 0.48],
      'tn-water-mafia':  [0.18, 0.22, 0.26, 0.29, 0.34, 0.41, 0.52, 0.66, 0.78],
      'wb-rti-delay':    [0.31, 0.34, 0.38, 0.36, 0.34, 0.32, 0.30, 0.26, 0.22],
      'ka-pension':      [0.12, 0.18, 0.24, 0.32, 0.41, 0.48, 0.54, 0.61, 0.68],
    },
    spiking: [
      { key: 'mh-fir-refusal', title:'FIR refusal at Powai station',         constituency:'Mumbai South',        delta:'+412%', count:1248, when:'last 24h' },
      { key: 'mh-mahul-flare', title:'Mahul refinery flare · AQI 411',      constituency:'Mumbai North-East',   delta:'+318%', count: 842, when:'last 48h' },
      { key: 'tn-water-mafia', title:'Water tanker mafia · Velachery',       constituency:'Chennai South',        delta:'+186%', count: 612, when:'last 5 days' },
      { key: 'ka-pension',     title:'Pension delays · Apr disbursal stuck', constituency:'Bengaluru Central',    delta:'+148%', count: 488, when:'last 7 days' },
    ],
    cooling: [
      { key: 'dl-school-fees', title:'School fee hikes',                     constituency:'Delhi East',           delta:'-32%',  count: 312, when:'last 7 days' },
      { key: 'wb-rti-delay',   title:'RTI reply delay over 90 days',         constituency:'Kolkata Uttar',        delta:'-22%',  count: 412, when:'last 14 days' },
    ],
    // State-level activity scores 0..1 for the choropleth, by window
    statesByWindow: {
      '24h': { MH:1.00, KA:0.42, TN:0.58, DL:0.34, WB:0.18, GJ:0.52, AP:0.36, KL:0.22, RJ:0.28, UP:0.62 },
      '7d':  { MH:0.94, KA:0.55, TN:0.71, DL:0.42, WB:0.31, GJ:0.66, AP:0.44, KL:0.34, RJ:0.40, UP:0.72 },
      '30d': { MH:0.81, KA:0.62, TN:0.66, DL:0.51, WB:0.42, GJ:0.58, AP:0.51, KL:0.41, RJ:0.48, UP:0.78 },
      '90d': { MH:0.74, KA:0.66, TN:0.62, DL:0.55, WB:0.48, GJ:0.52, AP:0.55, KL:0.46, RJ:0.51, UP:0.82 },
    },
    hottestCategoriesByWindow: {
      '7d': [
        { cat:'Police misconduct', n: 4128, delta:'+38%' },
        { cat:'Environmental',     n: 3122, delta:'+62%' },
        { cat:'Infrastructure',    n: 2840, delta:'+12%' },
        { cat:'Corruption',        n: 2218, delta:'+8%'  },
        { cat:'Healthcare',        n: 1620, delta:'-4%'  },
      ],
    },
  },

  // ─── Subscriptions manager ────────────────────────────────────────
  subs: {
    summary: { complaints: 14, leaders: 3, cases: 2, constituencies: 1, accused: 1 },
    quietHours: '22:00 → 07:00 IST',
    digest: 'Daily · 8:00 IST',
    items: [
      // complaints
      { type:'complaint', id:4820, title:'FIR refused at Powai station for complaint against local builder',
        constituency:'Mumbai North-East', updated:'2h ago', triggers:['status','endorse-500','endorse-1000','comments'], push:true, email:false, on:true },
      { type:'complaint', id:4612, title:'Powai Heights tower 3 occupancy denied; 28 families locked out',
        constituency:'Mumbai North-East', updated:'5h ago', triggers:['status','attest'], push:true, email:true, on:true },
      { type:'complaint', id:4302, title:'RTI replies arriving with key columns blacked out — Mahim ward',
        constituency:'Mumbai South', updated:'1d ago', triggers:['status'], push:false, email:true, on:true },
      // leaders
      { type:'leader', id:'mp-mum-south', title:'Anant V. Kulkarni · MP Mumbai South',
        constituency:'Mumbai South', updated:'3h ago', triggers:['attendance','promise-update','asset-decl'], push:true, email:false, on:true },
      { type:'leader', id:'mla-mahim', title:'P. Naik · MLA Mahim',
        constituency:'Mumbai South Central', updated:'2d ago', triggers:['attendance','promise-update'], push:false, email:false, on:false },
      // cases
      { type:'case', id:'WP-CRL/4821/2024', title:'WP-CRL/4821/2024 · Powai FIR refusal',
        constituency:'Mumbai North-East', updated:'4h ago', triggers:['next-listing','order-uploaded','adjournment'], push:true, email:true, on:true },
      // POI
      { type:'poi', id:'poi-pwi-2031', title:'Pravin "Bittu" Rao · Builder · Powai Heights LLP',
        constituency:'Mumbai North-East', updated:'1d ago', triggers:['new-complaint','press-citation'], push:true, email:false, on:true },
      // constituency
      { type:'constituency', id:'mh-21', title:'Mumbai South · 412 complaints',
        constituency:'Mumbai South', updated:'now', triggers:['daily-digest','critical-cross','shame-index'], push:false, email:true, on:true },
    ],
    triggerCatalog: {
      complaint:    ['status','attest','endorse-500','endorse-1000','comments'],
      leader:       ['attendance','promise-update','asset-decl','rti-response'],
      case:         ['next-listing','order-uploaded','adjournment','disposal'],
      poi:          ['new-complaint','press-citation','show-cause-notice'],
      constituency: ['daily-digest','critical-cross','shame-index','new-leader'],
    },
  },

  // ─── Promise tracking — ingest & provenance ───────────────────────
  promiseIngest: {
    leader: 'Anant V. Kulkarni',
    constituency: 'Mumbai South',
    party: 'Independent · 17th Lok Sabha',
    sources: [
      { id:'manifesto-2024', kind:'Manifesto PDF',     label:'Manifesto · Lok Sabha 2024 election', pages:38, ingestedOn:'14 Mar 2024',
        anchor:'0x21ae…f8c1', extractedPromises:17, status:'verified' },
      { id:'rally-mahim-2024', kind:'Rally transcript', label:'Mahim rally · 4 Apr 2024',           pages:6,  ingestedOn:'06 Apr 2024',
        anchor:'0x44a2…1b8d', extractedPromises:3,   status:'verified' },
      { id:'interview-mhk',  kind:'TV interview',       label:'India Ahead · 22 Apr 2024',          pages:0,  ingestedOn:'24 Apr 2024',
        anchor:'0x91cd…7e21', extractedPromises:2,   status:'verified' },
      { id:'social-x-2025',  kind:'X posts',           label:'@anantvk · ingested Q1 2025',         pages:0,  ingestedOn:'02 Apr 2025',
        anchor:'0xab02…4d77', extractedPromises:5,   status:'partial', note:'2 posts disputed by complainant · awaiting review' },
    ],
    samplePromise: {
      id: 1, text: '24×7 water supply for Mahul–Chembur corridor by Mar 2025',
      status: 'broken',
      chain: [
        { kind:'manifesto', ts:'14 Mar 2024', label:'Manifesto · p.14, line 8', detail:'"By March 2025 every Mahul-Chembur ward gets 24×7 metered water."' },
        { kind:'rti',       ts:'12 Aug 2024', label:'RTI 2024/HDP/2188 · BMC Water', detail:'BMC reply: "tender retendered twice, no contractor onboard"' },
        { kind:'parl',      ts:'19 Nov 2024', label:'Lok Sabha · starred Q. 142',    detail:'Minister: "implementation in progress" — no metrics shared' },
        { kind:'press',     ts:'04 Feb 2025', label:'Indian Express · "0 of 14 wards"', detail:'Print + online · ID 0x18ab…fe33' },
        { kind:'citizen',   ts:'14 Apr 2025', label:'5 verified complaints · all 14 wards',   detail:'Endorsed 412×, no anchor response from MP\'s office' },
      ],
    },
    aggregate: {
      promisesParsed: 27,
      verified: 17,
      partial: 6,
      disputed: 2,
      withdrawn: 2,
    },
  },
};

