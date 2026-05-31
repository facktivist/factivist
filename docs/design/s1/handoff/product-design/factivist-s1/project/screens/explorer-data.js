// Factivist — Constituency explorer mock data
// Real ST_NAME / ST_CODE / AC_NO keys from the india-acs topojson.
// Densities are calibrated by hand for top states + deterministic fill for the rest.

(function () {
  const summary = window.fvIndiaStateSummary; // injected by data/india-state-summary.json loader

  // Hand-calibrated state-level density (0..1) + ranked metrics.
  // Pre-delimitation labels — ORISSA, UTTARKHAND, etc. match the topo.
  const tuned = {
    'MAHARASHTRA':       { density:0.95, complaints:14820, severity:0.72, resolved:0.18 },
    'DELHI':             { density:0.92, complaints:9024,  severity:0.81, resolved:0.24 },
    'KARNATAKA':         { density:0.86, complaints:11240, severity:0.68, resolved:0.22 },
    'UTTAR PRADESH':     { density:0.84, complaints:8420,  severity:0.55, resolved:0.16 },
    'TAMIL NADU':        { density:0.78, complaints:9810,  severity:0.41, resolved:0.38 },
    'WEST BENGAL':       { density:0.72, complaints:5012,  severity:0.62, resolved:0.20 },
    'GUJARAT':           { density:0.68, complaints:6188,  severity:0.49, resolved:0.34 },
    'TELANGANA':         { density:0.66, complaints:4218,  severity:0.51, resolved:0.28 },
    'ANDHRA PRADESH':    { density:0.60, complaints:4400,  severity:0.46, resolved:0.32 },
    'KERALA':            { density:0.55, complaints:4812,  severity:0.38, resolved:0.44 },
    'RAJASTHAN':         { density:0.54, complaints:3914,  severity:0.57, resolved:0.22 },
    'BIHAR':             { density:0.62, complaints:4880,  severity:0.66, resolved:0.14 },
    'MADHYA PRADESH':    { density:0.50, complaints:3120,  severity:0.52, resolved:0.20 },
    'PUNJAB':            { density:0.46, complaints:2280,  severity:0.48, resolved:0.30 },
    'HARYANA':           { density:0.48, complaints:2410,  severity:0.50, resolved:0.26 },
    'ORISSA':            { density:0.34, complaints:1820,  severity:0.42, resolved:0.36 },
    'JHARKHAND':         { density:0.40, complaints:1640,  severity:0.55, resolved:0.18 },
    'CHHATTISGARH':      { density:0.36, complaints:1380,  severity:0.48, resolved:0.24 },
    'ASSAM':             { density:0.30, complaints:1240,  severity:0.40, resolved:0.30 },
    'JAMMU & KASHMIR':   { density:0.28, complaints:780,   severity:0.58, resolved:0.20 },
    'UTTARKHAND':        { density:0.26, complaints:640,   severity:0.32, resolved:0.40 },
    'HIMACHAL PRADESH':  { density:0.22, complaints:420,   severity:0.28, resolved:0.46 },
    'GOA':               { density:0.30, complaints:380,   severity:0.34, resolved:0.42 },
    'PUDUCHERRY':        { density:0.24, complaints:210,   severity:0.30, resolved:0.40 },
    'TRIPURA':           { density:0.18, complaints:180,   severity:0.38, resolved:0.32 },
    'MEGHALAYA':         { density:0.14, complaints:120,   severity:0.34, resolved:0.36 },
    'MANIPUR':           { density:0.20, complaints:160,   severity:0.42, resolved:0.28 },
    'MIZORAM':           { density:0.10, complaints:90,    severity:0.24, resolved:0.50 },
    'NAGALAND':          { density:0.14, complaints:110,   severity:0.30, resolved:0.40 },
    'ARUNACHAL PRADESH': { density:0.12, complaints:140,   severity:0.36, resolved:0.34 },
    'SIKKIM':            { density:0.10, complaints:80,    severity:0.22, resolved:0.50 },
  };

  // Deterministic pseudo-random based on string seed
  function seeded(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h = (h ^ (h >>> 16)) >>> 0;
      return h / 4294967296;
    };
  }

  // Build per-state aggregate + per-AC heat keyed by ST_NAME → {density, acHeat: {ac_no: 0..1}}
  // The per-AC heat is generated from the state's density + spatial noise via
  // a seeded RNG so the same map always looks the same. A few "hot spots" get
  // boosted in select states (e.g. Mumbai constituencies in MH).
  window.fvStatesByName = {};

  function fillState(stName) {
    const base = tuned[stName] || { density: 0.10, complaints: 30, severity: 0.20, resolved: 0.40 };
    const acHeat = {};
    const rng = seeded(stName);
    // We don't have the AC list here; the IndiaMap reads .acHeat[acNo] and
    // falls back to .density for unknown ACs. That's good enough — but to
    // make per-AC heat actually exist we generate values for AC 1..400.
    for (let ac = 1; ac <= 400; ac++) {
      const r = rng();
      // Per-AC heat: state density biased by noise, with occasional spikes
      let h = base.density * (0.55 + 0.55 * r);
      // 8% chance of a "hot spot" — sharper peak
      if (rng() < 0.08) h = Math.min(1, base.density + 0.35 * r);
      // 6% chance of "cold spot"
      if (rng() < 0.06) h = Math.max(0.04, base.density - 0.30 * r);
      acHeat[ac] = +h.toFixed(3);
    }
    const bbox = (summary || []).find(s => s.name === stName)?.bbox;
    window.fvStatesByName[stName] = { ...base, acHeat, bbox };
  }

  // Build for all 30 states from the summary; if summary is not yet loaded,
  // build for the tuned ones (works for whole-country view even before fetch).
  const allNames = (summary && summary.map(s => s.name)) || Object.keys(tuned);
  for (const n of allNames) fillState(n);

  // High-profile ACs to feature (hand-picked, by name). We boost their heat
  // so they actually pop on the map when MH is selected.
  const featured = {
    'MAHARASHTRA': [
      { ac:185, name:'Mumbadevi',          density:0.95, complaints:412, severity:0.78, mp:'Anant V. Kulkarni', mla:'F. Sayeed',     grade:'C+', resolved:16 },
      { ac:184, name:'Worli',              density:0.84, complaints:388, severity:0.71, mp:'A. Kulkarni',       mla:'A. Aaditya',    grade:'C',  resolved:21 },
      { ac:166, name:'Powai',              density:0.96, complaints:511, severity:0.84, mp:'S. Pawar',          mla:'M. Lodha',      grade:'D',  resolved:9  },
      { ac:178, name:'Andheri (W)',        density:0.74, complaints:298, severity:0.62, mp:'A. Dhuri',          mla:'A. Parab',      grade:'B-', resolved:38 },
      { ac:144, name:'Thane',              density:0.78, complaints:421, severity:0.69, mp:'M. Tare',           mla:'S. Kelkar',     grade:'C-', resolved:19 },
      { ac:215, name:'Pune Cantonment',    density:0.52, complaints:462, severity:0.41, mp:'R. Patkar',         mla:'M. Tilak',      grade:'A-', resolved:69 },
      { ac:218, name:'Khadakwasla',        density:0.62, complaints:318, severity:0.55, mp:'V. Date',           mla:'B. Tope',       grade:'B',  resolved:42 },
      { ac:54,  name:'Nagpur East',        density:0.68, complaints:271, severity:0.59, mp:'S. Bhole',          mla:'K. Tiwari',     grade:'C+', resolved:24 },
    ],
    'DELHI': [
      { ac:1,  name:'Adarsh Nagar',         density:0.74, complaints:248, severity:0.66, mp:'A. Khurana',       mla:'P. Dhingra',    grade:'C',  resolved:22 },
      { ac:40, name:'New Delhi',            density:0.82, complaints:312, severity:0.68, mp:'B. Tiwari',        mla:'A. Kejriwal',   grade:'B-', resolved:48 },
      { ac:41, name:'Jangpura',             density:0.78, complaints:288, severity:0.62, mp:'B. Tiwari',        mla:'S. Marlena',    grade:'C+', resolved:34 },
      { ac:62, name:'Okhla',                density:0.94, complaints:512, severity:0.84, mp:'O. Abdulla',       mla:'A. Khan',       grade:'D',  resolved:12 },
    ],
    'KARNATAKA': [
      { ac:175, name:'Bommanahalli',        density:0.86, complaints:388, severity:0.62, mp:'L. Krishnamurthy', mla:'S. Rao',        grade:'C',  resolved:28 },
      { ac:174, name:'Mahadevapura',        density:0.92, complaints:514, severity:0.74, mp:'L. Krishnamurthy', mla:'A. Limbavali',  grade:'D',  resolved:14 },
      { ac:152, name:'Shivajinagar',        density:0.74, complaints:294, severity:0.58, mp:'P. Surya',         mla:'R. Khan',       grade:'C+', resolved:30 },
    ],
  };

  // Patch per-AC heat so featured ACs actually pop and the lookup works.
  for (const [st, acs] of Object.entries(featured)) {
    if (!window.fvStatesByName[st]) continue;
    for (const f of acs) {
      window.fvStatesByName[st].acHeat[f.ac] = f.density;
    }
  }

  window.fvFeaturedACs = featured;
})();
