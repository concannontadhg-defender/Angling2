// loughScoring.js  —  v2 (calibrated against weekend chocolate event on Conn)
// =============================================================================
// Three pure-function modules for the Angler's Tactical Report lough scoring:
//
//   1. computeLakeColourState  – wind-driven discolouration & clearing
//   2. recommendBays           – wind-aware bay selection, with shelter routing
//   3. inferFeedingMode        – temperature-driven feeding stage + mayfly gate
//
// Plus the wrapper:
//
//   applyLoughAdjustments      – runs all three, returns `now` + `forecast`
//                                + an `aiContext` block for the AI verdict prompt
//
// v2 calibration changes (Tadhg, 14 May 2026):
//   - Lower stir threshold (12 kt not 15 kt) — waves >0.5m start at ~12 kt over
//     open water on shallow loughs and that's when bottom resuspension begins.
//   - New 'chocolate' tier above 'soupy' — what the model was calling soupy
//     before was reality's "tinged-to-soupy". Saturday's N wind gusting 60 kph
//     for 36 hours took Conn to genuine chocolate, not soupy.
//   - Decay tracks lengthened — chocolate → soupy 48-72h, soupy → tinged
//     36-48h, tinged → clear 18-24h. Cold water (<10°C) × 1.5. Any rain >1mm/h
//     halts decay entirely (catchment keeps inflow coloured + silt still in
//     suspension).
//   - Mayfly gate explicit — fish stay on the marl until surface temp has
//     held ≥12°C for 3 consecutive days.
//   - Shelter routing — when ALL exposed shores grade ≥soupy, headlands,
//     river mouths and lee narrows are surfaced as the recommended waters
//     rather than just demoting all bays uniformly.
//
// v2.1 (Tadhg, Jun 2026): added substrate (bottom-type) → food → fly layer,
//   crossed with feeding mode to produce high-confidence fly picks.
// =============================================================================


// ---------------------------------------------------------------------------
// LAKE CONFIGS
// ---------------------------------------------------------------------------
// Each bay's `exposureBearing` is the compass bearing (degrees, 0 = N) that
// wind comes FROM to stir that shore. e.g. exposureBearing 0 means a N wind
// stirs this bay (because wind from the north crosses the lough and piles
// waves onto a southern shore).
//
// `shelterArc` is the ± degree tolerance. Wind within (exposureBearing ± arc)
// stirs this bay. Outside that arc, the bay is in lee.
//
// `meanDepthM` and `littoralFraction` control how quickly a bay turns soupy:
// shallow bays with large littoral zones colour fast and clear slow.
//
// `kind`: 'open' (standard windward/leeward dynamics) | 'inflow' (river-mouth,
// stays clean from upstream water during chocolate events) | 'narrows' (channel
// with flushing current) | 'headland-sheltered' (in lee of significant point).
//
// Bay bearings are best-guess from lake geometry — correct from field knowledge.
// ---------------------------------------------------------------------------
const LAKES = {
  // ⚠ BAY BEARINGS NEED FIELD VERIFICATION FROM TADHG ⚠
  // Convention reminder: exposureBearing = direction wind COMES FROM to stir
  // that shore. So:
  //   - South-shore bay (stirred by N wind blowing south onto it) → 0°
  //   - North-shore bay (stirred by S wind) → 180°
  //   - East-shore bay (stirred by W wind blowing east) → 270°
  //   - West-shore bay (stirred by E wind) → 90°
  conn: {
    name: 'Lough Conn',
    surfaceAreaHa: 5760,
    meanDepthM: 12,
    bays: [
      // East shore — stirred by W winds (long fetch across lake from west)
      { name: 'Cloghans Bay',     exposureBearing: 270, shelterArc: 60, meanDepthM: 2.5, littoralFraction: 0.7, kind: 'open' },
      { name: 'Sandy Bay',        exposureBearing: 270, shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.6, kind: 'open' },
      // West shore — stirred by E winds
      { name: 'Massbrook',        exposureBearing: 90,  shelterArc: 60, meanDepthM: 5,   littoralFraction: 0.4, kind: 'open' },
      { name: 'Cornakillew',      exposureBearing: 90,  shelterArc: 60, meanDepthM: 4,   littoralFraction: 0.5, kind: 'open' },
      // North shore (Crossmolina end) — stirred by S winds with full N-S fetch
      { name: 'Brackwansha',      exposureBearing: 180, shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.6, kind: 'open' },
      // South-end shallow bays — stirred by N winds with full N-S fetch (Sat-Sun scenario)
      { name: 'Drummin Bay (S)',  exposureBearing: 0,   shelterArc: 60, meanDepthM: 2,   littoralFraction: 0.8, kind: 'open' },
      { name: 'South End shallows', exposureBearing: 0, shelterArc: 70, meanDepthM: 2.5, littoralFraction: 0.7, kind: 'open' },
      // South narrows / Pontoon channel — current-flushed, deep, resistant to colouring
      { name: 'Pontoon channel',  exposureBearing: 0,   shelterArc: 90, meanDepthM: 8,   littoralFraction: 0.2, kind: 'narrows' },
      // Headland-sheltered bay (sheltered from N quadrant by Pontoon headland)
      { name: 'Victoria Bay',     exposureBearing: 270, shelterArc: 50, meanDepthM: 4,   littoralFraction: 0.4, kind: 'headland-sheltered', shelteredFromBearings: [0, 20, 340, 30] },
      // Inflows — always cleaner than surroundings even when stirred
      { name: 'Deel River mouth', exposureBearing: 90, shelterArc: 60, meanDepthM: 3,    littoralFraction: 0.5, kind: 'inflow' },   // NW corner (Crossmolina river)
      { name: 'Addergoole inflow', exposureBearing: 180, shelterArc: 60, meanDepthM: 3,  littoralFraction: 0.5, kind: 'inflow' },
    ],
  },

  corrib: {
    name: 'Lough Corrib',
    surfaceAreaHa: 17600,
    meanDepthM: 9,
    bays: [
      { name: 'Greenfields',      exposureBearing: 90,  shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.5, kind: 'open' },   // W shore
      { name: 'Maam Bay',         exposureBearing: 270, shelterArc: 60, meanDepthM: 4,   littoralFraction: 0.4, kind: 'open' },   // E shore (Maam Cross side)
      { name: 'Inchiquin shore',  exposureBearing: 0,   shelterArc: 60, meanDepthM: 5,   littoralFraction: 0.4, kind: 'open' },   // S shore
      { name: 'Oughterard area',  exposureBearing: 180, shelterArc: 60, meanDepthM: 4,   littoralFraction: 0.5, kind: 'open' },   // N shore
      { name: 'Cong canal/narrows', exposureBearing: 90, shelterArc: 90, meanDepthM: 6,  littoralFraction: 0.3, kind: 'narrows' },
      { name: 'Cong river mouth', exposureBearing: 90,  shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.5, kind: 'inflow' },
    ],
  },

  sheelin: {
    name: 'Lough Sheelin',
    surfaceAreaHa: 1850,
    meanDepthM: 5,                 // very shallow — colours fast
    bays: [
      { name: 'Goreport',         exposureBearing: 90,  shelterArc: 60, meanDepthM: 2,   littoralFraction: 0.7, kind: 'open' },   // W shore
      { name: 'Crover',           exposureBearing: 270, shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.6, kind: 'open' },   // E shore
      { name: 'Chambers Bay',     exposureBearing: 0,   shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.6, kind: 'open' },   // S shore
      { name: 'Stoney Island',    exposureBearing: 180, shelterArc: 90, meanDepthM: 4,   littoralFraction: 0.4, kind: 'headland-sheltered', shelteredFromBearings: [0, 20, 340] },
      { name: 'Inny inflow',      exposureBearing: 90,  shelterArc: 60, meanDepthM: 2.5, littoralFraction: 0.6, kind: 'inflow' },
    ],
  },

  melvin: {
    name: 'Lough Melvin',
    surfaceAreaHa: 2150,
    meanDepthM: 8,
    bays: [
      { name: 'Garrison Bay',     exposureBearing: 90,  shelterArc: 60, meanDepthM: 3,   littoralFraction: 0.5, kind: 'open' },   // W shore
      { name: 'Rossinver Bay',    exposureBearing: 270, shelterArc: 60, meanDepthM: 4,   littoralFraction: 0.5, kind: 'open' },   // E shore
      { name: 'Kinlough end',     exposureBearing: 270, shelterArc: 90, meanDepthM: 5,   littoralFraction: 0.4, kind: 'narrows' },
    ],
  },
};


// ---------------------------------------------------------------------------
// SUBSTRATE → FOOD → FLY
// ---------------------------------------------------------------------------
// Bottom type = what food is physically present, independent of feeding mode
// (which is temperature/season driven). Cross the two: where the season says
// "fish are on X stage" AND the bottom says "X's food is actually here", that's
// the high-confidence pick.
// Keys: 'marl' | 'stony' | 'silt' | 'weed' | 'sand' | 'gravel'. Multiple allowed.
const SUBSTRATE_FLIES = {
  marl:   { food: 'mayfly nymph, shrimp, snail',   flies: ['Mayfly Nymph','Green Drake','Spent Gnat','Golden Olive Bumble','Gosling'] },
  stony:  { food: 'caddis, snail, stonefly',       flies: ['Green Peter','Murrough','Sedge','Bibio','Silver Invicta'] },
  silt:   { food: 'chironomid, bloodworm',         flies: ['Black Buzzer','Olive Buzzer','Diawl Bach','Black Pennell'] },
  weed:   { food: 'shrimp, corixa, damsel, snail', flies: ['Shrimp','Corixa','Damsel Nymph','Soldier Palmer'] },
  sand:   { food: 'sparse',                        flies: [] },
  gravel: { food: 'caddis, upwing nymph',          flies: ['Sedge','Silver Invicta','Sooty Olive'] },
};

// ⚠ SUBSTRATE NEEDS FIELD VERIFICATION FROM TADHG ⚠ — placeholders, correct from
// your own knowledge of each bay's bottom.
const BAY_SUBSTRATE = {
  conn: {
    'Cloghans Bay': ['marl','weed'], 'Sandy Bay': ['sand','marl'],
    'Massbrook': ['stony'], 'Cornakillew': ['stony','marl'],
    'Brackwansha': ['marl','weed'], 'Drummin Bay (S)': ['marl','weed'],
    'South End shallows': ['marl','weed'], 'Pontoon channel': ['stony'],
    'Victoria Bay': ['marl'], 'Deel River mouth': ['gravel','silt'],
    'Addergoole inflow': ['gravel','marl'],
  },
  corrib: {
    'Greenfields': ['marl','weed'], 'Maam Bay': ['stony'],
    'Inchiquin shore': ['stony','marl'], 'Oughterard area': ['marl','weed'],
    'Cong canal/narrows': ['stony'], 'Cong river mouth': ['gravel'],
  },
  sheelin: {
    'Goreport': ['marl','weed'], 'Crover': ['marl','silt'],
    'Chambers Bay': ['weed','marl'], 'Stoney Island': ['stony'],
    'Inny inflow': ['gravel','silt'],
  },
  melvin: {
    'Garrison Bay': ['stony','gravel'], 'Rossinver Bay': ['stony','marl'],
    'Kinlough end': ['stony','sand'],
  },
};

function getBaySubstrate(lakeKey, bayName) {
  const s = BAY_SUBSTRATE[lakeKey]?.[bayName];
  return Array.isArray(s) ? s : (s ? [s] : []);
}

// Cross feeding-mode flies with substrate flies.
function combineFliesWithSubstrate(feedingFlies, lakeKey, bayName) {
  const substrates = getBaySubstrate(lakeKey, bayName);
  const substrateFlies = [], foodPresent = [];
  for (const s of substrates) {
    const entry = SUBSTRATE_FLIES[s];
    if (!entry) continue;
    foodPresent.push(entry.food);
    for (const f of entry.flies) if (!substrateFlies.includes(f)) substrateFlies.push(f);
  }
  const norm = x => x.toLowerCase().replace(/[^a-z]/g, '');
  const feedNorm = feedingFlies.map(norm);
  const confidentPicks = substrateFlies.filter(f => {
    const sf = norm(f);
    return feedNorm.some(ff => ff.includes(sf) || sf.includes(ff));
  });
  return { substrates, substrateFlies, foodPresent, confidentPicks };
}


// ---------------------------------------------------------------------------
// COLOUR STATE THRESHOLDS  (kt-hours over 12 kt, rolling 36h)
// ---------------------------------------------------------------------------
// Calibrated against Saturday-Sunday Conn event:
//   ~36h sustained 22-28 kt, gusts to 32 kt (60 kph) → reality went chocolate.
// Linear stir model: sum of (speedKt - 12) for each hour where speedKt > 12.
const STIR_THRESHOLDS = {
  clear:      0,    // below 100
  faintlyTinged: 100,
  tinged:    200,
  soupy:     350,
  chocolate: 500,
};

// Per-bay depth/littoral multipliers on stir energy:
//   Shallow (<3m) bays colour faster than deep ones for the same wind.
//   We multiply effective stir by this factor before bucketing.
function bayDepthMultiplier(bay) {
  // 1.5x for very shallow (2m), 1.0x for 4m, 0.7x for 6m+
  return Math.max(0.6, Math.min(1.8, 4.0 / Math.max(2, bay.meanDepthM)));
}

// Decay times by current tier — hours to drop one tier in calm, dry, >10°C water:
const DECAY_HOURS = {
  chocolate: 60,   // 48-72h to soupy
  soupy:     42,   // 36-48h to tinged
  tinged:    21,   // 18-24h to clear (via faintlyTinged)
  faintlyTinged: 12,
};


// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function circularBearingDifference(a, b) {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff; // 0..180
}

function isWindStirringBay(bay, windDirDeg) {
  if (!Number.isFinite(windDirDeg)) return false;
  // Headland-sheltered bays: check the explicit shelter list first
  if (bay.kind === 'headland-sheltered' && Array.isArray(bay.shelteredFromBearings)) {
    const sheltered = bay.shelteredFromBearings.some(
      b => circularBearingDifference(b, windDirDeg) <= 30
    );
    if (sheltered) return false;
  }
  return circularBearingDifference(bay.exposureBearing, windDirDeg) <= bay.shelterArc;
}

function bucketStir(stirKtH) {
  if (stirKtH >= STIR_THRESHOLDS.chocolate) return 'chocolate';
  if (stirKtH >= STIR_THRESHOLDS.soupy) return 'soupy';
  if (stirKtH >= STIR_THRESHOLDS.tinged) return 'tinged';
  if (stirKtH >= STIR_THRESHOLDS.faintlyTinged) return 'faintlyTinged';
  return 'clear';
}

const COLOUR_RANK = { clear: 0, faintlyTinged: 1, tinged: 2, soupy: 3, chocolate: 4 };
const COLOUR_LABEL = {
  clear: 'clear',
  faintlyTinged: 'faintly tinged',
  tinged: 'tinged',
  soupy: 'soupy',
  chocolate: 'chocolate brown',
};


// ---------------------------------------------------------------------------
// 1. computeLakeColourState
// ---------------------------------------------------------------------------
// Inputs:
//   lakeKey            — 'conn' | 'corrib' | 'sheelin' | 'melvin'
//   windHistory        — [{ timestamp, speedKt, directionDeg }]  (last 36h+)
//   rainHistoryMm      — total mm over last 24h (scalar)
//   rainHistoryHourly  — optional [{hoursAgo, mm}] for finer decay calc
//   surfaceTempC       — current surface temperature in °C
//
// Output:
//   {
//     lakeKey, lake, stirEnergyKtH, dominantWindDirDeg,
//     perBayColour: { 'Cloghans Bay': 'chocolate', ... },
//     perBayStir:   { 'Cloghans Bay': 612, ... },
//     overallColourState: 'soupy',
//     hoursToClear: { tinged: 30, clear: 50 },
//     diagnostic: 'string'
//   }
function computeLakeColourState({
  lakeKey,
  windHistory = [],
  rainHistoryMm = 0,
  surfaceTempC = 12,
}) {
  const lake = LAKES[lakeKey];
  if (!lake) throw new Error(`Unknown lake: ${lakeKey}`);

  // Sum stir energy and dominant direction from last 36h
  const cutoff = Date.now() - 36 * 3600 * 1000;
  let totalStir = 0;
  let dirSumX = 0, dirSumY = 0, weight = 0;

  for (const w of windHistory) {
    const t = new Date(w.timestamp).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;
    if (w.speedKt > 12) {
      const contribution = w.speedKt - 12;
      totalStir += contribution;
      // Vector-average wind direction, weighted by stir contribution
      const rad = (w.directionDeg * Math.PI) / 180;
      dirSumX += Math.cos(rad) * contribution;
      dirSumY += Math.sin(rad) * contribution;
      weight += contribution;
    }
  }

  const dominantDir = weight > 0
    ? ((Math.atan2(dirSumY, dirSumX) * 180) / Math.PI + 360) % 360
    : null;

  // Per-bay colour
  const perBayColour = {};
  const perBayStir = {};
  for (const bay of lake.bays) {
    let effectiveStir = 0;
    if (isWindStirringBay(bay, dominantDir)) {
      effectiveStir = totalStir * bayDepthMultiplier(bay);
      // Inflow bays resist colouring — clean water is always coming in
      if (bay.kind === 'inflow') effectiveStir *= 0.4;
      // Narrows get flushed — slightly resistant
      if (bay.kind === 'narrows') effectiveStir *= 0.7;
    } else {
      // Lee shore — minimal stir, just from wind chop directly on water
      effectiveStir = Math.min(60, totalStir * 0.1);
      if (bay.kind === 'inflow') effectiveStir *= 0.3;
    }
    perBayStir[bay.name] = Math.round(effectiveStir);
    perBayColour[bay.name] = bucketStir(effectiveStir);
  }

  // Overall lake state = worst bay (most pessimistic view for the planner)
  const overallColourState = Object.values(perBayColour).reduce((worst, c) =>
    COLOUR_RANK[c] > COLOUR_RANK[worst] ? c : worst, 'clear');

  // Clearing time from current overall state, factoring rain + temperature
  const tempMultiplier = surfaceTempC < 10 ? 1.5 : 1.0;
  const rainHaltActive = rainHistoryMm > 1;  // any meaningful rain stalls decay
  // Sum decay path from current tier down to clear
  const tiers = ['chocolate', 'soupy', 'tinged', 'faintlyTinged'];
  let hoursToTinged = 0, hoursToClear = 0;
  let started = false;
  for (const tier of tiers) {
    if (tier === overallColourState) started = true;
    if (started) {
      const base = DECAY_HOURS[tier] * tempMultiplier;
      hoursToClear += base;
      if (tier === 'chocolate' || tier === 'soupy') hoursToTinged += base;
    }
  }
  // If rain is currently halting decay, add a buffer (assume rain persists ~12h)
  if (rainHaltActive) {
    hoursToClear += 12;
    hoursToTinged += 12;
  }

  const diagnostic =
    `${lake.name}: ${COLOUR_LABEL[overallColourState]}. ` +
    `Stir ${Math.round(totalStir)} kt-h over 36h, ` +
    `${weight > 0 ? `dominant wind ${Math.round(dominantDir)}°` : 'no significant wind'}, ` +
    `${rainHistoryMm.toFixed(1)}mm rain, surface ${surfaceTempC.toFixed(1)}°C. ` +
    `Est. clearing to fishable: ${Math.round(hoursToTinged)}h.`;

  return {
    lakeKey,
    lake: lake.name,
    stirEnergyKtH: Math.round(totalStir),
    dominantWindDirDeg: dominantDir == null ? null : Math.round(dominantDir),
    perBayColour,
    perBayStir,
    overallColourState,
    hoursToClear: {
      tinged: Math.round(hoursToTinged),
      clear: Math.round(hoursToClear),
    },
    diagnostic,
  };
}


// ---------------------------------------------------------------------------
// 2. recommendBays
// ---------------------------------------------------------------------------
// Standard rule: fish the windward shore (food piled into the margins).
// Override: if all exposed shores are ≥soupy, flip to shelter mode and
// rank inflows, narrows, and headland-sheltered bays at the top.
//
// Bay score 0-100 starts at:
//   60 (lee shore, no advantage)
//   80 (windward shore, clear water — classic conditions)
//   30 (windward shore, soupy water — fish driven out)
//    0 (chocolate water — unfishable from this bay)
//   85 (inflow during chocolate event — clean lane through brown water)
//   75 (narrows during chocolate event — current flushing)
//   80 (headland-sheltered during chocolate event)
function recommendBays({
  lakeKey,
  perBayColour,
  perBayStir,
  currentWindDirDeg,
  feedingMode,
}) {
  const lake = LAKES[lakeKey];
  const allExposedSoupy = lake.bays
    .filter(b => b.kind === 'open' && isWindStirringBay(b, currentWindDirDeg))
    .every(b => {
      const c = perBayColour[b.name];
      return c === 'soupy' || c === 'chocolate';
    });

  const bayScores = lake.bays.map(bay => {
    const colour = perBayColour[bay.name];
    const stirring = isWindStirringBay(bay, currentWindDirDeg);
    let score = 60;
    let reason = '';

    if (colour === 'chocolate') {
      score = bay.kind === 'inflow' ? 75 : 0;
      reason = bay.kind === 'inflow'
        ? 'Inflow holds a clean lane through chocolate water'
        : 'Chocolate brown — unfishable';
    } else if (colour === 'soupy') {
      if (bay.kind === 'inflow') { score = 80; reason = 'Inflow lane stays clean in soupy water'; }
      else if (bay.kind === 'narrows') { score = 70; reason = 'Narrows flush colour through'; }
      else if (bay.kind === 'headland-sheltered') { score = 75; reason = 'Headland-sheltered, water still readable'; }
      else { score = 25; reason = 'Soupy — fish pushed out of margins'; }
    } else if (colour === 'tinged') {
      if (stirring) { score = 75; reason = 'Windward shore, water tinged — food in the chop, classic conditions'; }
      else { score = 55; reason = 'Lee shore, tinged — second-choice water'; }
    } else if (colour === 'faintlyTinged') {
      if (stirring) { score = 80; reason = 'Windward shore, just a tinge — prime water'; }
      else { score = 60; reason = 'Lee shore, faintly tinged'; }
    } else { // clear
      if (stirring) { score = 80; reason = 'Windward shore, clear water — classic'; }
      else if (bay.kind === 'inflow') { score = 70; reason = 'Clean inflow water, may hold fish near current edge'; }
      else if (bay.kind === 'headland-sheltered') { score = 65; reason = 'Sheltered bay, clear water'; }
      else { score = 55; reason = 'Lee shore, no wind advantage'; }
    }

    // Shelter mode boost — if all windward bays are unfishable, escalate alternatives
    if (allExposedSoupy && (bay.kind === 'inflow' || bay.kind === 'narrows' || bay.kind === 'headland-sheltered')) {
      score = Math.max(score, 75);
      reason = `(shelter mode) ${reason}`;
    }

    // Mayfly emergence — boost shallow marl bays during the duns window
    if ((feedingMode === 'mayfly-emergence' || feedingMode === 'mayfly-peak') &&
        bay.meanDepthM < 4 && colour !== 'soupy' && colour !== 'chocolate') {
      score = Math.min(95, score + 10);
      reason += ' · Shallow marl, mayfly water';
    }
    // Spent gnat — same shallow bays but evening tactic
    if (feedingMode === 'spent-gnat' && bay.meanDepthM < 4 && colour !== 'chocolate') {
      score = Math.min(95, score + 8);
      reason += ' · Spent gnat shallows';
    }

    return { bay: bay.name, kind: bay.kind, score, reason, colour: COLOUR_LABEL[colour], stir: perBayStir[bay.name] };
  });

  bayScores.sort((a, b) => b.score - a.score);

  const top = bayScores[0];
  const headline = top.score === 0
    ? 'No fishable water — all shores chocolate. Wait for clearing.'
    : `Best bay: ${top.bay} (${top.score}/100) — ${top.reason}`;

  return {
    headline,
    shelterMode: allExposedSoupy,
    ranking: bayScores,
  };
}


// ---------------------------------------------------------------------------
// 3. inferFeedingMode
// ---------------------------------------------------------------------------
// Six stages, plus an explicit mayfly gate. The trout don't read the calendar;
// they read the temperature. Mayfly emergence requires sustained surface temp
// ≥12°C for 3 consecutive days — until that's met, score is capped on
// surface-game expectations and the recommended tactics stay sub-surface.
//
// Stages:
//   cold-bottom        — <8°C    — hoglice, snails, chironomid pupae, fish on marl
//   buzzers            — 8-10°C  — buzzers active, lake olives starting
//   olives             — 10-12°C — strong olives, first mayfly nymphs stirring
//   mayfly-emergence   — ≥12°C for 3 days, first 10 days after trigger
//   mayfly-peak        — ≥12°C for 3 days, days 11-21 after trigger
//   spent-gnat         — ≥14°C, evening dapping window
//   post-mayfly        — >17°C — sedge, dawn/dusk only
function inferFeedingMode({ surfaceTempC, surfaceTempHistoryC = [], mayflyTriggerDay = null, dayOfYear }) {
  // mayflyReadiness: 0 = not yet, 1 = fully triggered and progressing
  let mayflyReadiness = 0;
  let daysSinceTrigger = null;

  // Count consecutive days at end of history with temp ≥12°C
  let consecutive = 0;
  for (let i = surfaceTempHistoryC.length - 1; i >= 0; i--) {
    if (surfaceTempHistoryC[i] >= 12) consecutive++;
    else break;
  }
  mayflyReadiness = Math.min(1, consecutive / 3);

  // If trigger explicitly passed, use it (more accurate than estimating from history)
  if (mayflyTriggerDay != null && dayOfYear != null) {
    daysSinceTrigger = dayOfYear - mayflyTriggerDay;
    mayflyReadiness = daysSinceTrigger >= 0 ? 1 : 0;
  } else if (consecutive >= 3) {
    daysSinceTrigger = consecutive - 3; // day of post-trigger phase
  }

  let mode, label, depth, retrieve, recommendedFlies;

  if (surfaceTempC < 8) {
    mode = 'cold-bottom';
    label = `Cold-bottom (${surfaceTempC.toFixed(1)}°C) — fish on the marl, no surface interest`;
    depth = 'bottom';
    retrieve = 'very slow figure-of-eight, long pauses';
    recommendedFlies = ['Hoglouse', 'Black Buzzer (deep)', 'Olive Nymph weighted', 'Snail (point)'];
  } else if (surfaceTempC < 10) {
    mode = 'buzzers';
    label = `Buzzer (${surfaceTempC.toFixed(1)}°C) — fish lifting in column, watch for head-and-tail rises`;
    depth = 'sub-surface to mid';
    retrieve = 'slow figure-of-eight, occasional twitches';
    recommendedFlies = ['Black Buzzer', 'Olive Buzzer', 'Cove Pheasant Tail', 'Diawl Bach'];
  } else if (surfaceTempC < 12 || mayflyReadiness < 1) {
    mode = 'olives';
    label = `Olive (${surfaceTempC.toFixed(1)}°C) — lake olives strong, mayfly nymphs stirring but not yet hatching`;
    depth = 'sub-surface to mid';
    retrieve = 'slow with figure-of-eight, lift on hang';
    recommendedFlies = ['Sooty Olive', 'Olive Bumble', 'Connemara Black', 'Bibio'];
    if (consecutive >= 1) label += ` (${consecutive}/3 days at threshold, mayfly building)`;
  } else if (daysSinceTrigger != null && daysSinceTrigger < 10) {
    mode = 'mayfly-emergence';
    label = `Mayfly emergence (day ${daysSinceTrigger + 1}, ${surfaceTempC.toFixed(1)}°C) — first duns hatching, fish learning to look up`;
    depth = 'sub-surface to surface';
    retrieve = 'static or very slow on duns; nymph on dropper';
    recommendedFlies = ['Mayfly Nymph (point)', 'Green Drake', 'Grey Wulff', 'Shadow Mayfly'];
  } else if (daysSinceTrigger != null && daysSinceTrigger < 21) {
    mode = 'mayfly-peak';
    label = `Mayfly peak (day ${daysSinceTrigger + 1}, ${surfaceTempC.toFixed(1)}°C) — full hatch, dapping window open`;
    depth = 'surface';
    retrieve = 'natural drift, dap if wind suits';
    recommendedFlies = ['Green Drake', 'Grey Wulff', 'Shadow Mayfly', 'Mayfly Emerger', 'Live mayfly for dapping'];
  } else if (surfaceTempC >= 14 && surfaceTempC < 17) {
    mode = 'spent-gnat';
    label = `Spent gnat (${surfaceTempC.toFixed(1)}°C) — evening falls, large trout looking up at last light`;
    depth = 'surface (film)';
    retrieve = 'dead drift, no movement';
    recommendedFlies = ['Spent Gnat', 'Cock Spent', 'Black Spent', 'Mohican Mayfly'];
  } else {
    mode = 'post-mayfly';
    label = `Post-mayfly (${surfaceTempC.toFixed(1)}°C) — sedge and terrestrials, dawn/dusk only`;
    depth = 'surface to mid (evening), bottom (midday)';
    retrieve = 'natural drift or short twitches for sedge';
    recommendedFlies = ['Murrough', 'Sedge (size 10-12)', 'Daddy Long Legs', 'Hopper'];
  }

  return {
    mode,
    label,
    depth,
    retrieve,
    recommendedFlies,
    mayflyReadiness,
    daysSinceTrigger,
    consecutiveDaysAtThreshold: consecutive,
  };
}


// ---------------------------------------------------------------------------
// 4. applyLoughAdjustments  —  wrapper
// ---------------------------------------------------------------------------
// Combines the three modules into a single result with `now` and `forecast`
// sections, plus an `aiContext` block ready to splice into the AI verdict
// prompt.
//
// Inputs:
//   baseScore           — number 0-10 from existing scoring engine
//   inputs = {
//     lakeKey, windHistory, rainHistoryMm, surfaceTempC,
//     surfaceTempHistoryC, currentWindDirDeg, currentWindKt,
//     dayOfYear, mayflyTriggerDay,
//     windForecast      — optional [{ hoursFromNow, speedKt, directionDeg }]
//     rainForecastMm    — optional scalar (total over next 24h) or hourly array
//   }
function applyLoughAdjustments(baseScore, inputs) {
  const colour = computeLakeColourState(inputs);
  const feeding = inferFeedingMode(inputs);
  const bays = recommendBays({
    lakeKey: inputs.lakeKey,
    perBayColour: colour.perBayColour,
    perBayStir: colour.perBayStir,
    currentWindDirDeg: inputs.currentWindDirDeg,
    feedingMode: feeding.mode,
  });

  // Substrate × feeding-mode fly cross for the recommended top bay
  const topBayName = bays.ranking[0].bay;
  const substrateMatch = combineFliesWithSubstrate(feeding.recommendedFlies, inputs.lakeKey, topBayName);

  // Score adjustment — multiplicative penalties
  let multiplier = 1.0;
  if (colour.overallColourState === 'chocolate') multiplier *= 0.25;
  else if (colour.overallColourState === 'soupy') multiplier *= 0.55;
  else if (colour.overallColourState === 'tinged') multiplier *= 0.85;
  else if (colour.overallColourState === 'faintlyTinged') multiplier *= 0.95;

  // Mayfly transition penalty if score assumed mayfly but lake hasn't triggered
  if (feeding.mayflyReadiness < 1 && inputs.assumedMayfly) {
    multiplier *= 0.6 + 0.4 * feeding.mayflyReadiness;
  }

  // Shelter mode boost — even when all open shores are soupy, the planner
  // surfaces good alternates. Recoup some of the penalty IF there's a viable
  // shelter bay. But don't let chocolate lake feel like a normal day.
  if (bays.shelterMode && bays.ranking[0].score >= 70) {
    const shelterFloor = colour.overallColourState === 'chocolate' ? 0.45 : 0.65;
    multiplier = Math.max(multiplier, shelterFloor);
  }

  const adjustedScore = Math.max(0, Math.min(10, baseScore * multiplier));

  // Forecast: project the lake state forward using windForecast / rainForecast
  const forecast = computeForecast({
    lakeKey: inputs.lakeKey,
    initialColour: colour,
    initialFeeding: feeding,
    surfaceTempC: inputs.surfaceTempC,
    windForecast: inputs.windForecast,
    rainForecastMm: inputs.rainForecastMm,
    currentWindDirDeg: inputs.currentWindDirDeg,
    currentWindKt: inputs.currentWindKt,
  });

  // AI context block — feeds into the Anthropic verdict prompt
  const aiContext = [
    `LAKE STATE — ${colour.lake}`,
    colour.diagnostic,
    `Best bay: ${bays.ranking[0].bay} (${bays.ranking[0].score}/100, ${bays.ranking[0].colour}) — ${bays.ranking[0].reason}`,
    bays.shelterMode ? '⚠ SHELTER MODE: all windward shores ≥soupy, fish inflows / narrows / sheltered bays only.' : '',
    `Feeding mode: ${feeding.label}`,
    `Recommended depth: ${feeding.depth} · Retrieve: ${feeding.retrieve}`,
    `Flies: ${feeding.recommendedFlies.join(', ')}`,
    substrateMatch.substrates.length
      ? `Bottom at ${topBayName}: ${substrateMatch.substrates.join('/')} (${substrateMatch.foodPresent.join('; ')}).` : '',
    substrateMatch.confidentPicks.length
      ? `High-confidence flies (season × bottom agree): ${substrateMatch.confidentPicks.join(', ')}.`
      : (substrateMatch.substrateFlies.length ? `Bottom suggests: ${substrateMatch.substrateFlies.join(', ')}.` : ''),
    feeding.mayflyReadiness < 1 ? `Mayfly NOT yet triggered (${feeding.consecutiveDaysAtThreshold}/3 days at ≥12°C). Stay sub-surface.` : '',
    forecast.narrative ? `Forecast: ${forecast.narrative}` : '',
  ].filter(Boolean).join('\n');

  return {
    baseScore,
    adjustedScore: Math.round(adjustedScore * 10) / 10,
    multiplier: Math.round(multiplier * 100) / 100,
    now: {
      colour,
      feeding,
      bays,
      substrate: substrateMatch,
      headline: bays.headline,
    },
    forecast,
    aiContext,
  };
}


// ---------------------------------------------------------------------------
// FORECAST  —  project colour state through next 72h
// ---------------------------------------------------------------------------
// Given a wind forecast (hourly or sparse), project per-bay colour at +6, +12,
// +24, +36, +48, +72h. Identifies the "switch point" — the hour at which
// windward shores come back into play as conditions ease.
function computeForecast({
  lakeKey,
  initialColour,
  initialFeeding,
  surfaceTempC,
  windForecast,
  rainForecastMm,
  currentWindDirDeg,
  currentWindKt,
}) {
  const lake = LAKES[lakeKey];
  const checkpoints = [6, 12, 24, 36, 48, 72];

  // Default forecast: current wind persists 6h, decays linearly over 12h, calm after
  const effectiveForecast = windForecast && windForecast.length > 0
    ? [...windForecast].sort((a, b) => a.hoursFromNow - b.hoursFromNow)
    : [
        { hoursFromNow: 0,  speedKt: currentWindKt || 0, directionDeg: currentWindDirDeg || 0 },
        { hoursFromNow: 6,  speedKt: (currentWindKt || 0) * 0.7, directionDeg: currentWindDirDeg || 0 },
        { hoursFromNow: 18, speedKt: 5, directionDeg: currentWindDirDeg || 0 },
        { hoursFromNow: 36, speedKt: 5, directionDeg: 200 },
      ];

  // Interpolate to hourly resolution for stir accumulation
  // Outside the forecast window, clamp to the last known sample (don't extrapolate)
  function windAt(h) {
    if (h <= effectiveForecast[0].hoursFromNow) return effectiveForecast[0];
    if (h >= effectiveForecast[effectiveForecast.length - 1].hoursFromNow) {
      return effectiveForecast[effectiveForecast.length - 1];
    }
    let prev = effectiveForecast[0], next = effectiveForecast[0];
    for (const w of effectiveForecast) {
      if (w.hoursFromNow <= h) prev = w;
      if (w.hoursFromNow >= h) { next = w; break; }
    }
    if (prev === next || next.hoursFromNow === prev.hoursFromNow) return prev;
    const f = (h - prev.hoursFromNow) / (next.hoursFromNow - prev.hoursFromNow);
    // Direction interpolation needs care to handle 0/360 wrap correctly
    const dirDelta = ((next.directionDeg - prev.directionDeg + 540) % 360) - 180;
    const interpDir = ((prev.directionDeg + dirDelta * f) % 360 + 360) % 360;
    return {
      hoursFromNow: h,
      speedKt: Math.max(0, prev.speedKt + (next.speedKt - prev.speedKt) * f),
      directionDeg: interpDir,
    };
  }

  // Project per-bay stir forward, applying decay from current state
  const timeline = [];
  const tempMultiplier = surfaceTempC < 10 ? 1.5 : 1.0;
  const rainHaltHours = Math.min(24, (rainForecastMm || 0));

  for (const h of checkpoints) {
    // Add stir from forecast wind over the last 36h window (sliding)
    // For simplicity, sum forecast stir from hour (h-36) to h, including
    // existing 36h history scaled by how much remains in window
    let newStir = 0;
    let dirSumX = 0, dirSumY = 0, weight = 0;
    for (let ph = Math.max(0, h - 36); ph < h; ph++) {
      const w = windAt(ph);
      if (w.speedKt > 12) {
        const contribution = w.speedKt - 12;
        newStir += contribution;
        const rad = (w.directionDeg * Math.PI) / 180;
        dirSumX += Math.cos(rad) * contribution;
        dirSumY += Math.sin(rad) * contribution;
        weight += contribution;
      }
    }
    // Plus residual stir from existing history, decayed
    const decayFactor = h < rainHaltHours ? 1.0 : Math.max(0, 1 - h / (60 * tempMultiplier));
    const residualStir = initialColour.stirEnergyKtH * decayFactor;
    const projectedStir = newStir + residualStir;

    const projectedDir = weight > 0
      ? ((Math.atan2(dirSumY, dirSumX) * 180) / Math.PI + 360) % 360
      : initialColour.dominantWindDirDeg;

    const perBayColour = {};
    const perBayStir = {};
    for (const bay of lake.bays) {
      let effectiveStir = 0;
      if (isWindStirringBay(bay, projectedDir)) {
        effectiveStir = projectedStir * bayDepthMultiplier(bay);
        if (bay.kind === 'inflow') effectiveStir *= 0.4;
        if (bay.kind === 'narrows') effectiveStir *= 0.7;
      } else {
        effectiveStir = Math.min(60, projectedStir * 0.1);
      }
      perBayStir[bay.name] = Math.round(effectiveStir);
      perBayColour[bay.name] = bucketStir(effectiveStir);
    }

    // Score the bays at this checkpoint
    const checkpointBays = recommendBays({
      lakeKey,
      perBayColour,
      perBayStir,
      currentWindDirDeg: projectedDir,
      feedingMode: initialFeeding.mode,
    });

    const lakeState = Object.values(perBayColour).reduce((worst, c) =>
      COLOUR_RANK[c] > COLOUR_RANK[worst] ? c : worst, 'clear');

    timeline.push({
      hoursFromNow: h,
      assumedWindKt: Math.round(windAt(h).speedKt),
      assumedWindDirDeg: Math.round(windAt(h).directionDeg),
      lakeState: COLOUR_LABEL[lakeState],
      perBayColour,
      topBays: checkpointBays.ranking.slice(0, 3).map(b => ({
        bay: b.bay, score: b.score, colour: b.colour,
      })),
      shelterMode: checkpointBays.shelterMode,
    });
  }

  // Switch point: first checkpoint where windward shores come back to ≤tinged
  const switchPoint = timeline.find(t => !t.shelterMode && t.lakeState !== 'soupy' && t.lakeState !== 'chocolate');
  const clearingAt = {
    tinged: timeline.find(t => COLOUR_RANK[Object.keys(COLOUR_LABEL).find(k => COLOUR_LABEL[k] === t.lakeState)] <= COLOUR_RANK.tinged)?.hoursFromNow ?? null,
    clear: timeline.find(t => t.lakeState === 'clear')?.hoursFromNow ?? null,
  };

  let narrative;
  if (initialColour.overallColourState === 'clear') {
    narrative = `Lake clear now; conditions hold through the next 72h unless wind builds.`;
  } else if (switchPoint) {
    narrative = `${initialColour.lake} currently ${COLOUR_LABEL[initialColour.overallColourState]}. ` +
                `Windward shores back in play from +${switchPoint.hoursFromNow}h — at that point fish ${switchPoint.topBays[0].bay}. ` +
                `Full clearing to clean water estimated +${clearingAt.clear ?? '72+'}h.`;
  } else {
    narrative = `${initialColour.lake} ${COLOUR_LABEL[initialColour.overallColourState]} and stays compromised through +72h. ` +
                `Until then, only ${timeline[0].topBays[0].bay} and similar shelter waters are fishable.`;
  }

  return { timeline, clearingAt, switchPoint, narrative };
}


// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
export {
  LAKES,
  STIR_THRESHOLDS,
  SUBSTRATE_FLIES,
  BAY_SUBSTRATE,
  computeLakeColourState,
  recommendBays,
  inferFeedingMode,
  combineFliesWithSubstrate,
  applyLoughAdjustments,
};

export default applyLoughAdjustments;
