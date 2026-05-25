// Factivist — Judicial case tracking
// Extends fvDataExtra with one tracked case + adjournment timeline + judge
// analytics + related cases. Real Indian court formats; fictional people.

window.fvDataExtra.judicial = {
  case: {
    id:     'WP-CRL/4821/2024',
    court:  'Bombay High Court',
    bench:  'Single Bench · Court 14',
    judge:  'Hon. Justice S. R. Athawale',
    filed:  '12 Apr 2024',
    age:    412,                            // days since filing
    nextDate: '04 Jul 2026',
    nextRelative: 'in 42 days',
    status:   'Adjourned · 11 times',
    statusTone:'danger',
    section:  'Article 226 r/w §156(3) CrPC',
    matter:   'Refusal of FIR registration · Powai station',
    parties:  {
      petitioner: 'citizen-K4L2M0 (anonymised) v.',
      respondent:'The State of Maharashtra · Senior Inspector, Powai Station',
    },
    summary:
      'Petition under Article 226 seeking direction to register an FIR against Pravin Rao (Powai Heights LLP) — refusal of FIR has persisted across 11 hearings. The matter has been adjourned on grounds including police preparedness, leave of counsel, and bench unavailability.',
    citedIn: 4,                              // POIs / leaders linked
    rtiThreads: 2,
    polygonTx: '0x4ae9…f2c3',
  },

  hearings: [
    { at:'04 Jul 2026', tag:'Listed',     court:'Bombay HC · Court 14', label:'Counter-affidavit by State on the question of refusal pattern.', tone:'default' },
    { at:'21 May 2026', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'Bench unavailable. Renotified.', tone:'warning' },
    { at:'02 Apr 2026', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'State sought time to file counter-affidavit. Eleventh adjournment in this matter.', tone:'danger' },
    { at:'10 Feb 2026', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'State counsel on personal leave. Adjourned sine die initially; renotified after objection.', tone:'warning' },
    { at:'18 Nov 2025', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'Police preparedness — investigating officer not present.', tone:'warning' },
    { at:'04 Sep 2025', tag:'Order',      court:'Bombay HC · Court 14', label:'Interim direction to preserve CCTV footage of Powai station from 1–30 Sep 2024.', tone:'success' },
    { at:'06 Aug 2025', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'Counter-affidavit not filed.', tone:'warning' },
    { at:'14 May 2025', tag:'Adjourned',  court:'Bombay HC · Court 14', label:'Petitioner sought time to amend prayer.', tone:'warning' },
    { at:'22 Jan 2025', tag:'Notice',     court:'Bombay HC · Court 14', label:'Notice issued to respondents. Returnable in four weeks.', tone:'success' },
    { at:'08 Nov 2024', tag:'Hearing',    court:'Bombay HC · Court 14', label:'Petition mentioned. Listed for admission.', tone:'default' },
    { at:'12 Apr 2024', tag:'Filed',      court:'Bombay HC e-filing',   label:'Writ petition filed under Article 226 r/w §156(3) CrPC.', tone:'default' },
  ],

  pendency: {
    courtName: 'Bombay HC · Court 14',
    pending:   8412,
    olderThan2y: 1284,
    olderThan5y: 312,
    medianAge: 287,                          // days
    judgeBacklog: 412,
    nationalMedian: 198,
    // Pendency by case type for this bench (% of pending)
    mix: [
      { type:'Criminal writ', pct:34 },
      { type:'Civil writ',    pct:26 },
      { type:'Service',       pct:14 },
      { type:'Tax',           pct:11 },
      { type:'Land',          pct:8  },
      { type:'Other',         pct:7  },
    ],
  },

  judge: {
    name:        'Hon. Justice S. R. Athawale',
    appointed:   '06 Aug 2021',
    cadre:       'Bombay HC · permanent',
    pending:     412,
    disposed:    1180,
    medianDisposal: 312,                     // days
    benchMedian:    198,
    adjournmentRate:0.42,                    // 42% of his hearings adjourned
    benchAdjRate:   0.26,
    spark: [0.30,0.34,0.32,0.36,0.40,0.42,0.44,0.46,0.45,0.48,0.50,0.42],
    notableOrders: [
      { at:'17 Dec 2025', label:'Disposed of WP-CRL/3120/2024 — directed registration of FIR; quoted Lalita Kumari (2013).' },
      { at:'04 Sep 2025', label:'Interim CCTV-preservation order in this matter.' },
      { at:'12 May 2024', label:'Imposed costs on State for repeated counter-affidavit delay (WP-CRL/4012/2023).' },
    ],
  },

  related: [
    { id:'WP-CRL/3120/2024', court:'Bombay HC', label:'Lalita Kumari–style writ on FIR refusal · Vashi station', status:'Disposed', when:'17 Dec 2025' },
    { id:'CC/2491/2024',     court:'Consumer Forum, Pune', label:'10 buyers v. Powai Heights LLP — possession default', status:'In hearing', when:'Next: 18 Jun 2026' },
    { id:'WP/2188/2025',     court:'Bombay HC', label:'RERA freeze challenge — Powai Heights LLP', status:'Reserved', when:'21 Apr 2026' },
    { id:'CRLA/884/2025',    court:'Bombay HC', label:'State appeal against magistrate-directed registration of FIR', status:'Pending', when:'Next: 12 Jul 2026' },
  ],
};
