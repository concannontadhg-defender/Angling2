// test-loughScoring.mjs - calibration against Saturday-Sunday Conn event
// Run with: node tests/test-loughScoring.mjs
import { applyLoughAdjustments, computeLakeColourState } from '../api/loughScoring.js';

function hr(t) { console.log('\n' + '='.repeat(75) + '\n' + t + '\n' + '='.repeat(75)); }

// ----------------------------------------------------------------------
// TEST 1: Saturday-Sunday Conn — sustained N wind gusting 60 kph
// Expected: South shore (Drummin Bay, South End shallows) goes CHOCOLATE
//           Shelter mode active. Best water = Pontoon channel / Victoria Bay
//           / Deel mouth (inflow).
// ----------------------------------------------------------------------
hr('TEST 1: Saturday-Sunday Conn (N wind 22-28 kt, gusts 32 kt, 36h sustained)');

const sundayWindHistory = [];
const now = Date.now();
for (let hAgo = 36; hAgo >= 0; hAgo--) {
  let speedKt;
  if (hAgo > 30) speedKt = 16 + Math.random() * 4;
  else if (hAgo > 24) speedKt = 22 + Math.random() * 4;
  else if (hAgo > 6)  speedKt = 24 + Math.random() * 6;
  else speedKt = 18 + Math.random() * 4;
  sundayWindHistory.push({
    timestamp: new Date(now - hAgo * 3600 * 1000).toISOString(),
    speedKt,
    directionDeg: 350 + Math.random() * 20,
  });
}

const sundayResult = applyLoughAdjustments(8.0, {
  lakeKey: 'conn',
  windHistory: sundayWindHistory,
  rainHistoryMm: 2,
  surfaceTempC: 11.5,
  surfaceTempHistoryC: [10.5, 10.8, 11.2, 11.6, 11.9, 12.0, 11.5],
  currentWindDirDeg: 5,
  currentWindKt: 20,
});

console.log('Base score:', sundayResult.baseScore);
console.log('Adjusted score:', sundayResult.adjustedScore, '(multiplier:', sundayResult.multiplier + ')');
console.log('\nCurrent colour state:', sundayResult.now.colour.overallColourState);
console.log('Stir energy:', sundayResult.now.colour.stirEnergyKtH, 'kt-h');
console.log('Hours to fishable:', sundayResult.now.colour.hoursToClear.tinged + 'h');
console.log('Hours to clear:', sundayResult.now.colour.hoursToClear.clear + 'h');
console.log('\nPer-bay colour:');
for (const [bay, c] of Object.entries(sundayResult.now.colour.perBayColour)) {
  console.log(`  ${bay.padEnd(22)} ${c.padEnd(15)} (stir ${sundayResult.now.colour.perBayStir[bay]} kt-h)`);
}
console.log('\nShelter mode active:', sundayResult.now.bays.shelterMode);
console.log('Top 4 bays:');
sundayResult.now.bays.ranking.slice(0, 4).forEach((b, i) => {
  console.log(`  ${i+1}. ${b.bay.padEnd(22)} ${b.score}/100 (${b.colour}) — ${b.reason}`);
});

console.log('\nForecast:');
console.log('  ' + sundayResult.forecast.narrative);
sundayResult.forecast.timeline.forEach(t => {
  console.log(`  +${String(t.hoursFromNow).padStart(2)}h: ${t.lakeState.padEnd(15)} wind ${t.assumedWindKt}kt@${t.assumedWindDirDeg}° → ${t.topBays[0].bay} (${t.topBays[0].score})`);
});

// ----------------------------------------------------------------------
// TEST 2: 7-8 May trip — moderate W wind, mayfly building
// ----------------------------------------------------------------------
hr('TEST 2: 7-8 May Conn — moderate W wind, mayfly building');

const mayWindHistory = [];
for (let hAgo = 36; hAgo >= 0; hAgo--) {
  mayWindHistory.push({
    timestamp: new Date(now - hAgo * 3600 * 1000).toISOString(),
    speedKt: 12 + Math.random() * 6,
    directionDeg: 250 + Math.random() * 30,
  });
}

const mayResult = applyLoughAdjustments(7.0, {
  lakeKey: 'conn',
  windHistory: mayWindHistory,
  rainHistoryMm: 1,
  surfaceTempC: 12.4,
  surfaceTempHistoryC: [10.5, 11.2, 11.8, 12.0, 12.1, 12.3, 12.4],
  currentWindDirDeg: 260,
  currentWindKt: 14,
});

console.log('Adjusted score:', mayResult.adjustedScore, '(was', mayResult.baseScore + ')');
console.log('Colour state:', mayResult.now.colour.overallColourState);
console.log('Feeding mode:', mayResult.now.feeding.label);
console.log('Recommended flies:', mayResult.now.feeding.recommendedFlies.join(', '));
console.log('Top 3 bays:');
mayResult.now.bays.ranking.slice(0, 3).forEach((b, i) => {
  console.log(`  ${i+1}. ${b.bay.padEnd(22)} ${b.score}/100 (${b.colour}) — ${b.reason}`);
});

// ----------------------------------------------------------------------
// TEST 3: Cold pre-mayfly spell — May, surface 9°C, light wind
// ----------------------------------------------------------------------
hr('TEST 3: Cold pre-mayfly spell — 9°C surface, mayfly NOT triggered');

const coldResult = applyLoughAdjustments(7.0, {
  lakeKey: 'conn',
  windHistory: [{ timestamp: new Date().toISOString(), speedKt: 8, directionDeg: 200 }],
  rainHistoryMm: 0,
  surfaceTempC: 9.0,
  surfaceTempHistoryC: [8.0, 8.5, 9.0, 9.2, 8.8, 9.0, 9.0],
  currentWindDirDeg: 200,
  currentWindKt: 8,
  assumedMayfly: true,
});

console.log('Adjusted score:', coldResult.adjustedScore, '(was', coldResult.baseScore + ')');
console.log('Feeding mode:', coldResult.now.feeding.mode);
console.log('Label:', coldResult.now.feeding.label);
console.log('Mayfly readiness:', Math.round(coldResult.now.feeding.mayflyReadiness * 100) + '%');

// ----------------------------------------------------------------------
// TEST 4: Forecast — chocolate state with wind dropping
// ----------------------------------------------------------------------
hr('TEST 4: Chocolate state with Met Éireann forecast showing wind drop');

const chocolateResult = applyLoughAdjustments(8.0, {
  lakeKey: 'conn',
  windHistory: sundayWindHistory,
  rainHistoryMm: 0,
  surfaceTempC: 12.0,
  surfaceTempHistoryC: [10.5, 11.0, 11.5, 11.8, 12.0, 12.0, 12.0],
  currentWindDirDeg: 5,
  currentWindKt: 18,
  windForecast: [
    { hoursFromNow: 1,  speedKt: 16, directionDeg: 10 },
    { hoursFromNow: 6,  speedKt: 10, directionDeg: 30 },
    { hoursFromNow: 12, speedKt: 6,  directionDeg: 90 },
    { hoursFromNow: 24, speedKt: 5,  directionDeg: 200 },
    { hoursFromNow: 48, speedKt: 8,  directionDeg: 220 },
    { hoursFromNow: 72, speedKt: 10, directionDeg: 240 },
  ],
  rainForecastMm: 0,
});

console.log('Now: ' + chocolateResult.now.colour.overallColourState);
console.log(chocolateResult.forecast.narrative);
console.log('\nTimeline:');
chocolateResult.forecast.timeline.forEach(t => {
  console.log(`  +${String(t.hoursFromNow).padStart(2)}h: ${t.lakeState.padEnd(15)} wind ${t.assumedWindKt}kt@${t.assumedWindDirDeg}° → ${t.topBays.map(b => `${b.bay}(${b.score})`).join(' | ')}`);
});

// ----------------------------------------------------------------------
// TEST 5: Sheelin in same N wind — should colour faster (shallower lake)
// ----------------------------------------------------------------------
hr('TEST 5: Sheelin in same N wind — shallower lake, more sensitive');

const sheelinResult = applyLoughAdjustments(7.5, {
  lakeKey: 'sheelin',
  windHistory: sundayWindHistory,
  rainHistoryMm: 2,
  surfaceTempC: 11.5,
  surfaceTempHistoryC: [10.5, 11.0, 11.5, 11.8, 12.0, 11.9, 11.5],
  currentWindDirDeg: 5,
  currentWindKt: 20,
});

console.log('Adjusted score:', sheelinResult.adjustedScore);
console.log('Overall colour:', sheelinResult.now.colour.overallColourState);
console.log('Per-bay:');
for (const [bay, c] of Object.entries(sheelinResult.now.colour.perBayColour)) {
  console.log(`  ${bay.padEnd(22)} ${c.padEnd(15)} (stir ${sheelinResult.now.colour.perBayStir[bay]})`);
}

console.log('\n✓ All calibration tests complete');
