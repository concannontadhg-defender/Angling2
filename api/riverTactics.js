// riverTactics.js  —  water-temperature-driven fly depth & setup advisory
// =============================================================================
// Companion to loughScoring.js for the rivers page. Three functions:
//
//   1. estimateWaterTemp  — derive water temperature from 7-day rolling air
//                           temperature, plus seasonal offset and river-type
//                           lag factor. Override-able with a user thermometer
//                           reading.
//
//   2. inferRiverFeedingMode — water temperature → fly depth, retrieve,
//                              setup recommendation
//
//   3. recommendRiverTactics — wrapper that ties them together and produces
//                              the AI-context block for the verdict prompt.
//
// Calibrated against Tadhg's Bandon session 13 May 2026: 3 brown trout + 1 sea
// trout on a Teal Blue & Silver point fly, slow countdown 3–5 sec. Water in
// the 10–12°C band. The model correctly grades this as "cool — lower third,
// count-down work, weighted point on a floater".
// =============================================================================


// ---------------------------------------------------------------------------
// 1. estimateWaterTemp
// ---------------------------------------------------------------------------
// Irish spate rivers lag air temperature by ~1-3 days and run consistently
// cooler than air in spring/summer (catchment shading, peaty input, etc.)
//
// Empirical relationship calibrated for Cork/Munster rivers:
//   spring (Mar-May):   waterTemp ≈ 0.75 × rollingMean7dAir + 2.5
//   summer (Jun-Aug):   waterTemp ≈ 0.85 × rollingMean7dAir + 1.5
//   autumn (Sep-Nov):   waterTemp ≈ 0.80 × rollingMean7dAir + 1.0
//   winter (Dec-Feb):   waterTemp ≈ 0.70 × rollingMean7dAir + 2.0
//
// Within 1-2°C of streamside thermometer reality. Confidence widens when
// recent rain has dropped water temp below the air-temp prediction (cold
// spate runoff).
//
// Inputs:
//   airTempHistory7DayC — array of daily mean air temps, length ≥7
//   month               — 1-12 (or null to derive from dayOfYear)
//   dayOfYear           — alt to month
//   rainfall24hMm       — recent rain pulls water temp toward catchment temp
//   userThermometerC    — optional override — if set within last 24h, returns this
//   userThermometerAgeHours — how long ago the override was taken
//
// Output:
//   { tempC, source: 'derived'|'override', confidence: 'high'|'medium'|'low' }
function estimateWaterTemp({
  airTempHistory7DayC = [],
  month = null,
  dayOfYear = null,
  rainfall24hMm = 0,
  userThermometerC = null,
  userThermometerAgeHours = 0,
}) {
  // User override wins if recent
  if (userThermometerC != null && userThermometerAgeHours < 24) {
    return { tempC: userThermometerC, source: 'override', confidence: 'high', note: 'Streamside thermometer reading' };
  }

  if (airTempHistory7DayC.length < 3) {
    return { tempC: null, source: 'unavailable', confidence: 'low', note: 'Insufficient air temp history' };
  }

  const meanAir = airTempHistory7DayC.reduce((s, t) => s + t, 0) / airTempHistory7DayC.length;

  // Resolve month
  let m = month;
  if (m == null && dayOfYear != null) {
    const d = new Date(2026, 0, 1);
    d.setDate(dayOfYear);
    m = d.getMonth() + 1;
  }
  if (m == null) m = new Date().getMonth() + 1;

  let slope, offset, season;
  if (m >= 3 && m <= 5) { slope = 0.75; offset = 2.5; season = 'spring'; }
  else if (m >= 6 && m <= 8) { slope = 0.85; offset = 1.5; season = 'summer'; }
  else if (m >= 9 && m <= 11) { slope = 0.80; offset = 1.0; season = 'autumn'; }
  else { slope = 0.70; offset = 2.0; season = 'winter'; }

  let derived = slope * meanAir + offset;

  // Heavy recent rain cools the river toward catchment temp (~5-8°C runoff)
  if (rainfall24hMm > 20) {
    derived = derived * 0.7 + 6.5 * 0.3;
  } else if (rainfall24hMm > 10) {
    derived = derived * 0.85 + 7.0 * 0.15;
  }

  const confidence = rainfall24hMm > 20 ? 'low' : (rainfall24hMm > 5 ? 'medium' : 'high');

  return {
    tempC: Math.round(derived * 10) / 10,
    source: 'derived',
    confidence,
    season,
    note: `Estimated from 7-day mean air ${meanAir.toFixed(1)}°C (${season})${rainfall24hMm > 10 ? ', cooled by recent rain' : ''}`,
  };
}


// ---------------------------------------------------------------------------
// 2. inferRiverFeedingMode
// ---------------------------------------------------------------------------
// Six bands from cold-bottom to surface-only-dawn-dusk. Each returns:
//   - depth (top/mid/bottom/film)
//   - countdown seconds (for sink tip / weighted fly setups)
//   - retrieve speed
//   - setup recommendation (line, leader, fly weight)
//   - fly recommendations (general categories, river-page can mix in patterns)
//
// Inputs:
//   tempC          — water temperature in °C
//   season         — 'spring' | 'summer' | 'autumn' | 'winter'
//   targetSpecies  — 'brown' | 'salmon' | 'seatrout' (optional, refines flies)
function inferRiverFeedingMode({ tempC, season = 'spring', targetSpecies = 'brown' }) {
  if (tempC == null) {
    return {
      mode: 'unknown',
      label: 'Water temperature not available — default to standard setup',
      depth: 'mid',
      countdownSeconds: 2,
      retrieve: 'standard across-and-down swing',
      setup: 'Floating line, 9-12 ft tapered leader to 4X-5X copolymer, team of three wets',
      recommendedFlies: ['Greenwell\'s Spider', 'Partridge & Orange', 'Hare\'s Ear wet'],
    };
  }

  let mode, label, depth, countdownSeconds, retrieve, setup, recommendedFlies;

  if (tempC < 8) {
    mode = 'cold-bottom';
    label = `Cold (${tempC.toFixed(1)}°C) — fish on the bottom, low metabolism, must come to them`;
    depth = 'bottom';
    countdownSeconds = 6;
    retrieve = 'Worm-strip slow — 6-8 second pauses between 2-inch pulls';
    setup = 'Floating line + 10 ft slow-sink poly tip OR full intermediate. ' +
            '9 ft leader to 3X-4X copolymer (4X if water clear). Heavy weighted point fly (bead head). ' +
            'Fish the deepest pools and slowest glides.';
    recommendedFlies = targetSpecies === 'seatrout'
      ? ['Black & Silver (weighted point)', 'Teal Blue & Silver (heavy)', 'Cone-head Cascade']
      : ['Gold-head Hare\'s Ear', 'Heavy Pheasant Tail nymph', 'Bead-head Black Spider'];
  } else if (tempC < 13) {
    mode = 'cool';
    label = `Cool (${tempC.toFixed(1)}°C) — fish in the lower third, count-down work pays`;
    depth = 'lower third';
    countdownSeconds = 4;
    retrieve = 'Slow figure-of-eight, count fly down 3-5 sec before starting retrieve';
    setup = 'Floating line + 5 ft slow-sink poly tip on faster water, or floater alone on slower glides. ' +
            '12 ft tapered leader to 4X copolymer (NOT fluoro — fluoro pulls too fast on the swing). ' +
            'Weighted point fly. Across-and-down, deliberate swing, no movement on the dangle.';
    recommendedFlies = targetSpecies === 'seatrout'
      ? ['Teal Blue & Silver (point, weighted)', 'Bibio (top dropper)', 'Connemara Black (middle)']
      : ['Sooty Olive (point, weighted)', 'Connemara Black', 'Greenwell\'s Glory wet'];
  } else if (tempC < 16) {
    mode = 'optimal-subsurface';
    label = `Optimal (${tempC.toFixed(1)}°C) — fish through the column, classic wet-fly conditions`;
    depth = 'mid-column';
    countdownSeconds = 2;
    retrieve = 'Natural drift on swing, occasional lift, hang at the end of swing';
    setup = 'Full floating line, no tip needed. 12-14 ft tapered leader to 4X-5X copolymer. ' +
            'Standard team of three wets. Cover water across-and-down with reach mends.';
    recommendedFlies = targetSpecies === 'seatrout'
      ? ['Bibio (top)', 'Teal Blue & Silver (middle)', 'Connemara Black (point)']
      : ['Partridge & Orange (top)', 'Greenwell\'s Glory (middle)', 'Hare\'s Ear (point)'];
  } else if (tempC < 19) {
    mode = 'full-column';
    label = `Active (${tempC.toFixed(1)}°C) — fish throughout column, surface activity expected`;
    depth = 'full column / surface';
    countdownSeconds = 0;
    retrieve = 'Mix dry-fly dead-drift with wet-fly swing. Cover risers with dries, fish wets to non-rising fish';
    setup = 'Floating line. For dries: 12-15 ft leader to 5X-6X copolymer, degrease last 18 inches. ' +
            'For wets: 9-12 ft leader to 4X. Two rods or change setups based on rise activity.';
    recommendedFlies = targetSpecies === 'seatrout'
      ? ['Teal Blue & Silver', 'Black Pennell', 'Wickham\'s Fancy', 'CDC Sedge (dry, evening)']
      : ['CDC Olive Emerger', 'Klinkhammer Olive', 'F-Fly', 'Elk Hair Caddis', 'Partridge & Orange (sub-surface backup)'];
  } else if (tempC < 21) {
    mode = 'surface-evening';
    label = `Warm (${tempC.toFixed(1)}°C) — surface activity peaks evening, fish stressed midday`;
    depth = 'surface';
    countdownSeconds = 0;
    retrieve = 'Dead-drift dries on the rise. Fast oxygenated runs and riffles only midday';
    setup = 'Floating line, 15 ft leader to 6X. Long delicate leaders for spooky fish. ' +
            'Fish dawn and last 2 hours of daylight. Avoid sun-baked slow water.';
    recommendedFlies = ['CDC F-Fly', 'Olive Klinkhammer', 'Elk Hair Caddis', 'Iron Blue Dun', 'Spent Caenis'];
  } else {
    mode = 'stressed';
    label = `Hot (${tempC.toFixed(1)}°C) — fish under thermal stress, dawn/dusk only, cold seeps`;
    depth = 'surface';
    countdownSeconds = 0;
    retrieve = 'Brief windows only — first hour of light, last hour of light. Avoid handling fish.';
    setup = 'Same as warm but very brief windows. Find cold-water inflows, deep shaded pools. ' +
            'Consider conservation — at this temp catch-and-release survival drops sharply.';
    recommendedFlies = ['Sedge (evening)', 'Spent Caenis', 'Hopper / Daddy', 'Tiny dries 16-18'];
  }

  return {
    mode,
    label,
    depth,
    countdownSeconds,
    retrieve,
    setup,
    recommendedFlies,
    waterTempC: tempC,
  };
}


// ---------------------------------------------------------------------------
// 3. recommendRiverTactics  —  wrapper
// ---------------------------------------------------------------------------
// Combines the temperature estimate with the feeding mode and produces:
//   - A short headline for the river card UI
//   - A multi-line block for the AI verdict prompt
//
// Inputs:
//   riverKey            — internal river identifier (for AI context)
//   airTempHistory7DayC — pulled from Open-Meteo for the river's coordinates
//   rainfall24hMm       — pulled from same source
//   userThermometerC    — optional override
//   userThermometerAgeHours
//   month / dayOfYear
//   targetSpecies       — 'brown' | 'salmon' | 'seatrout'
function recommendRiverTactics({
  riverKey,
  riverName,
  airTempHistory7DayC,
  rainfall24hMm = 0,
  userThermometerC = null,
  userThermometerAgeHours = 0,
  month = null,
  dayOfYear = null,
  targetSpecies = 'brown',
}) {
  const temp = estimateWaterTemp({
    airTempHistory7DayC,
    rainfall24hMm,
    userThermometerC,
    userThermometerAgeHours,
    month,
    dayOfYear,
  });

  const feeding = inferRiverFeedingMode({
    tempC: temp.tempC,
    season: temp.season,
    targetSpecies,
  });

  const headline = temp.tempC != null
    ? `${feeding.mode === 'cold-bottom' ? '❄️' : feeding.mode === 'stressed' ? '🥵' : '🌡️'} ${temp.tempC.toFixed(1)}°C — ${feeding.depth} · ${feeding.countdownSeconds > 0 ? `count ${feeding.countdownSeconds}s` : 'natural drift'}`
    : '🌡️ Water temp unknown — standard setup';

  const aiContext = [
    `RIVER TACTICS — ${riverName || riverKey}`,
    `Water temp: ${temp.tempC != null ? `${temp.tempC.toFixed(1)}°C (${temp.source}, ${temp.confidence} confidence)` : 'unknown'}`,
    temp.note ? `Source: ${temp.note}` : '',
    `Feeding mode: ${feeding.label}`,
    `Fly depth: ${feeding.depth}${feeding.countdownSeconds > 0 ? ` · Countdown ${feeding.countdownSeconds}s` : ''}`,
    `Retrieve: ${feeding.retrieve}`,
    `Setup: ${feeding.setup}`,
    `Flies: ${feeding.recommendedFlies.join(', ')}`,
  ].filter(Boolean).join('\n');

  return {
    temp,
    feeding,
    headline,
    aiContext,
  };
}


// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
export {
  estimateWaterTemp,
  inferRiverFeedingMode,
  recommendRiverTactics,
};

export default recommendRiverTactics;
